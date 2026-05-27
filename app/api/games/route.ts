import { NextResponse } from "next/server"
import { fetchUpcomingGames } from "@/lib/odds-api"
import { fetchInjuries } from "@/lib/tank01"
import { calculateEdge, getMockStats, getMockAnalystPicks } from "@/lib/edge-model"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get("sport") ?? undefined

  try {
    const games = await fetchUpcomingGames(sport)

    const enriched = await Promise.all(
      games.map(async (game, i) => {
        const homeSeed = game.home_team.charCodeAt(0) + i * 13
        const awaySeed = game.away_team.charCodeAt(0) + i * 17

        const homeStats    = getMockStats(game.home_team, homeSeed)
        const awayStats    = getMockStats(game.away_team, awaySeed)
        const injuries     = await fetchInjuries(game.sport, game.home_team, game.away_team)
        const analystPicks = getMockAnalystPicks(game.home_team, game.away_team)

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

        const homeEdge = calculateEdge({
          homeTeam: game.home_team, awayTeam: game.away_team,
          homeStats, awayStats, injuries, analystPicks,
          isHome: true,
          currentOdds: homeOdds,
          openingOdds: homeOdds + (i % 2 === 0 ? 10 : -10),
          sport: game.sport,
        })

        const awayEdge = calculateEdge({
          homeTeam: game.home_team, awayTeam: game.away_team,
          homeStats, awayStats, injuries, analystPicks,
          isHome: false,
          currentOdds: awayOdds,
          openingOdds: awayOdds + (i % 2 === 0 ? -10 : 10),
          sport: game.sport,
        })

        const topPick = homeEdge.overallEdge >= awayEdge.overallEdge
          ? { team: game.home_team, ...homeEdge }
          : { team: game.away_team, ...awayEdge }

        return { ...game, homeEdge, awayEdge, topPick, injuries, analystPicks }
      })
    )

    return NextResponse.json({ games: enriched })
  } catch (error) {
    console.error("Games API error:", error)
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 })
  }
}
