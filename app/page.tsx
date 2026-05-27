"use client"
import { useState, useEffect } from "react"
import { TrendingUp, Zap, Target, RefreshCw } from "lucide-react"
import { GameCard } from "@/components/GameCard"
import { BetModal } from "@/components/BetModal"
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

interface BetPayload {
  sport: string
  league: string
  homeTeam: string
  awayTeam: string
  betType: string
  team: string
  odds: number
  stake: number
  potentialWin: number
  notes: string
  gameId: string
}

export default function HomePage() {
  const [games, setGames] = useState<GameData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState<GameData | null>(null)
  const [selectedTeam, setSelectedTeam] = useState("")
  const [selectedOdds, setSelectedOdds] = useState(0)
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

  const handleBet = (game: GameData, team: string, odds: number) => {
    setSelectedGame(game)
    setSelectedTeam(team)
    setSelectedOdds(odds)
  }

  const handleSubmitBet = (bet: BetPayload) => {
    const { saveBet } = require("@/lib/bets-store")
    saveBet(bet)
  }

  const sports = ["all", ...Array.from(new Set(games.map((g) => g.sport)))]
  const filtered = filter === "all" ? games : games.filter((g) => g.sport === filter)
  const topPicks = games.filter(
    (g) =>
      g.topPick?.recommendation === "strong_bet" ||
      g.topPick?.recommendation === "bet"
  )

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur px-4 py-4"
        style={{
          backgroundColor: "rgba(15,25,35,0.96)",
          borderBottom: "1px solid #1e2d40",
        }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-1.5">
              BetEdge
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#29d87f" }} />
            </h1>
            <p className="text-xs" style={{ color: "#4d6080" }}>Smart betting recommendations</p>
          </div>
          <button
            onClick={fetchGames}
            className="p-2 rounded-full transition-colors"
            style={{ backgroundColor: "#243044" }}
          >
            <RefreshCw className="w-4 h-4" style={{ color: "#8c9bb5" }} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Yesterday's performance */}
        <PerformanceWidget />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 text-center"
            style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
            <Zap className="w-4 h-4 mx-auto mb-1" style={{ color: "#f5c842" }} />
            <p className="text-lg font-bold text-white">{topPicks.length}</p>
            <p className="text-xs" style={{ color: "#8c9bb5" }}>Top Picks</p>
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
                ? Math.round(
                    games.reduce(
                      (a, g) => a + (g.topPick?.overallEdge ?? 0),
                      0
                    ) / games.length
                  )
                : 0}
            </p>
            <p className="text-xs" style={{ color: "#8c9bb5" }}>Avg Edge</p>
          </div>
        </div>

        {/* Sport filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {sports.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors"
              style={{
                backgroundColor: filter === s ? "#29d87f" : "#243044",
                color: filter === s ? "#0f1923" : "#8c9bb5",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Games list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl animate-pulse"
                style={{ backgroundColor: "#1a2535" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12" style={{ color: "#4d6080" }}>
            <p>No games found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((game) => (
              <GameCard key={game.id} game={game} onBet={handleBet} />
            ))}
          </div>
        )}
      </div>

      {selectedGame && (
        <BetModal
          game={selectedGame}
          team={selectedTeam}
          odds={selectedOdds}
          onClose={() => setSelectedGame(null)}
          onSubmit={handleSubmitBet}
        />
      )}
    </div>
  )
}
