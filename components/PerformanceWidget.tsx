"use client"
import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Clock, TrendingUp, ChevronDown, ChevronUp } from "lucide-react"

interface TierStats {
  correct: number
  incorrect: number
  winRate: number | null
}

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
      confidence: string
      edgeScore: number
      result: string | null
    }[]
  }
  today: { total: number; strongBets: number }
  allTime: {
    correct: number
    incorrect: number
    winRate: number | null
    byConfidence: {
      elite: TierStats
      high: TierStats
      medium: TierStats
    }
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

      {expanded && (
        <div className="px-4 pb-4 space-y-3 pt-3" style={{ borderTop: "1px solid #1e2d40" }}>

          {/* All-time by confidence tier */}
          {allTime.byConfidence && (
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #263044" }}>
              <div className="px-3 py-2" style={{ backgroundColor: "#0f1923" }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8c9bb5" }}>
                  All-Time by Pick Tier
                </p>
              </div>
              {[
                { key: "elite" as const, label: "Elite Pick", color: "#f5c842", bg: "#2a1f00" },
                { key: "high"  as const, label: "Strong Bet", color: "#29d87f", bg: "#0d2e1e" },
                { key: "medium"as const, label: "Value Bet",  color: "#4ea8f8", bg: "#0d1e30" },
              ].map(({ key, label, color, bg }) => {
                const tier = allTime.byConfidence[key]
                const total = tier.correct + tier.incorrect
                return (
                  <div key={key} className="flex items-center justify-between px-3 py-2.5"
                    style={{ borderTop: "1px solid #1e2d40" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                    </div>
                    {total > 0 ? (
                      <div className="flex items-center gap-3 text-xs">
                        <span style={{ color: "#8c9bb5" }}>
                          {tier.correct}–{tier.incorrect}
                        </span>
                        <span className="font-black text-sm px-2 py-0.5 rounded"
                          style={{ backgroundColor: bg, color }}>
                          {tier.winRate}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: "#4d6080" }}>No history yet</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Yesterday's individual picks */}
          {yesterday.picks.length > 0 && (
            <div className="space-y-0 rounded-lg overflow-hidden" style={{ border: "1px solid #263044" }}>
              <div className="px-3 py-2" style={{ backgroundColor: "#0f1923" }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8c9bb5" }}>
                  Yesterday&apos;s Picks
                </p>
              </div>
              {yesterday.picks.map((pick, i) => (
                <div key={i} className="flex items-center justify-between text-xs px-3 py-2.5"
                  style={{ borderTop: "1px solid #1e2d40" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{pick.pickTeam}</p>
                    <p className="truncate" style={{ color: "#4d6080" }}>
                      {pick.league} · Edge {pick.edgeScore}
                      {pick.confidence && ` · ${pick.confidence}`}
                    </p>
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
                <p className="text-xs text-center py-2" style={{ color: "#4d6080", borderTop: "1px solid #1e2d40" }}>
                  {yesterday.pending} game{yesterday.pending > 1 ? "s" : ""} still awaiting results
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
