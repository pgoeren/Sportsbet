"use client"
import { useState, useEffect } from "react"
import { TrendingUp, Zap, Target, RefreshCw } from "lucide-react"
import { GameCard } from "@/components/GameCard"
import { BetModal } from "@/components/BetModal"

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
  analystPicks: Array<{
    analyst: string
    pick: string
    confidence: "low" | "medium" | "high"
  }>
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
      <div className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">BetEdge</h1>
            <p className="text-xs text-gray-500">Smart betting recommendations</p>
          </div>
          <button
            onClick={fetchGames}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{topPicks.length}</p>
            <p className="text-xs text-gray-400">Top Picks</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <Target className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{games.length}</p>
            <p className="text-xs text-gray-400">Games Today</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
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
            <p className="text-xs text-gray-400">Avg Edge</p>
          </div>
        </div>

        {/* Sport filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {sports.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                filter === s
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 text-gray-400 hover:bg-white/20"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Games list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
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
