import { EdgeResult } from "@/lib/edge-model"
import { Badge } from "./ui/badge"
import { formatOdds } from "@/lib/utils"

interface EdgeScoreCardProps {
  team: string
  edge: EdgeResult
  odds: number
  compact?: boolean
}

const scoreLabels = [
  { key: "historicalScore", label: "Historical" },
  { key: "injuryScore", label: "Injuries" },
  { key: "analystScore", label: "Analysts" },
  { key: "homeAwayScore", label: "Home/Away" },
  { key: "lineMovementScore", label: "Line Move" },
] as const

export function EdgeScoreCard({ team, edge, odds, compact }: EdgeScoreCardProps) {
  const getProgressColor = (score: number) => {
    if (score >= 70) return "bg-gradient-to-r from-yellow-500 to-orange-500"
    if (score >= 55) return "bg-gradient-to-r from-green-500 to-emerald-500"
    if (score >= 40) return "bg-gradient-to-r from-blue-500 to-cyan-500"
    return "bg-gradient-to-r from-gray-500 to-gray-600"
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-white text-sm">{team}</p>
          <p className="text-xs text-gray-400">{formatOdds(odds)}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{edge.overallEdge}</div>
          <Badge variant={edge.confidence as "elite" | "high" | "medium" | "low"} className="text-xs">
            {edge.confidence.toUpperCase()}
          </Badge>
        </div>
      </div>

      {!compact && (
        <div className="space-y-2">
          {scoreLabels.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">{label}</span>
                <span className="text-white font-medium">{edge[key]}</span>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full transition-all ${getProgressColor(edge[key])}`}
                  style={{ width: `${edge[key]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <Badge
          variant={edge.recommendation as "strong_bet" | "bet" | "pass"}
          className="text-xs font-bold"
        >
          {edge.recommendation === "strong_bet"
            ? "STRONG BET"
            : edge.recommendation === "bet"
            ? "BET"
            : "PASS"}
        </Badge>
        <span
          className={`text-xs font-medium ${
            edge.expectedValue > 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          EV: {edge.expectedValue > 0 ? "+" : ""}
          {edge.expectedValue.toFixed(1)}
        </span>
      </div>
    </div>
  )
}
