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
      <div className="sticky top-0 z-30 backdrop-blur px-4 py-4"
        style={{
          backgroundColor: "rgba(15,25,35,0.96)",
          borderBottom: "1px solid #1e2d40",
        }}>
        <h1 className="text-xl font-black text-white">Bet Tracker</h1>
        <p className="text-xs" style={{ color: "#4d6080" }}>{bets.length} total bets</p>
      </div>

      <div className="px-4 pt-4 space-y-4 pb-6">
        {/* Summary card */}
        <div className="rounded-2xl p-4"
          style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs mb-1" style={{ color: "#8c9bb5" }}>ROI</p>
              <p className="text-xl font-black" style={{ color: roi >= 0 ? "#29d87f" : "#f05b64" }}>
                {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs mb-1" style={{ color: "#8c9bb5" }}>Won</p>
              <p className="text-xl font-black" style={{ color: "#29d87f" }}>+${totalWon.toFixed(0)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs mb-1" style={{ color: "#8c9bb5" }}>Lost</p>
              <p className="text-xl font-black" style={{ color: "#f05b64" }}>-${totalLost.toFixed(0)}</p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl"
          style={{ backgroundColor: "#1a2535" }}>
          {(["pending", "settled"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="py-2 rounded-lg text-sm font-semibold capitalize transition-colors"
              style={{
                backgroundColor: tab === t ? "#29d87f" : "transparent",
                color: tab === t ? "#0f1923" : "#8c9bb5",
              }}
            >
              {t} ({t === "pending" ? pending.length : settled.length})
            </button>
          ))}
        </div>

        {displayed.length === 0 ? (
          <div className="text-center py-12" style={{ color: "#4d6080" }}>
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No {tab} bets</p>
            {tab === "pending" && (
              <p className="text-sm mt-1" style={{ color: "#4d6080" }}>
                Add bets from the Home or Picks tab
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(bet => (
              <div key={bet.id} className="rounded-2xl p-4 space-y-3"
                style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#8c9bb5" }}>
                    {bet.league} • {bet.betType}
                  </span>
                  <span className="text-xs" style={{ color: "#4d6080" }}>
                    {format(new Date(bet.placedAt), "MMM d, h:mm a")}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{bet.team}</p>
                    <p className="text-xs" style={{ color: "#8c9bb5" }}>
                      {bet.awayTeam} @ {bet.homeTeam}
                    </p>
                  </div>
                  <p className="font-bold text-lg"
                    style={{ color: bet.odds > 0 ? "#29d87f" : "#ffffff" }}>
                    {formatOdds(bet.odds)}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: "#8c9bb5" }}>
                    Stake: <span className="text-white font-medium">${bet.stake.toFixed(2)}</span>
                  </span>
                  <span style={{ color: "#8c9bb5" }}>
                    To win: <span className="font-medium" style={{ color: "#29d87f" }}>${bet.potentialWin.toFixed(2)}</span>
                  </span>
                </div>

                {bet.notes && (
                  <p className="text-xs italic" style={{ color: "#8c9bb5" }}>{bet.notes}</p>
                )}

                {bet.status === "pending" ? (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdate(bet.id, "won")}
                      className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{ backgroundColor: "#0d2e1e", color: "#29d87f", border: "1px solid #29d87f" }}
                    >
                      <CheckCircle className="w-3 h-3" /> Won
                    </button>
                    <button
                      onClick={() => handleUpdate(bet.id, "lost")}
                      className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{ backgroundColor: "#3d1218", color: "#f05b64", border: "1px solid #f05b64" }}
                    >
                      <XCircle className="w-3 h-3" /> Lost
                    </button>
                    <button
                      onClick={() => handleDelete(bet.id)}
                      className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{ backgroundColor: "#243044", color: "#8c9bb5" }}
                    >
                      <Trash2 className="w-3 h-3" /> Del
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-2 rounded-lg"
                    style={{
                      backgroundColor: bet.status === "won" ? "#0d2e1e"
                        : bet.status === "lost" ? "#3d1218" : "#243044",
                    }}>
                    {bet.status === "won" ? (
                      <>
                        <TrendingUp className="w-4 h-4" style={{ color: "#29d87f" }} />
                        <span className="font-bold" style={{ color: "#29d87f" }}>
                          WON +${bet.potentialWin.toFixed(2)}
                        </span>
                      </>
                    ) : bet.status === "lost" ? (
                      <>
                        <TrendingDown className="w-4 h-4" style={{ color: "#f05b64" }} />
                        <span className="font-bold" style={{ color: "#f05b64" }}>
                          LOST -${bet.stake.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: "#8c9bb5" }}>PUSH</span>
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
