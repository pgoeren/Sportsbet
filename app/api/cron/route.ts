import { NextResponse } from "next/server"
import { getDb, getPicksForDate, updatePickResult, setupDb } from "@/lib/db"
import { fetchYesterdayResults } from "@/lib/scores"
import { fetchUpcomingGames } from "@/lib/odds-api"
import { fetchInjuries } from "@/lib/tank01"
import { calculateEdge, getMockStats } from "@/lib/edge-model"
import { savePick } from "@/lib/db"
import { format, subDays } from "date-fns"

// Vercel invokes this with a secret header to prevent public abuse.
// Set CRON_SECRET in your Vercel environment variables.
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // no secret configured = open (fine for hobby projects)
  return req.headers.get("authorization") === `Bearer ${secret}`
}

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
    picks.push({ source: book, pick: homeProb > awayProb ? homeTeam : awayTeam, impliedProb: Math.max(homeProb, awayProb) })
  }
  return picks
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "No DATABASE_URL configured" }, { status: 503 })
  }

  const today     = format(new Date(), "yyyy-MM-dd")
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd")

  await setupDb().catch(() => {})

  // ── Step 1: Settle yesterday's results ─────────────────────────────────────
  let settled = 0
  try {
    const [results, yesterdayPicks] = await Promise.all([
      fetchYesterdayResults(),
      getPicksForDate(yesterday),
    ])
    for (const pick of yesterdayPicks as any[]) {
      if (pick.result) continue
      const result = results.find(r => r.homeTeam === pick.home_team && r.awayTeam === pick.away_team)
      if (!result) continue
      const outcome = result.winner === "push" ? "push"
        : result.winner === pick.pick_team ? "correct" : "incorrect"
      await updatePickResult(pick.game_id, outcome)
      settled++
    }
  } catch (err) {
    console.error("Cron: result settlement failed", err)
  }

  // ── Step 2: Record today's picks ────────────────────────────────────────────
  let recorded = 0
  try {
    const games = await fetchUpcomingGames()
    await Promise.all(
      games.map(async (game, i) => {
        const homeSeed = game.home_team.charCodeAt(0) + i * 13
        const awaySeed = game.away_team.charCodeAt(0) + i * 17
        const homeStats       = getMockStats(game.home_team, homeSeed)
        const awayStats       = getMockStats(game.away_team, awaySeed)
        const injuries        = await fetchInjuries(game.sport, game.home_team, game.away_team)
        const marketConsensus = getMarketConsensus(game.home_team, game.away_team, game.odds)
        const analystPicks    = marketConsensus.map(m => ({
          analyst: m.source, pick: m.pick,
          confidence: m.impliedProb > 0.65 ? "high" : m.impliedProb > 0.55 ? "medium" : "low" as any,
        }))

        const homeOdds = game.odds.find(o => o.market_name === "moneyline" && o.team_name === game.home_team && o.sportsbook === "FanDuel")?.price
          ?? game.odds.find(o => o.market_name === "moneyline" && o.team_name === game.home_team)?.price ?? -110
        const awayOdds = game.odds.find(o => o.market_name === "moneyline" && o.team_name === game.away_team && o.sportsbook === "FanDuel")?.price
          ?? game.odds.find(o => o.market_name === "moneyline" && o.team_name === game.away_team)?.price ?? -110

        const homeEdge = calculateEdge({ homeTeam: game.home_team, awayTeam: game.away_team, homeStats, awayStats, injuries, analystPicks, isHome: true,  currentOdds: homeOdds, openingOdds: homeOdds + (i % 2 === 0 ? 10 : -10), sport: game.sport, allOdds: game.odds })
        const awayEdge = calculateEdge({ homeTeam: game.home_team, awayTeam: game.away_team, homeStats, awayStats, injuries, analystPicks, isHome: false, currentOdds: awayOdds, openingOdds: awayOdds + (i % 2 === 0 ? -10 : 10), sport: game.sport, allOdds: game.odds })
        const topPick  = homeEdge.overallEdge >= awayEdge.overallEdge
          ? { team: game.home_team, ...homeEdge }
          : { team: game.away_team, ...awayEdge }

        if (topPick.recommendation !== "pass") {
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
          })
          recorded++
        }
      })
    )
  } catch (err) {
    console.error("Cron: pick recording failed", err)
  }

  return NextResponse.json({
    ok: true,
    date: today,
    settledYesterday: settled,
    recordedToday: recorded,
  })
}
