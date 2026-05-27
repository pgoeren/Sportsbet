"use client"
import { useState } from "react"
import { formatOdds } from "@/lib/utils"
import { X, DollarSign } from "lucide-react"
import { Badge } from "./ui/badge"

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

interface BetModalProps {
  game: {
    id: string
    sport: string
    league: string
    home_team: string
    away_team: string
  }
  team: string
  odds: number
  onClose: () => void
  onSubmit: (bet: BetPayload) => void
}

export function BetModal({ game, team, odds, onClose, onSubmit }: BetModalProps) {
  const [stake, setStake] = useState("10")
  const [betType, setBetType] = useState("moneyline")
  const [notes, setNotes] = useState("")

  const stakeNum = parseFloat(stake) || 0
  const potentialWin =
    odds > 0 ? stakeNum * (odds / 100) : stakeNum * (100 / Math.abs(odds))

  const handleSubmit = () => {
    onSubmit({
      sport: game.sport,
      league: game.league,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      betType,
      team,
      odds,
      stake: stakeNum,
      potentialWin,
      notes,
      gameId: game.id,
    })
    onClose()
  }

  const quickStakes = [10, 25, 50, 100]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-gray-900 rounded-t-3xl border-t border-white/10 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Place Bet</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Game info */}
        <div className="rounded-xl bg-white/5 p-4 space-y-1">
          <p className="text-xs text-gray-400">{game.league}</p>
          <p className="text-sm font-semibold text-white">
            {game.away_team} @ {game.home_team}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="high" className="text-sm">
              {team}
            </Badge>
            <span
              className={`font-bold text-lg ${
                odds > 0 ? "text-green-400" : "text-white"
              }`}
            >
              {formatOdds(odds)}
            </span>
          </div>
        </div>

        {/* Bet type */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block">BET TYPE</label>
          <div className="grid grid-cols-3 gap-2">
            {["moneyline", "spread", "total"].map((t) => (
              <button
                key={t}
                onClick={() => setBetType(t)}
                className={`py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                  betType === t
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-gray-400 hover:bg-white/20"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Stake */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block">STAKE ($)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {quickStakes.map((s) => (
              <button
                key={s}
                onClick={() => setStake(String(s))}
                className="py-2 rounded-lg text-xs font-medium text-gray-400 bg-white/10 hover:bg-white/20"
              >
                ${s}
              </button>
            ))}
          </div>
        </div>

        {/* Potential win */}
        <div className="rounded-xl bg-white/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Potential Win</p>
            <p className="text-2xl font-bold text-green-400">
              ${potentialWin.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total Return</p>
            <p className="text-lg font-semibold text-white">
              ${(stakeNum + potentialWin).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Notes */}
        <textarea
          placeholder="Notes (optional)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 resize-none h-16"
        />

        <button
          onClick={handleSubmit}
          disabled={stakeNum <= 0}
          className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Track Bet • ${stakeNum.toFixed(2)}
        </button>
      </div>
    </div>
  )
}
