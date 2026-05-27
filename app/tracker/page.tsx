"use client"
import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, Target, Award, BarChart3 } from "lucide-react"

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

interface YesterdayPick {
  league: string
  homeTeam: string
  awayTeam: string
  pickTeam: string
  recommendation: string
  edgeScore: number
  result: "correct" | "incorrect" | "push" | null
}

interface PerformanceData {
  yesterday: {
    date: string
    correct: number
    incorrect: number
    pending: number
    winRate: number | null
    picks: YesterdayPick[]
  }
  today: {
    total: number
    strongBets: number
    picks: TodayPick[]
  }
  allTime: {
    correct: number
    incorrect: number
    winRate: number | null
    strongBetWinRate: number | null
  }
}

function confidenceColor(confidence: string) {
  if (confidence === "elite") return "#f5c842"
  if (confidence === "high") return "#29d87f"
  return "#8c9bb5"
}

export default function RecordPage() {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [noDb, setNoDb] = useState(false)

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
            {/* All-time stats */}
            <div className="rounded-xl p-4" style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#4d6080" }}>
                All-Time Record
              </p>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-black text-white">
                    {data.allTime.correct}-{data.allTime.incorrect}
                  </p>
                  <p className="text-xs" style={{ color: "#4d6080" }}>W-L</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black"
                    style={{ color: data.allTime.winRate !== null && data.allTime.winRate >= 55 ? "#29d87f" : data.allTime.winRate !== null && data.allTime.winRate >= 45 ? "#f5c842" : "#f05b64" }}>
                    {data.allTime.winRate !== null ? `${data.allTime.winRate}%` : "—"}
                  </p>
                  <p className="text-xs" style={{ color: "#4d6080" }}>Win Rate</p>
                </div>
                <div className="text-center col-span-2">
                  <p className="text-2xl font-black"
                    style={{ color: data.allTime.strongBetWinRate !== null && data.allTime.strongBetWinRate >= 55 ? "#f5c842" : "#8c9bb5" }}>
                    {data.allTime.strongBetWinRate !== null ? `${data.allTime.strongBetWinRate}%` : "—"}
                  </p>
                  <p className="text-xs" style={{ color: "#4d6080" }}>Strong Bet Accuracy</p>
                </div>
              </div>
            </div>

            {/* Today's picks */}
            {data.today.picks?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Today&apos;s Picks</h2>
                  <div className="flex-1" style={{ height: "1px", backgroundColor: "#1e2d40" }} />
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#243044", color: "#8c9bb5" }}>
                    {data.today.picks.length}
                  </span>
                </div>
                {data.today.picks.map((pick, i) => (
                  <div key={i} className="rounded-xl p-4 flex items-center justify-between"
                    style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold uppercase tracking-wider"
                          style={{ color: "#4d6080" }}>{pick.league}</span>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: pick.confidence === "elite" ? "#2a1f00" : "#0d2e1e",
                            color: confidenceColor(pick.confidence),
                          }}>
                          {pick.confidence.toUpperCase()}
                        </span>
                      </div>
                      <p className="font-bold text-white truncate">{pick.pickTeam}</p>
                      <p className="text-xs truncate" style={{ color: "#8c9bb5" }}>
                        {pick.awayTeam} @ {pick.homeTeam}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-3" style={{ color: "#4d6080" }}>
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">Pending</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Yesterday's results */}
            {(data.yesterday.correct + data.yesterday.incorrect + data.yesterday.pending) > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Yesterday&apos;s Results</h2>
                  <div className="flex-1" style={{ height: "1px", backgroundColor: "#1e2d40" }} />
                  {data.yesterday.winRate !== null && (
                    <span className="text-xs font-bold"
                      style={{ color: data.yesterday.winRate >= 55 ? "#29d87f" : data.yesterday.winRate >= 45 ? "#f5c842" : "#f05b64" }}>
                      {data.yesterday.winRate}% W/R
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: TrendingUp, color: "#29d87f", value: data.yesterday.correct, label: "Correct" },
                    { icon: TrendingDown, color: "#f05b64", value: data.yesterday.incorrect, label: "Incorrect" },
                    { icon: Target, color: "#4d6080", value: data.yesterday.pending, label: "Pending" },
                  ].map(({ icon: Icon, color, value, label }) => (
                    <div key={label} className="rounded-xl p-3 text-center"
                      style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
                      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                      <p className="text-xl font-black" style={{ color }}>{value}</p>
                      <p className="text-xs" style={{ color: "#4d6080" }}>{label}</p>
                    </div>
                  ))}
                </div>

                {data.yesterday.picks.length > 0 && (
                  <div className="rounded-xl overflow-hidden"
                    style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
                    {data.yesterday.picks.map((pick, i) => (
                      <div key={i} className="px-4 py-3 flex items-center justify-between"
                        style={{ borderBottom: i < data.yesterday.picks.length - 1 ? "1px solid #1e2d40" : "none" }}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate text-sm">{pick.pickTeam}</p>
                          <p className="text-xs truncate" style={{ color: "#4d6080" }}>
                            {pick.league} · Edge {pick.edgeScore}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 ml-3">
                          {pick.result === "correct" && (
                            <>
                              <CheckCircle className="w-4 h-4" style={{ color: "#29d87f" }} />
                              <span className="text-sm font-bold" style={{ color: "#29d87f" }}>WIN</span>
                            </>
                          )}
                          {pick.result === "incorrect" && (
                            <>
                              <XCircle className="w-4 h-4" style={{ color: "#f05b64" }} />
                              <span className="text-sm font-bold" style={{ color: "#f05b64" }}>LOSS</span>
                            </>
                          )}
                          {pick.result === "push" && (
                            <span className="text-sm" style={{ color: "#8c9bb5" }}>PUSH</span>
                          )}
                          {!pick.result && (
                            <>
                              <Clock className="w-4 h-4" style={{ color: "#4d6080" }} />
                              <span className="text-sm" style={{ color: "#4d6080" }}>TBD</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {data.yesterday.correct + data.yesterday.incorrect + data.yesterday.pending === 0 &&
              (!data.today.picks || data.today.picks.length === 0) && (
              <div className="text-center py-12" style={{ color: "#4d6080" }}>
                <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium" style={{ color: "#8c9bb5" }}>No picks tracked yet</p>
                <p className="text-sm mt-1">Model picks are auto-tracked when games load on the Home tab</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
