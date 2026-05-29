"use client"
import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Clock, BarChart3, Award } from "lucide-react"
import { format, parseISO } from "date-fns"

interface TodayPick {
  league: string
  homeTeam: string
  awayTeam: string
  pickTeam: string
  recommendation: string
  confidence: string
  edgeScore: number
  gameTime: string
}

interface HistoryPick {
  date: string
  league: string
  homeTeam: string
  awayTeam: string
  pickTeam: string
  confidence: string
  edgeScore: number
  result: "correct" | "incorrect" | "push"
}

interface TierStats {
  correct: number
  incorrect: number
  winRate: number | null
}

interface PerformanceData {
  today: {
    total: number
    strongBets: number
    picks: TodayPick[]
  }
  allTime: {
    correct: number
    incorrect: number
    winRate: number | null
    byConfidence: {
      elite: TierStats
      high: TierStats
      medium: TierStats
    }
    history: HistoryPick[]
  }
}

function confidenceLabel(c: string) {
  if (c === "elite") return "ELITE"
  if (c === "high")  return "STRONG"
  return "VALUE"
}

function confidenceColor(c: string) {
  if (c === "elite") return "#f5c842"
  if (c === "high")  return "#29d87f"
  return "#4ea8f8"
}

function confidenceBg(c: string) {
  if (c === "elite") return "#2a1f00"
  if (c === "high")  return "#0d2e1e"
  return "#0d1e30"
}

export default function RecordPage() {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [noDb, setNoDb] = useState(false)
  const [tierFilter, setTierFilter] = useState<"all" | "elite" | "high" | "medium">("all")

  useEffect(() => {
    fetch("/api/performance")
      .then(r => r.json())
      .then(d => {
        if (d.error) setNoDb(true)
        else setData(d)
      })
      .catch(() => setNoDb(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="sticky top-0 z-30 backdrop-blur px-4 py-3"
        style={{ backgroundColor: "rgba(15,25,35,0.97)", borderBottom: "1px solid #1e2d40" }}>
        <h1 className="text-xl font-black text-white">Model Record</h1>
        <p className="text-xs" style={{ color: "#4d6080" }}>Auto-tracked picks and results</p>
      </div>

      <div className="px-4 pt-4 space-y-6 pb-28">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: "#1a2535" }} />
            ))}
          </div>
        ) : noDb ? (
          <div className="rounded-xl p-6 space-y-3 text-center"
            style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
            <BarChart3 className="w-10 h-10 mx-auto" style={{ color: "#4d6080" }} />
            <p className="font-semibold text-white">Performance tracking needs a database</p>
            <p className="text-sm" style={{ color: "#8c9bb5" }}>
              Add <code className="px-1 rounded text-xs" style={{ backgroundColor: "#243044", color: "#4ea8f8" }}>DATABASE_URL</code> to your Vercel environment variables to enable pick tracking and results.
            </p>
            <p className="text-xs" style={{ color: "#4d6080" }}>Free Neon DB at neon.tech</p>
          </div>
        ) : data ? (
          <>
            {/* All-time summary + tier breakdown */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#4d6080" }}>All-Time Record</p>
                  <p className="text-3xl font-black text-white mt-1">
                    {data.allTime.correct}–{data.allTime.incorrect}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#4d6080" }}>Win Rate</p>
                  <p className="text-3xl font-black mt-1"
                    style={{ color: data.allTime.winRate !== null && data.allTime.winRate >= 55 ? "#29d87f" : data.allTime.winRate !== null && data.allTime.winRate >= 45 ? "#f5c842" : "#8c9bb5" }}>
                    {data.allTime.winRate !== null ? `${data.allTime.winRate}%` : "—"}
                  </p>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #1e2d40" }}>
                {([
                  { key: "elite"  as const, label: "Elite Pick",  color: "#f5c842", bg: "#2a1f00" },
                  { key: "high"   as const, label: "Strong Bet",  color: "#29d87f", bg: "#0d2e1e" },
                  { key: "medium" as const, label: "Value Bet",   color: "#4ea8f8", bg: "#0d1e30" },
                ]).map(({ key, label, color, bg }, i) => {
                  const tier = data.allTime.byConfidence?.[key]
                  const total = tier ? tier.correct + tier.incorrect : 0
                  return (
                    <div key={key} className="flex items-center justify-between px-4 py-3"
                      style={{ borderTop: i > 0 ? "1px solid #1e2d40" : undefined }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-semibold" style={{ color }}>{label}</span>
                      </div>
                      {total > 0 ? (
                        <div className="flex items-center gap-3">
                          <span className="text-sm" style={{ color: "#8c9bb5" }}>
                            {tier!.correct}–{tier!.incorrect}
                          </span>
                          <span className="font-black text-sm px-3 py-1 rounded-lg"
                            style={{ backgroundColor: bg, color }}>
                            {tier!.winRate}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "#4d6080" }}>No history yet</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Today's pending picks */}
            {data.today.picks?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Today&apos;s Picks</h2>
                  <div className="flex-1" style={{ height: "1px", backgroundColor: "#1e2d40" }} />
                  <Clock className="w-3.5 h-3.5" style={{ color: "#4d6080" }} />
                  <span className="text-xs" style={{ color: "#4d6080" }}>Pending</span>
                </div>
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
                  {data.today.picks.map((pick, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3"
                      style={{ borderTop: i > 0 ? "1px solid #1e2d40" : undefined }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: confidenceBg(pick.confidence), color: confidenceColor(pick.confidence) }}>
                            {confidenceLabel(pick.confidence)}
                          </span>
                          <span className="text-xs" style={{ color: "#4d6080" }}>{pick.league}</span>
                        </div>
                        <p className="font-bold text-white text-sm truncate">{pick.pickTeam}</p>
                        <p className="text-xs truncate" style={{ color: "#4d6080" }}>
                          {pick.awayTeam} @ {pick.homeTeam}
                        </p>
                      </div>
                      <Clock className="w-4 h-4 ml-3 flex-shrink-0" style={{ color: "#4d6080" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pick history */}
            {data.allTime.history?.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Pick History</h2>
                  <div className="flex-1" style={{ height: "1px", backgroundColor: "#1e2d40" }} />
                </div>

                {/* Tier filter */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(["all", "elite", "high", "medium"] as const).map(t => (
                    <button key={t} onClick={() => setTierFilter(t)}
                      className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold capitalize"
                      style={{
                        backgroundColor: tierFilter === t
                          ? (t === "all" ? "#243044" : confidenceBg(t))
                          : "#1a2535",
                        color: tierFilter === t
                          ? (t === "all" ? "#ffffff" : confidenceColor(t))
                          : "#4d6080",
                        border: tierFilter === t
                          ? `1px solid ${t === "all" ? "#263044" : confidenceColor(t)}`
                          : "1px solid #263044",
                      }}>
                      {t === "all" ? "All" : t === "elite" ? "Elite" : t === "high" ? "Strong" : "Value"}
                    </button>
                  ))}
                </div>

                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
                  {data.allTime.history
                    .filter(p => tierFilter === "all" || p.confidence === tierFilter)
                    .map((pick, i, arr) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3"
                        style={{ borderTop: i > 0 ? "1px solid #1e2d40" : undefined }}>
                        {/* Result icon */}
                        <div className="flex-shrink-0">
                          {pick.result === "correct" && <CheckCircle className="w-5 h-5" style={{ color: "#29d87f" }} />}
                          {pick.result === "incorrect" && <XCircle className="w-5 h-5" style={{ color: "#f05b64" }} />}
                          {pick.result === "push" && <div className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ borderColor: "#8c9bb5" }} />}
                        </div>

                        {/* Pick info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: confidenceBg(pick.confidence), color: confidenceColor(pick.confidence) }}>
                              {confidenceLabel(pick.confidence)}
                            </span>
                            <span className="text-xs" style={{ color: "#4d6080" }}>{pick.league}</span>
                          </div>
                          <p className="font-semibold text-white text-sm truncate">{pick.pickTeam}</p>
                          <p className="text-xs truncate" style={{ color: "#4d6080" }}>
                            {pick.awayTeam} @ {pick.homeTeam}
                          </p>
                        </div>

                        {/* Date + result */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-bold"
                            style={{ color: pick.result === "correct" ? "#29d87f" : pick.result === "incorrect" ? "#f05b64" : "#8c9bb5" }}>
                            {pick.result === "correct" ? "WIN" : pick.result === "incorrect" ? "LOSS" : "PUSH"}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "#4d6080" }}>
                            {format(parseISO(String(pick.date).slice(0, 10)), "MMM d")}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              data.today.picks.length === 0 && (
                <div className="text-center py-12" style={{ color: "#4d6080" }}>
                  <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium" style={{ color: "#8c9bb5" }}>No picks tracked yet</p>
                  <p className="text-sm mt-1">Model picks are auto-tracked when games load on the Home tab</p>
                </div>
              )
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
