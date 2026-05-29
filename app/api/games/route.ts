import { NextResponse } from "next/server"
import { fetchUpcomingGames } from "@/lib/odds-api"
import { fetchInjuries } from "@/lib/tank01"
import { calculateEdge, getMockStats } from "@/lib/edge-model"
import { savePick, setupDb } from "@/lib/db"
import { format } from "date-fns"

// Market consensus is estimated from implied probabilities across bookmakers.
// It is NOT based on individual analyst picks — it reflects where the market
// (FanDuel, DraftKings, BetMGM, Caesars) is pricing each side.
function getMarketConsensus(homeTeam: string, awayTeam: string, odds: any[]) {
  const books = ["FanDuel", "DraftKings", "BetMGM", "Caesars", "PointsBet"]
  const picks: { source: string; pick: string; impliedProb: number }[] = []

  for (const book of books) {
    const homeOdd = odds.find(o => o.sportsbook === book && o.market_name === "moneyline" && o.team_name === homeTeam)
    const awayOdd = odds.find(o => o.sportsbook === book && o.market_name === "moneyline" && o.team_name === awayTeam)
    if (!homeOdd || !awayOdd) continue

    const homeProb = homeOdd.price < 0
      ? Math.abs(homeOdd.price) / (Math.abs(homeOdd.price) + 100)
      : 100 / (homeOdd.price + 100)
    const awayProb = awayOdd.price < 0
      ? Math.abs(awayOdd.price) / (Math.abs(awayOdd.price) + 100)
      : 100 / (awayOdd.price + 100)

    picks.push({
      source: book,
      pick: homeProb > awayProb ? homeTeam : awayTeam,
      impliedProb: Math.max(homeProb, awayProb),
    })
  }

  return picks
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get("sport") ?? undefined

  try {
    const hasDb = !!process.env.DATABASE_URL
    if (hasDb) await setupDb().catch(() => {})

    const games = await fetchUpcomingGames(sport)
    const today = format(new Date(), "yyyy-MM-dd")

    const enriched = await Promise.all(
      games.map(async (game, i) => {
        const homeSeed = game.home_team.charCodeAt(0) + i * 13
        const awaySeed = game.away_team.charCodeAt(0) + i * 17

        const homeStats      = getMockStats(game.home_team, homeSeed)
        const awayStats      = getMockStats(game.away_team, awaySeed)
        const injuries       = await fetchInjuries(game.sport, game.home_team, game.away_team)
        const marketConsensus = getMarketConsensus(game.home_team, game.away_team, game.odds)

        const homeOdds = game.odds.find(
          o => o.market_name === "moneyline" && o.team_name === game.home_team && o.sportsbook === "FanDuel"
        )?.price ?? game.odds.find(
          o => o.market_name === "moneyline" && o.team_name === game.home_team
        )?.price ?? -110

        const awayOdds = game.odds.find(
          o => o.market_name === "moneyline" && o.team_name === game.away_team && o.sportsbook === "FanDuel"
        )?.price ?? game.odds.find(
          o => o.market_name === "moneyline" && o.team_name === game.away_team
        )?.price ?? -110

        // Convert market consensus to the format the edge model expects
        const analystPicks = marketConsensus.map(m => ({
          analyst: m.source,
          pick: m.pick,
          confidence: m.impliedProb > 0.65 ? "high" : m.impliedProb > 0.55 ? "medium" : "low" as any,
        }))

        const homeEdge = calculateEdge({
          homeTeam: game.home_team, awayTeam: game.away_team,
          homeStats, awayStats, injuries, analystPicks,
          isHome: true,
          currentOdds: homeOdds,
          openingOdds: homeOdds + (i % 2 === 0 ? 10 : -10),
          sport: game.sport,
          allOdds: game.odds,
        })

        const awayEdge = calculateEdge({
          homeTeam: game.home_team, awayTeam: game.away_team,
          homeStats, awayStats, injuries, analystPicks,
          isHome: false,
          currentOdds: awayOdds,
          openingOdds: awayOdds + (i % 2 === 0 ? -10 : 10),
          sport: game.sport,
          allOdds: game.odds,
        })

        const topPick = homeEdge.overallEdge >= awayEdge.overallEdge
          ? { team: game.home_team, ...homeEdge }
          : { team: game.away_team, ...awayEdge }

        // Persist picks to DB for performance tracking (non-fatal if DB unavailable)
        if (hasDb && topPick.recommendation !== "pass") {
          const pickOdds = topPick.team === game.home_team ? homeOdds : awayOdds
          await savePick({
            id: `${today}-${game.id}`,
            date: today,
            gameId: game.id,
            sport: game.sport,
            league: game.league,
            homeTeam: game.home_team,
            awayTeam: game.away_team,
            pickTeam: topPick.team,
            recommendation: topPick.recommendation,
            edgeScore: topPick.overallEdge,
            confidence: topPick.confidence,
            odds: pickOdds,
            gameTime: game.start_date,
          }).catch(() => {})
        }

        return {
          ...game,
          homeEdge,
          awayEdge,
          topPick,
          injuries,
          marketConsensus,
          sources: {
            odds: "The Odds API",
            injuries: process.env.TANK01_API_KEY ? "Tank01 via RapidAPI" : "Estimated",
            consensus: marketConsensus.length > 0
              ? `Implied probability across ${marketConsensus.map(m => m.source).join(", ")}`
              : "Insufficient odds data",
            stats: "Model estimates (historical data integration coming soon)",
          },
        }
      })
    )

    const firstGame = enriched[0]
    const isMockOdds = enriched.every(g => g.id.startsWith("mock-"))
    const isMockInjuries = firstGame?.injuries?.every((inj: { player: string }) =>
      ["Key Starter", "Star Player", "Backup Guard"].includes(inj.player)
    ) ?? true

    return NextResponse.json({
      games: enriched,
      _debug: {
        oddsApi: isMockOdds ? "mock" : "live",
        tank01: !process.env.TANK01_API_KEY ? "no key" : isMockInjuries ? "mock (fallback)" : "live",
        gamesCount: enriched.length,
      },
    })
  } catch (error) {
    console.error("Games API error:", error)
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 })
  }
}
