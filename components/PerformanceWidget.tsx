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

  const winRateColor = hasResults
    ? yesterday.winRate! >= 55 ? "#29d87f"
    : yesterday.winRate! >= 45 ? "#f5c842"
    : "#f05b64"
    : "#4d6080"

  const allTimeColor = allTime.winRate !== null
    ? allTime.winRate >= 55 ? "#29d87f" : "#8c9bb5"
    : "#4d6080"

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: "#4ea8f8" }} />
            <span className="text-sm font-bold text-white">Yesterday&apos;s Model Performance</span>
          </div>
          {expanded
            ? <ChevronUp className="w-4 h-4" style={{ color: "#8c9bb5" }} />
            : <ChevronDown className="w-4 h-4" style={{ color: "#8c9bb5" }} />}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="text-center">
            <p className="text-2xl font-black" style={{ color: winRateColor }}>
              {hasResults ? `${yesterday.winRate}%` : "—"}
            </p>
            <p className="text-xs" style={{ color: "#4d6080" }}>Win Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-white">
              {yesterday.correct}-{yesterday.incorrect}
            </p>
            <p className="text-xs" style={{ color: "#4d6080" }}>W-L</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black" style={{ color: allTimeColor }}>
              {allTime.winRate !== null ? `${allTime.winRate}%` : "—"}
            </p>
            <p className="text-xs" style={{ color: "#4d6080" }}>All-Time</p>
          </div>
        </div>
      </button>

      {expanded && yesterday.picks.length > 0 && (
        <div className="px-4 pb-4 space-y-2 pt-3" style={{ borderTop: "1px solid #1e2d40" }}>
          {allTime.strongBetWinRate !== null && (
            <div className="flex items-center justify-between text-xs mb-3 p-2 rounded-lg"
              style={{ backgroundColor: "#2a1f00", border: "1px solid #f5c842" }}>
              <span className="font-medium" style={{ color: "#f5c842" }}>Strong Bet accuracy</span>
              <span className="font-bold" style={{ color: "#f5c842" }}>{allTime.strongBetWinRate}%</span>
            </div>
          )}
          {yesterday.picks.map((pick, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1.5 last:border-0"
              style={{ borderBottom: "1px solid #1e2d40" }}>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{pick.pickTeam}</p>
                <p className="truncate" style={{ color: "#4d6080" }}>{pick.league} • Edge {pick.edgeScore}</p>
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                {pick.result === "correct" && (
                  <>
                    <CheckCircle className="w-4 h-4" style={{ color: "#29d87f" }} />
                    <span className="font-bold" style={{ color: "#29d87f" }}>WIN</span>
                  </>
                )}
                {pick.result === "incorrect" && (
                  <>
                    <XCircle className="w-4 h-4" style={{ color: "#f05b64" }} />
                    <span className="font-bold" style={{ color: "#f05b64" }}>LOSS</span>
                  </>
                )}
                {pick.result === "push" && <span style={{ color: "#8c9bb5" }}>PUSH</span>}
                {!pick.result && (
                  <>
                    <Clock className="w-4 h-4" style={{ color: "#4d6080" }} />
                    <span style={{ color: "#4d6080" }}>TBD</span>
                  </>
                )}
              </div>
            </div>
          ))}
          {yesterday.pending > 0 && (
            <p className="text-xs text-center pt-1" style={{ color: "#4d6080" }}>
              {yesterday.pending} game{yesterday.pending > 1 ? "s" : ""} still awaiting results
            </p>
          )}
        </div>
      )}
    </div>
  )
}
