import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const bets = await prisma.bet.findMany({
      orderBy: { placedAt: "desc" },
    })
    return NextResponse.json({ bets })
  } catch {
    return NextResponse.json({ bets: [] })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const bet = await prisma.bet.create({
      data: {
        sport: body.sport,
        league: body.league,
        homeTeam: body.homeTeam,
        awayTeam: body.awayTeam,
        betType: body.betType,
        team: body.team,
        odds: body.odds,
        stake: body.stake,
        potentialWin: body.potentialWin,
        notes: body.notes,
        gameId: body.gameId,
      },
    })
    return NextResponse.json({ bet })
  } catch (err) {
    console.error("Create bet error:", err)
    return NextResponse.json({ error: "Failed to create bet" }, { status: 500 })
  }
}
