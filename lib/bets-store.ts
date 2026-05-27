export interface Bet {
  id: string
  sport: string
  league: string
  homeTeam: string
  awayTeam: string
  betType: string
  team: string
  odds: number
  stake: number
  potentialWin: number
  status: "pending" | "won" | "lost" | "push"
  placedAt: string
  settledAt?: string
  notes?: string
  gameId?: string
}

const KEY = "betedge_bets"

export function getBets(): Bet[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]")
  } catch {
    return []
  }
}

export function saveBet(bet: Omit<Bet, "id" | "placedAt">): Bet {
  const bets = getBets()
  const newBet: Bet = {
    ...bet,
    id: crypto.randomUUID(),
    placedAt: new Date().toISOString(),
  }
  localStorage.setItem(KEY, JSON.stringify([newBet, ...bets]))
  return newBet
}

export function updateBet(id: string, status: Bet["status"]): void {
  const bets = getBets().map(b =>
    b.id === id
      ? { ...b, status, settledAt: new Date().toISOString() }
      : b
  )
  localStorage.setItem(KEY, JSON.stringify(bets))
}

export function deleteBet(id: string): void {
  const bets = getBets().filter(b => b.id !== id)
  localStorage.setItem(KEY, JSON.stringify(bets))
}
