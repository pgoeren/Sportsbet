import { EdgeResult } from "@/lib/edge-model"
import { formatOdds } from "@/lib/utils"

interface EdgeScoreCardProps {
  team: string
  edge: EdgeResult
  odds: number
  compact?: boolean
}

const scoreLabels = [
  { key: "analystScore",      label: "Mkt EV"     }, // multi-book consensus EV
  { key: "injuryScore",       label: "Injuries"   },
  { key: "historicalScore",   label: "Situational"},  // sport-specific spots
  { key: "lineMovementScore", label: "Line Move"  },
  { key: "homeAwayScore",     label: "Book Split" }, // book price divergence
] as const

function scoreColor(score: number) {
  if (score >= 70) return "#f5c842"
  if (score >= 55) return "#29d87f"
  if (score >= 40) return "#4ea8f8"
  return "#4d6080"
}

export function EdgeScoreCard({ team, edge, odds, compact }: EdgeScoreCardProps) {
  const confColor = edge.confidence === "elite" ? "#f5c842"
    : edge.confidence === "high" ? "#29d87f"
    : edge.confidence === "medium" ? "#4ea8f8"
    : "#4d6080"

  return (
    <div className="rounded-xl p-4 space-y-3"
      style={{ backgroundColor: "#0f1923", border: "1px solid #263044" }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-white text-sm">{team}</p>
          <p className="text-xs" style={{ color: "#4d6080" }}>{formatOdds(odds)}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-white">{edge.overallEdge}</p>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: confColor }}>
            {edge.confidence}
          </p>
        </div>
      </div>

      {!compact && (
        <div className="space-y-2">
          {scoreLabels.map(({ key, label }) => (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: "#8c9bb5" }}>{label}</span>
                <span className="font-bold text-white">{edge[key]}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#243044" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${edge[key]}%`, backgroundColor: scoreColor(edge[key]) }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid #1e2d40" }}>
        <span className="text-xs font-bold px-2 py-1 rounded"
          style={{
            backgroundColor: edge.recommendation === "strong_bet" ? "#2a1f00"
              : edge.recommendation === "bet" ? "#0d2e1e" : "#1e2d40",
            color: edge.recommendation === "strong_bet" ? "#f5c842"
              : edge.recommendation === "bet" ? "#29d87f" : "#4d6080",
          }}>
          {edge.recommendation === "strong_bet" ? "STRONG BET"
            : edge.recommendation === "bet" ? "BET" : "PASS"}
        </span>
        <span className="text-xs font-bold"
          style={{ color: edge.expectedValue > 0 ? "#29d87f" : "#f05b64" }}>
          EV {edge.expectedValue > 0 ? "+" : ""}{edge.expectedValue.toFixed(1)}
        </span>
      </div>
    </div>
  )
}
