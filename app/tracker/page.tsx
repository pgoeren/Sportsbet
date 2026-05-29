"use client"
import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, BarChart3, Award } from "lucide-react"
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
  odds: number | null
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

function fiveDollarReturn(odds: number | null): string | null {
  if (odds === null) return null
  const profit = odds > 0 ? 5 * (odds / 100) : 5 * (100 / Math.abs(odds))
  return `$${(5 + profit).toFixed(2)}`
}

function PickRow({ pick, isLast }: { pick: HistoryPick; isLast: boolean }) {
  const ret = fiveDollarReturn(pick.odds)
  const isWin  = pick.result === "correct"
  const isLoss = pick.result === "incorrect"

  return (
    <div className="flex items-center gap-3 px-4 py-3"
      style={{ borderTop: "1px solid #1e2d40" }}>
      {/* Result icon */}
      <div className="flex-shrink-0 w-5">
        {isWin  && <CheckCircle className="w-5 h-5" style={{ color: "#29d87f" }} />}
        {isLoss && <XCircle    className="w-5 h-5" style={{ color: "#f05b64" }} />}
        {pick.result === "push" && (
          <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: "#8c9bb5" }} />
        )}
      </div>

      {/* Pick info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">{pick.pickTeam}</p>
        <p className="text-xs truncate" style={{ color: "#4d6080" }}>
          {pick.awayTeam} @ {pick.homeTeam} · {pick.league}
        </p>
      </div>

      {/* Right: date / $5 return */}
      <div className="text-right flex-shrink-0 space-y-0.5">
        <p className="text-xs font-bold"
          style={{ color: isWin ? "#29d87f" : isLoss ? "#f05b64" : "#8c9bb5" }}>
          {isWin ? "WIN" : isLoss ? "LOSS" : "PUSH"}
          {isWin && ret ? ` → ${ret}` : ""}
        </p>
        <p className="text-xs" style={{ color: "#4d6080" }}>
          {format(parseISO(String(pick.date).slice(0, 10)), "MMM d")}
        </p>
        {!isWin && ret && (
          <p className="text-xs" style={{ color: "#4d6080" }}>$5 bet</p>
        )}
      </div>
    </div>
  )
}

function TierSection({
  tierKey, label, color, bg, tier, picks,
}: {
  tierKey: string
  label: string
  color: string
  bg: string
  tier: TierStats
  picks: HistoryPick[]
}) {
  const [open, setOpen] = useState(false)
  const total = tier.correct + tier.incorrect

  return (
    <div className="overflow-hidden" style={{ borderTop: "1px solid #1e2d40" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold" style={{ color }}>{label}</span>
        </div>
        <div className="flex items-center gap-3">
          {total > 0 ? (
            <>
              <span className="text-sm" style={{ color: "#8c9bb5" }}>
                {tier.correct}–{tier.incorrect}
              </span>
              <span className="font-black text-sm px-3 py-1 rounded-lg"
                style={{ backgroundColor: bg, color }}>
                {tier.winRate}%
              </span>
            </>
          ) : (
            <span className="text-xs" style={{ color: "#4d6080" }}>No history yet</span>
          )}
          {picks.length > 0 && (
            open
              ? <ChevronUp className="w-4 h-4" style={{ color: "#4d6080" }} />
              : <ChevronDown className="w-4 h-4" style={{ color: "#4d6080" }} />
          )}
        </div>
      </button>

      {open && picks.length > 0 && (
        <div style={{ borderTop: "1px solid #1e2d40", backgroundColor: "#141e2d" }}>
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#4d6080" }}>
              {picks.length} pick{picks.length !== 1 ? "s" : ""}
            </span>
            {picks.some(p => p.odds !== null) && (
              <span className="text-xs" style={{ color: "#4d6080" }}>$5 bet → return</span>
            )}
          </div>
          {picks.map((pick, i) => (
            <PickRow key={i} pick={pick} isLast={i === picks.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
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
            {/* All-time record + collapsible tier breakdown */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
              {/* Summary header */}
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
                    style={{ color: data.allTime.winRate !== null && data.allTime.winRate >= 55 ? "#29d87f"
                      : data.allTime.winRate !== null && data.allTime.winRate >= 45 ? "#f5c842" : "#8c9bb5" }}>
                    {data.allTime.winRate !== null ? `${data.allTime.winRate}%` : "—"}
                  </p>
                </div>
              </div>

              {/* Collapsible tier rows */}
              {([
                { key: "elite",  label: "Elite Pick",  color: "#f5c842", bg: "#2a1f00" },
                { key: "high",   label: "Strong Bet",  color: "#29d87f", bg: "#0d2e1e" },
                { key: "medium", label: "Value Bet",   color: "#4ea8f8", bg: "#0d1e30" },
              ] as const).map(({ key, label, color, bg }) => (
                <TierSection
                  key={key}
                  tierKey={key}
                  label={label}
                  color={color}
                  bg={bg}
                  tier={data.allTime.byConfidence?.[key] ?? { correct: 0, incorrect: 0, winRate: null }}
                  picks={data.allTime.history.filter(p => p.confidence === key)}
                />
              ))}
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
                      <div className="flex items-center gap-1.5 ml-3">
                        <Clock className="w-4 h-4" style={{ color: "#4d6080" }} />
                        <span className="text-xs" style={{ color: "#4d6080" }}>Pending</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {data.allTime.history.length === 0 && data.today.picks.length === 0 && (
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
