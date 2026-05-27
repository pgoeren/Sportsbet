import { NextResponse } from "next/server"
import { fetchUpcomingGames } from "@/lib/oddsjam"
import { calculateEdge, getMockStats, getMockInjuries, getMockAnalystPicks } from "@/lib/edge-model"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get("sport") ?? undefined
  const league = searchParams.get("league") ?? undefined

  try {
    const games = await fetchUpcomingGames(sport, league)

    const enriched = games.map((game, i) => {
      const homeSeed = game.home_team.charCodeAt(0) + i * 13
      const awaySeed = game.away_team.charCodeAt(0) + i * 17

      const homeStats = getMockStats(game.home_team, homeSeed)
      const awayStats = getMockStats(game.away_team, awaySeed)
      const injuries = getMockInjuries(game.home_team, game.away_team)
      const analystPicks = getMockAnalystPicks(game.home_team, game.away_team)

      const homeMoneylineOdd = game.odds.find(
        o => o.market_name === "moneyline" && o.team_name === game.home_team && o.sportsbook === "FanDuel"
      ) ?? game.odds.find(o => o.market_name === "moneyline" && o.team_name === game.home_team)

      const awayMoneylineOdd = game.odds.find(
        o => o.market_name === "moneyline" && o.team_name === game.away_team && o.sportsbook === "FanDuel"
      ) ?? game.odds.find(o => o.market_name === "moneyline" && o.team_name === game.away_team)

      const homeOdds = homeMoneylineOdd?.price ?? -110
      const awayOdds = awayMoneylineOdd?.price ?? -110

      const homeEdge = calculateEdge({
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        homeStats,
        awayStats,
        injuries,
        analystPicks,
        isHome: true,
        currentOdds: homeOdds,
        openingOdds: homeOdds + (i % 2 === 0 ? 10 : -10),
        sport: game.sport,
      })

      const awayEdge = calculateEdge({
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        homeStats,
        awayStats,
        injuries,
        analystPicks,
        isHome: false,
        currentOdds: awayOdds,
        openingOdds: awayOdds + (i % 2 === 0 ? -10 : 10),
        sport: game.sport,
      })

      const topEdge = homeEdge.overallEdge >= awayEdge.overallEdge
        ? { team: game.home_team, ...homeEdge }
        : { team: game.away_team, ...awayEdge }

      return {
        ...game,
        homeEdge,
        awayEdge,
        topPick: topEdge,
        injuries,
        analystPicks,
      }
    })

    return NextResponse.json({ games: enriched })
  } catch (error) {
    console.error("Games API error:", error)
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 })
  }
}
