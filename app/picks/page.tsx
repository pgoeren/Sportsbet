"use client"
import { useState, useEffect } from "react"
import { TrendingUp, Star, Zap } from "lucide-react"
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

  const handleSubmitBet = (bet: BetPayload) => {
    const { saveBet } = require("@/lib/bets-store")
    saveBet(bet)
  }

  const confidenceBadgeStyle = (confidence: string) => {
    if (confidence === "elite") return { backgroundColor: "#2a1f00", color: "#f5c842", border: "1px solid #f5c842" }
    if (confidence === "high") return { backgroundColor: "#0d2e1e", color: "#29d87f", border: "1px solid #29d87f" }
    if (confidence === "medium") return { backgroundColor: "#0d1e30", color: "#4ea8f8", border: "1px solid #4ea8f8" }
    return { backgroundColor: "#1e2d40", color: "#4d6080", border: "1px solid #263044" }
  }

  const PickSection = ({
    title,
    picks,
    icon: Icon,
    iconColor,
  }: {
    title: string
    picks: GameData[]
    icon: React.ElementType
    iconColor: string
  }) =>
    picks.length > 0 ? (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
          <h2 className="font-bold text-white text-sm uppercase tracking-wider">
            {title}
          </h2>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#243044", color: "#8c9bb5" }}>
            {picks.length}
          </span>
        </div>
        {picks.map((game) => {
          const pick = game.topPick
          const homeOdds =
            game.odds.find(
              (o) => o.market_name === "moneyline" && o.team_name === game.home_team
            )?.price ?? -110
          const awayOdds =
            game.odds.find(
              (o) => o.market_name === "moneyline" && o.team_name === game.away_team
            )?.price ?? -110
          const isHome = pick.team === game.home_team
          const odds = isHome ? homeOdds : awayOdds

          return (
            <div key={game.id} className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#8c9bb5" }}>
                    {game.league} • {format(new Date(game.start_date), "h:mm a")}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase"
                    style={confidenceBadgeStyle(pick.confidence)}>
                    {pick.confidence}
                  </span>
                </div>

                <p className="text-sm" style={{ color: "#8c9bb5" }}>
                  {game.away_team} @ {game.home_team}
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-lg">{pick.team}</p>
                    <p className="font-bold text-xl"
                      style={{ color: odds > 0 ? "#29d87f" : "#ffffff" }}>
                      {formatOdds(odds)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-white">{pick.overallEdge}</p>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#4d6080" }}>EDGE SCORE</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {pick.reasoning?.slice(0, 2).map((r, i) => (
                    <p key={i} className="text-xs flex items-start gap-1"
                      style={{ color: "#8c9bb5" }}>
                      <span className="mt-0.5" style={{ color: "#4ea8f8" }}>•</span> {r}
                    </p>
                  ))}
                </div>

                <button
                  onClick={() => handleBet(game, pick.team, odds)}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                  style={{ backgroundColor: "#29d87f", color: "#0f1923" }}
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
      <div className="sticky top-0 z-30 backdrop-blur px-4 py-4"
        style={{
          backgroundColor: "rgba(15,25,35,0.96)",
          borderBottom: "1px solid #1e2d40",
        }}>
        <h1 className="text-xl font-black text-white">Today&apos;s Picks</h1>
        <p className="text-xs" style={{ color: "#4d6080" }}>Ranked by edge score</p>
      </div>

      <div className="px-4 pt-4 space-y-6 pb-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl animate-pulse"
                style={{ backgroundColor: "#1a2535" }} />
            ))}
          </div>
        ) : (
          <>
            <PickSection
              title="Strong Bets"
              picks={strongBets}
              icon={Zap}
              iconColor="#f5c842"
            />
            <PickSection
              title="Solid Bets"
              picks={bets}
              icon={Star}
              iconColor="#29d87f"
            />
            <PickSection
              title="Pass"
              picks={passes}
              icon={TrendingUp}
              iconColor="#4d6080"
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
