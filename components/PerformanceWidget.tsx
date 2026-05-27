"use client"
import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Clock, TrendingUp, ChevronDown, ChevronUp } from "lucide-react"

interface PerformanceData {
  yesterday: {
    date: string
    correct: number
    incorrect: number
    pending: number
    winRate: number | null
    picks: {
      league: string
      homeTeam: string
      awayTeam: string
      pickTeam: string
      recommendation: string
      edgeScore: number
      result: string | null
    }[]
  }
  today: { total: number; strongBets: number }
  allTime: {
    correct: number
    incorrect: number
    winRate: number | null
    strongBetWinRate: number | null
  }
}

export function PerformanceWidget() {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/performance")
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data || data.yesterday.winRate === null && data.yesterday.pending === 0) return null

  const { yesterday, allTime } = data
  const hasResults = yesterday.correct + yesterday.incorrect > 0

  return (
    <div className="rounded-2xl bg-gray-900 border border-white/10 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-white">Yesterday's Model Performance</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="text-center">
            <p className={`text-2xl font-black ${hasResults ? (yesterday.winRate! >= 55 ? "text-green-400" : yesterday.winRate! >= 45 ? "text-yellow-400" : "text-red-400") : "text-gray-400"}`}>
              {hasResults ? `${yesterday.winRate}%` : "—"}
            </p>
            <p className="text-xs text-gray-500">Win Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-white">
              {yesterday.correct}-{yesterday.incorrect}
            </p>
            <p className="text-xs text-gray-500">W-L</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-black ${allTime.winRate !== null ? (allTime.winRate >= 55 ? "text-green-400" : "text-gray-300") : "text-gray-400"}`}>
              {allTime.winRate !== null ? `${allTime.winRate}%` : "—"}
            </p>
            <p className="text-xs text-gray-500">All-Time</p>
          </div>
        </div>
      </button>

      {expanded && yesterday.picks.length > 0 && (
        <div className="border-t border-white/10 px-4 pb-4 space-y-2 pt-3">
          {allTime.strongBetWinRate !== null && (
            <div className="flex items-center justify-between text-xs mb-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <span className="text-yellow-400 font-medium">Strong Bet accuracy</span>
              <span className="text-yellow-400 font-bold">{allTime.strongBetWinRate}%</span>
            </div>
          )}
          {yesterday.picks.map((pick, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{pick.pickTeam}</p>
                <p className="text-gray-500 truncate">{pick.league} • Edge {pick.edgeScore}</p>
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                {pick.result === "correct" && <><CheckCircle className="w-4 h-4 text-green-400" /><span className="text-green-400 font-bold">WIN</span></>}
                {pick.result === "incorrect" && <><XCircle className="w-4 h-4 text-red-400" /><span className="text-red-400 font-bold">LOSS</span></>}
                {pick.result === "push" && <span className="text-gray-400">PUSH</span>}
                {!pick.result && <><Clock className="w-4 h-4 text-gray-500" /><span className="text-gray-500">TBD</span></>}
              </div>
            </div>
          ))}
          {yesterday.pending > 0 && (
            <p className="text-xs text-gray-500 text-center pt-1">
              {yesterday.pending} game{yesterday.pending > 1 ? "s" : ""} still awaiting results
            </p>
          )}
        </div>
      )}
    </div>
  )
}
