import { NextResponse } from "next/server"
import { getDb, getPicksForDate, updatePickResult, setupDb } from "@/lib/db"
import { fetchYesterdayResults } from "@/lib/scores"
import { format, subDays } from "date-fns"

export async function GET() {
  try {
    await setupDb()

    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd")
    const today = format(new Date(), "yyyy-MM-dd")

    // Settle yesterday's picks against real results
    const [results, yesterdayPicks] = await Promise.all([
      fetchYesterdayResults(),
      getPicksForDate(yesterday),
    ])

    // Match picks to results and update DB
    for (const pick of yesterdayPicks as any[]) {
      if (pick.result) continue // already settled
      const result = results.find(
        r => r.homeTeam === pick.home_team && r.awayTeam === pick.away_team
      )
      if (!result) continue
      const outcome = result.winner === "push" ? "push"
        : result.winner === pick.pick_team ? "correct" : "incorrect"
      await updatePickResult(pick.game_id, outcome)
    }

    // Re-fetch settled picks
    const settled = await getPicksForDate(yesterday) as any[]
    const todayPicks = await getPicksForDate(today) as any[]

    const correct   = settled.filter(p => p.result === "correct").length
    const incorrect = settled.filter(p => p.result === "incorrect").length
    const pending   = settled.filter(p => !p.result).length
    const winRate   = (correct + incorrect) > 0
      ? Math.round((correct / (correct + incorrect)) * 100)
      : null

    // All-time stats
    const sql = getDb()
    const allTime = await sql`
      SELECT
        COUNT(*) FILTER (WHERE result = 'correct')   AS correct,
        COUNT(*) FILTER (WHERE result = 'incorrect') AS incorrect,
        COUNT(*) FILTER (WHERE result IS NULL)       AS pending,
        COUNT(*) FILTER (WHERE recommendation = 'strong_bet' AND result = 'correct') AS strong_correct,
        COUNT(*) FILTER (WHERE recommendation = 'strong_bet' AND result = 'incorrect') AS strong_incorrect
      FROM daily_picks
    `

    const at = allTime[0]
    const atTotal = Number(at.correct) + Number(at.incorrect)
    const atWinRate = atTotal > 0
      ? Math.round((Number(at.correct) / atTotal) * 100)
      : null
    const strongTotal = Number(at.strong_correct) + Number(at.strong_incorrect)
    const strongWinRate = strongTotal > 0
      ? Math.round((Number(at.strong_correct) / strongTotal) * 100)
      : null

    return NextResponse.json({
      yesterday: {
        date: yesterday,
        correct,
        incorrect,
        pending,
        winRate,
        picks: settled.map((p: any) => ({
          league: p.league,
          homeTeam: p.home_team,
          awayTeam: p.away_team,
          pickTeam: p.pick_team,
          recommendation: p.recommendation,
          edgeScore: p.edge_score,
          result: p.result,
        })),
      },
      today: {
        total: todayPicks.length,
        strongBets: todayPicks.filter((p: any) => p.recommendation === "strong_bet").length,
        picks: todayPicks.map((p: any) => ({
          league: p.league,
          homeTeam: p.home_team,
          awayTeam: p.away_team,
          pickTeam: p.pick_team,
          recommendation: p.recommendation,
          confidence: p.confidence,
          edgeScore: p.edge_score,
          gameTime: p.game_time,
        })),
      },
      allTime: {
        correct: Number(at.correct),
        incorrect: Number(at.incorrect),
        winRate: atWinRate,
        strongBetWinRate: strongWinRate,
      },
    })
  } catch (err) {
    console.error("Performance API error:", err)
    return NextResponse.json({ error: "Performance data unavailable" }, { status: 500 })
  }
}
