"use client"
import { useState, useEffect } from "react"
import { TrendingUp, Zap, Target, RefreshCw } from "lucide-react"
import { GameCard } from "@/components/GameCard"
import { PerformanceWidget } from "@/components/PerformanceWidget"

interface GameData {
  id: string
  sport: string
  league: string
  home_team: string
  away_team: string
  start_date: string
  odds: Array<{
    sportsbook: string
    market_name: string
    team_name: string
    price: number
    point?: number
  }>
  homeEdge: {
    historicalScore: number
    injuryScore: number
    analystScore: number
    homeAwayScore: number
    lineMovementScore: number
    expectedValue: number
    overallEdge: number
    confidence: "low" | "medium" | "high" | "elite"
    recommendation: "pass" | "bet" | "strong_bet"
    reasoning: string[]
  }
  awayEdge: {
    historicalScore: number
    injuryScore: number
    analystScore: number
    homeAwayScore: number
    lineMovementScore: number
    expectedValue: number
    overallEdge: number
    confidence: "low" | "medium" | "high" | "elite"
    recommendation: "pass" | "bet" | "strong_bet"
    reasoning: string[]
  }
  topPick: {
    team: string
    historicalScore: number
    injuryScore: number
    analystScore: number
    homeAwayScore: number
    lineMovementScore: number
    expectedValue: number
    overallEdge: number
    confidence: "low" | "medium" | "high" | "elite"
    recommendation: "pass" | "bet" | "strong_bet"
    reasoning: string[]
  }
  injuries: Array<{
    team: string
    player: string
    position: string
    status: "out" | "doubtful" | "questionable" | "probable"
    impact: number
  }>
  marketConsensus: Array<{
    source: string
    pick: string
    impliedProb: number
  }>
  sources: {
    odds: string
    injuries: string
    consensus: string
    stats: string
  }
}

export default function HomePage() {
  const [games, setGames] = useState<GameData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  const fetchGames = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/games")
      const data = await res.json()
      setGames(data.games ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGames()
  }, [])

  const sports = ["all", ...Array.from(new Set(games.map(g => g.sport)))]
  const filtered = filter === "all" ? games : games.filter(g => g.sport === filter)

  // High/elite confidence picks only — not just any "recommended" game
  const bestBets = filtered.filter(g =>
    g.topPick?.recommendation !== "pass" &&
    (g.topPick?.confidence === "high" || g.topPick?.confidence === "elite")
  ).sort((a, b) => {
    const rank = { elite: 0, high: 1, medium: 2, low: 3 }
    return (rank[a.topPick.confidence] ?? 3) - (rank[b.topPick.confidence] ?? 3)
  })

  // Remaining games grouped by league
  const bestBetIds = new Set(bestBets.map(g => g.id))
  const otherGames = filtered.filter(g => !bestBetIds.has(g.id))
  const byLeague = otherGames.reduce<Record<string, GameData[]>>((acc, g) => {
    if (!acc[g.league]) acc[g.league] = []
    acc[g.league].push(g)
    return acc
  }, {})

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur px-4 py-4"
        style={{ backgroundColor: "rgba(15,25,35,0.96)", borderBottom: "1px solid #1e2d40" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-1.5">
              BetEdge
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#29d87f" }} />
            </h1>
            <p className="text-xs" style={{ color: "#4d6080" }}>Tap any odds cell to track a bet</p>
          </div>
          <button onClick={fetchGames}
            className="p-2 rounded-full"
            style={{ backgroundColor: "#243044" }}>
            <RefreshCw className="w-4 h-4" style={{ color: "#8c9bb5" }} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6 pb-28">
        <PerformanceWidget />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 text-center"
            style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
            <Zap className="w-4 h-4 mx-auto mb-1" style={{ color: "#f5c842" }} />
            <p className="text-lg font-bold text-white">{bestBets.length}</p>
            <p className="text-xs" style={{ color: "#8c9bb5" }}>Best Bets</p>
          </div>
          <div className="rounded-xl p-3 text-center"
            style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
            <Target className="w-4 h-4 mx-auto mb-1" style={{ color: "#4ea8f8" }} />
            <p className="text-lg font-bold text-white">{games.length}</p>
            <p className="text-xs" style={{ color: "#8c9bb5" }}>Games Today</p>
          </div>
          <div className="rounded-xl p-3 text-center"
            style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
            <TrendingUp className="w-4 h-4 mx-auto mb-1" style={{ color: "#29d87f" }} />
            <p className="text-lg font-bold text-white">
              {games.length > 0
                ? Math.round(games.reduce((a, g) => a + (g.topPick?.overallEdge ?? 0), 0) / games.length)
                : 0}
            </p>
            <p className="text-xs" style={{ color: "#8c9bb5" }}>Avg Edge</p>
          </div>
        </div>

        {/* Sport filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {sports.map(s => (
            <button key={s}
              onClick={() => setFilter(s)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold capitalize"
              style={{
                backgroundColor: filter === s ? "#29d87f" : "#243044",
                color: filter === s ? "#0f1923" : "#8c9bb5",
              }}>
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-44 rounded-xl animate-pulse"
                style={{ backgroundColor: "#1a2535" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: "#4d6080" }}>
            <p className="font-medium" style={{ color: "#8c9bb5" }}>No games found</p>
          </div>
        ) : (
          <>
            {/* Best Bets — high & elite confidence only */}
            {bestBets.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: "#f5c842" }} />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Best Bets</h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#2a1f00", color: "#f5c842" }}>
                    {bestBets.length}
                  </span>
                  <div className="flex-1" style={{ height: "1px", backgroundColor: "#1e2d40" }} />
                </div>
                {bestBets.map(g => <GameCard key={g.id} game={g} />)}
              </div>
            )}

            {/* All other games grouped by league */}
            {Object.entries(byLeague).map(([league, leagueGames]) => (
              <div key={league} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: "#4d6080" }}>
                    {league}
                  </h3>
                  <div className="flex-1" style={{ height: "1px", backgroundColor: "#1e2d40" }} />
                  <span className="text-xs" style={{ color: "#4d6080" }}>{leagueGames.length}</span>
                </div>
                {leagueGames.map(g => <GameCard key={g.id} game={g} />)}
              </div>
            ))}

            {bestBets.length === 0 && otherGames.length === 0 && (
              <div className="text-center py-16" style={{ color: "#4d6080" }}>
                <p>No games found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
