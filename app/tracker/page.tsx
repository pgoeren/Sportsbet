"use client"
import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Trash2, TrendingUp, TrendingDown, BarChart3 } from "lucide-react"
import { formatOdds } from "@/lib/utils"
import { getBets, updateBet, deleteBet, type Bet } from "@/lib/bets-store"
import { format } from "date-fns"

export default function TrackerPage() {
  const [bets, setBets] = useState<Bet[]>([])
  const [tab, setTab] = useState<"pending" | "settled">("pending")

  useEffect(() => {
    setBets(getBets())
  }, [])

  const handleUpdate = (id: string, status: Bet["status"]) => {
    updateBet(id, status)
    setBets(getBets())
  }

  const handleDelete = (id: string) => {
    deleteBet(id)
    setBets(getBets())
  }

  const pending = bets.filter(b => b.status === "pending")
  const settled = bets.filter(b => b.status !== "pending")
  const displayed = tab === "pending" ? pending : settled

  const totalStaked = settled.reduce((a, b) => a + b.stake, 0)
  const totalWon = settled.filter(b => b.status === "won").reduce((a, b) => a + b.potentialWin, 0)
  const totalLost = settled.filter(b => b.status === "lost").reduce((a, b) => a + b.stake, 0)
  const roi = totalStaked > 0 ? ((totalWon - totalLost) / totalStaked) * 100 : 0

  return (
    <div>
      <div className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur border-b border-white/10 px-4 py-4">
        <h1 className="text-xl font-black text-white">Bet Tracker</h1>
        <p className="text-xs text-gray-500">{bets.length} total bets</p>
      </div>

      <div className="px-4 pt-4 space-y-4 pb-6">
        <div className="rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-400">ROI</p>
              <p className={`text-xl font-black ${roi >= 0 ? "text-green-400" : "text-red-400"}`}>
                {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Won</p>
              <p className="text-xl font-black text-green-400">+${totalWon.toFixed(0)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Lost</p>
              <p className="text-xl font-black text-red-400">-${totalLost.toFixed(0)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-white/5 rounded-xl p-1">
          {(["pending", "settled"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? "bg-blue-600 text-white" : "text-gray-400"}`}
            >
              {t} ({t === "pending" ? pending.length : settled.length})
            </button>
          ))}
        </div>

        {displayed.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No {tab} bets</p>
            {tab === "pending" && <p className="text-sm mt-1">Add bets from the Home or Picks tab</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(bet => (
              <div key={bet.id} className="rounded-2xl bg-gray-900 border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{bet.league} • {bet.betType}</span>
                  <span className="text-xs text-gray-500">{format(new Date(bet.placedAt), "MMM d, h:mm a")}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{bet.team}</p>
                    <p className="text-xs text-gray-400">{bet.awayTeam} @ {bet.homeTeam}</p>
                  </div>
                  <p className={`font-bold text-lg ${bet.odds > 0 ? "text-green-400" : "text-white"}`}>
                    {formatOdds(bet.odds)}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Stake: <span className="text-white font-medium">${bet.stake.toFixed(2)}</span></span>
                  <span className="text-gray-400">To win: <span className="text-green-400 font-medium">${bet.potentialWin.toFixed(2)}</span></span>
                </div>

                {bet.notes && <p className="text-xs text-gray-400 italic">{bet.notes}</p>}

                {bet.status === "pending" ? (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdate(bet.id, "won")}
                      className="flex items-center justify-center gap-1 py-2 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30"
                    >
                      <CheckCircle className="w-3 h-3" /> Won
                    </button>
                    <button
                      onClick={() => handleUpdate(bet.id, "lost")}
                      className="flex items-center justify-center gap-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30"
                    >
                      <XCircle className="w-3 h-3" /> Lost
                    </button>
                    <button
                      onClick={() => handleDelete(bet.id)}
                      className="flex items-center justify-center gap-1 py-2 rounded-lg bg-white/10 text-gray-400 text-xs font-medium hover:bg-white/20"
                    >
                      <Trash2 className="w-3 h-3" /> Del
                    </button>
                  </div>
                ) : (
                  <div className={`flex items-center justify-center gap-2 py-2 rounded-lg ${bet.status === "won" ? "bg-green-500/20" : bet.status === "lost" ? "bg-red-500/20" : "bg-gray-500/20"}`}>
                    {bet.status === "won" ? (
                      <><TrendingUp className="w-4 h-4 text-green-400" /><span className="text-green-400 font-bold">WON +${bet.potentialWin.toFixed(2)}</span></>
                    ) : bet.status === "lost" ? (
                      <><TrendingDown className="w-4 h-4 text-red-400" /><span className="text-red-400 font-bold">LOST -${bet.stake.toFixed(2)}</span></>
                    ) : (
                      <span className="text-gray-400">PUSH</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
