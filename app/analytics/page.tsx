"use client"
import { useState, useEffect } from "react"
import {
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Award,
  BarChart3,
} from "lucide-react"

interface Bet {
  id: string
  sport: string
  team: string
  odds: number
  stake: number
  potentialWin: number
  status: string
  placedAt: string
}

interface SportStats {
  won: number
  lost: number
  staked: number
  won_amount: number
}

export default function AnalyticsPage() {
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/bets")
      .then((r) => r.json())
      .then((d) => setBets(d.bets ?? []))
      .finally(() => setLoading(false))
  }, [])

  const settled = bets.filter((b) => b.status !== "pending")
  const won = settled.filter((b) => b.status === "won")
  const lost = settled.filter((b) => b.status === "lost")

  const totalStaked = settled.reduce((a, b) => a + b.stake, 0)
  const totalReturned = won.reduce((a, b) => a + b.stake + b.potentialWin, 0)
  const profit = totalReturned - totalStaked
  const roi = totalStaked > 0 ? (profit / totalStaked) * 100 : 0
  const winRate = settled.length > 0 ? (won.length / settled.length) * 100 : 0

  // By sport
  const bySport = settled.reduce<Record<string, SportStats>>((acc, b) => {
    if (!acc[b.sport])
      acc[b.sport] = { won: 0, lost: 0, staked: 0, won_amount: 0 }
    if (b.status === "won") {
      acc[b.sport].won++
      acc[b.sport].won_amount += b.potentialWin
    }
    if (b.status === "lost") acc[b.sport].lost++
    acc[b.sport].staked += b.stake
    return acc
  }, {})

  const StatCard = ({
    label,
    value,
    sub,
    icon: Icon,
    color,
  }: {
    label: string
    value: string
    sub?: string
    icon: React.ElementType
    color: string
  }) => (
    <div className="rounded-2xl bg-gray-900 border border-white/10 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )

  const bestSport = Object.keys(bySport).sort((a, b) => {
    const totalA = bySport[a].won + bySport[a].lost
    const totalB = bySport[b].won + bySport[b].lost
    const profitA =
      bySport[a].won_amount - bySport[a].lost * (bySport[a].staked / Math.max(totalA, 1))
    const profitB =
      bySport[b].won_amount - bySport[b].lost * (bySport[b].staked / Math.max(totalB, 1))
    return profitB - profitA
  })[0]

  return (
    <div>
      <div className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur border-b border-white/10 px-4 py-4">
        <h1 className="text-xl font-black text-white">Analytics</h1>
        <p className="text-xs text-gray-500">Your betting performance</p>
      </div>

      <div className="px-4 pt-4 space-y-4 pb-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : settled.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No settled bets yet</p>
            <p className="text-sm mt-1">Track some bets to see analytics</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Total Profit"
                value={`${profit >= 0 ? "+" : ""}$${profit.toFixed(0)}`}
                sub={`${settled.length} settled bets`}
                icon={DollarSign}
                color={profit >= 0 ? "text-green-400" : "text-red-400"}
              />
              <StatCard
                label="ROI"
                value={`${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`}
                sub={`$${totalStaked.toFixed(0)} staked`}
                icon={roi >= 0 ? TrendingUp : TrendingDown}
                color={roi >= 0 ? "text-green-400" : "text-red-400"}
              />
              <StatCard
                label="Win Rate"
                value={`${winRate.toFixed(0)}%`}
                sub={`${won.length}W - ${lost.length}L`}
                icon={Target}
                color="text-blue-400"
              />
              <StatCard
                label="Best Sport"
                value={bestSport ?? "—"}
                sub="by profit"
                icon={Award}
                color="text-yellow-400"
              />
            </div>

            {/* By sport breakdown */}
            <div className="rounded-2xl bg-gray-900 border border-white/10 p-4 space-y-3">
              <h3 className="font-bold text-white text-sm">By Sport</h3>
              {Object.entries(bySport).map(([sport, stats]) => {
                const total = stats.won + stats.lost
                const sportWinRate =
                  total > 0 ? (stats.won / total) * 100 : 0
                const avgStake = total > 0 ? stats.staked / total : 0
                const sportProfit =
                  stats.won_amount - stats.lost * avgStake
                return (
                  <div
                    key={sport}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-white capitalize">
                        {sport}
                      </p>
                      <p className="text-xs text-gray-400">
                        {stats.won}W - {stats.lost}L (
                        {sportWinRate.toFixed(0)}%)
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold text-sm ${
                          sportProfit >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {sportProfit >= 0 ? "+" : ""}${sportProfit.toFixed(0)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
