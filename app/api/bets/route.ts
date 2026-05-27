import { NextResponse } from "next/server"

// Bets are stored in browser localStorage — these routes are kept as stubs
// in case a server-side store is added later.
export async function GET() {
  return NextResponse.json({ bets: [] })
}

export async function POST() {
  return NextResponse.json({ ok: true })
}
