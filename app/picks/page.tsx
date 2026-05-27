"use client"
import { useState, useEffect } from "react"
import { TrendingUp, Star, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { BetModal } from "@/components/BetModal"
import { formatOdds } from "@/lib/utils"
import { format } from "date-fns"

interface OddsEntry {
  sportsbook: string
  market_name: string
  team_name: string
  price: number
  point?: number
}

interface TopPick {
  team: string
  overallEdge: number
  confidence: "low" | "medium" | "high" | "elite"
  recommendation: "pass" | "bet" | "strong_bet"
  reasoning: string[]
}

interface GameData {
  id: string
  sport: string
  league: string
  home_team: string
  away_team: string
  start_date: string
  odds: OddsEntry[]
  topPick: TopPick
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

export default function PicksPage() {
  const [games, setGames] = useState<GameData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState<GameData | null>(null)
  const [selectedTeam, setSelectedTeam] = useState("")
  const [selectedOdds, setSelectedOdds] = useState(0)

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((d) => setGames(d.games ?? []))
      .finally(() => setLoading(false))
  }, [])

  const strongBets = games.filter((g) => g.topPick?.recommendation === "strong_bet")
  const bets = games.filter((g) => g.topPick?.recommendation === "bet")
  const passes = games.filter((g) => g.topPick?.recommendation === "pass")

  const handleBet = (game: GameData, team: string, odds: number) => {
    setSelectedGame(game)
    setSelectedTeam(team)
    setSelectedOdds(odds)
  }

  const handleSubmitBet = async (bet: BetPayload) => {
    await fetch("/api/bets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bet),
    })
  }

  const PickSection = ({
    title,
    picks,
    icon: Icon,
    color,
  }: {
    title: string
    picks: GameData[]
    icon: React.ElementType
    color: string
  }) =>
    picks.length > 0 ? (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <h2 className="font-bold text-white text-sm uppercase tracking-wider">
            {title}
          </h2>
          <Badge variant="outline" className="text-xs">
            {picks.length}
          </Badge>
        </div>
        {picks.map((game) => {
          const pick = game.topPick
          const homeOdds =
            game.odds.find(
              (o) =>
                o.market_name === "moneyline" && o.team_name === game.home_team
            )?.price ?? -110
          const awayOdds =
            game.odds.find(
              (o) =>
                o.market_name === "moneyline" && o.team_name === game.away_team
            )?.price ?? -110
          const isHome = pick.team === game.home_team
          const odds = isHome ? homeOdds : awayOdds

          return (
            <div
              key={game.id}
              className="rounded-2xl bg-gray-900 border border-white/10 overflow-hidden"
            >
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {game.league} •{" "}
                    {format(new Date(game.start_date), "h:mm a")}
                  </span>
                  <Badge
                    variant={
                      pick.confidence as "elite" | "high" | "medium" | "low"
                    }
                  >
                    {pick.confidence.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-gray-400">
                  {game.away_team} @ {game.home_team}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-lg">{pick.team}</p>
                    <p
                      className={`font-bold text-xl ${
                        odds > 0 ? "text-green-400" : "text-white"
                      }`}
                    >
                      {formatOdds(odds)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-white">
                      {pick.overallEdge}
                    </p>
                    <p className="text-xs text-gray-400">EDGE SCORE</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {pick.reasoning?.slice(0, 2).map((r, i) => (
                    <p
                      key={i}
                      className="text-xs text-gray-400 flex items-start gap-1"
                    >
                      <span className="text-blue-400 mt-0.5">•</span> {r}
                    </p>
                  ))}
                </div>
                <button
                  onClick={() => handleBet(game, pick.team, odds)}
                  className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all text-sm"
                >
                  Track This Bet
                </button>
              </div>
            </div>
          )
        })}
      </div>
    ) : null

  return (
    <div>
      <div className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur border-b border-white/10 px-4 py-4">
        <h1 className="text-xl font-black text-white">Today&apos;s Picks</h1>
        <p className="text-xs text-gray-500">Ranked by edge score</p>
      </div>

      <div className="px-4 pt-4 space-y-6 pb-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            <PickSection
              title="Strong Bets"
              picks={strongBets}
              icon={Zap}
              color="text-yellow-400"
            />
            <PickSection
              title="Solid Bets"
              picks={bets}
              icon={Star}
              color="text-green-400"
            />
            <PickSection
              title="Pass"
              picks={passes}
              icon={TrendingUp}
              color="text-gray-400"
            />
          </>
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
