"use client"
import { useState } from "react"
import { formatOdds } from "@/lib/utils"
import { X } from "lucide-react"

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

  const stakeNum = parseFloat(stake) || 0
  const potentialWin = odds > 0 ? stakeNum * (odds / 100) : stakeNum * (100 / Math.abs(odds))
  const total = stakeNum + potentialWin

  const quickStakes = [10, 25, 50, 100]

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
      notes: "",
      gameId: game.id,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl overflow-hidden"
        style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "#263044" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #263044" }}>
          <h2 className="text-base font-bold text-white">Add to Bet Slip</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ backgroundColor: "#243044" }}>
            <X className="w-4 h-4" style={{ color: "#8c9bb5" }} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Selection */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "#0f1923", border: "1px solid #263044" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#8c9bb5" }}>
              {game.league} · {betType}
            </p>
            <p className="text-sm" style={{ color: "#8c9bb5" }}>
              {game.away_team} @ {game.home_team}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="font-bold text-white">{team}</span>
              <span className="text-xl font-black" style={{ color: odds > 0 ? "#29d87f" : "#ffffff" }}>
                {formatOdds(odds)}
              </span>
            </div>
          </div>

          {/* Bet type */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#4d6080" }}>Bet Type</p>
            <div className="grid grid-cols-3 gap-2">
              {["moneyline", "spread", "total"].map(t => (
                <button key={t} onClick={() => setBetType(t)}
                  className="py-2 rounded-lg text-xs font-bold capitalize transition-all"
                  style={{
                    backgroundColor: betType === t ? "#29d87f" : "#243044",
                    color: betType === t ? "#0f1923" : "#8c9bb5",
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Stake */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#4d6080" }}>Wager</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold"
                style={{ color: "#8c9bb5" }}>$</span>
              <input
                type="number"
                value={stake}
                onChange={e => setStake(e.target.value)}
                className="w-full pl-8 pr-4 py-4 rounded-xl text-xl font-black text-white focus:outline-none"
                style={{ backgroundColor: "#243044", border: "1.5px solid #263044" }}
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {quickStakes.map(s => (
                <button key={s} onClick={() => setStake(String(s))}
                  className="py-2 rounded-lg text-sm font-bold transition-all"
                  style={{ backgroundColor: "#243044", color: "#8c9bb5" }}>
                  ${s}
                </button>
              ))}
            </div>
          </div>

          {/* Payout */}
          <div className="rounded-xl p-4 flex items-center justify-between"
            style={{ backgroundColor: "#0f1923", border: "1px solid #263044" }}>
            <div>
              <p className="text-xs" style={{ color: "#4d6080" }}>To Win</p>
              <p className="text-2xl font-black" style={{ color: "#29d87f" }}>
                ${potentialWin.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: "#4d6080" }}>Total Return</p>
              <p className="text-lg font-bold text-white">${total.toFixed(2)}</p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={stakeNum <= 0}
            className="w-full py-4 rounded-xl font-black text-base transition-all disabled:opacity-40"
            style={{ backgroundColor: "#29d87f", color: "#0f1923" }}>
            Track Bet · ${stakeNum.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  )
}
