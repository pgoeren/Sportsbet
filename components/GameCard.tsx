"use client"
import { useState } from "react"
import { formatOdds, getEdgeColor } from "@/lib/utils"
import { Badge } from "./ui/badge"
import { EdgeScoreCard } from "./EdgeScoreCard"
import { format } from "date-fns"
import { ChevronDown, ChevronUp, TrendingUp, BarChart2, AlertCircle, Info } from "lucide-react"
import { EdgeResult, InjuryReport } from "@/lib/edge-model"
import { GameOdd } from "@/lib/odds-api"

interface MarketConsensusEntry {
  source: string
  pick: string
  impliedProb: number
}

interface GameSources {
  odds: string
  injuries: string
  consensus: string
  stats: string
}

interface GameData {
  id: string
  sport: string
  league: string
  home_team: string
  away_team: string
  start_date: string
  odds: GameOdd[]
  homeEdge: EdgeResult
  awayEdge: EdgeResult
  topPick: EdgeResult & { team: string }
  injuries: InjuryReport[]
  marketConsensus: MarketConsensusEntry[]
  sources: GameSources
}

interface GameCardProps {
  game: GameData
  onBet: (game: GameData, team: string, odds: number) => void
}

function getSportIcon(sport: string) {
  switch (sport.toLowerCase()) {
    case "basketball": return "🏀"
    case "football": return "🏈"
    case "baseball": return "⚾"
    case "hockey": return "🏒"
    case "soccer": return "⚽"
    default: return "🏆"
  }
}

export function GameCard({ game, onBet }: GameCardProps) {
  const [expanded, setExpanded] = useState(false)

  const homeOdds =
    game.odds.find(
      (o) =>
        o.market_name === "moneyline" &&
        o.team_name === game.home_team &&
        o.sportsbook === "FanDuel"
    )?.price ??
    game.odds.find(
      (o) => o.market_name === "moneyline" && o.team_name === game.home_team
    )?.price ??
    -110

  const awayOdds =
    game.odds.find(
      (o) =>
        o.market_name === "moneyline" &&
        o.team_name === game.away_team &&
        o.sportsbook === "FanDuel"
    )?.price ??
    game.odds.find(
      (o) => o.market_name === "moneyline" && o.team_name === game.away_team
    )?.price ??
    -110

  const topPick = game.topPick
  const isElite = topPick?.confidence === "elite"
  const isHighConf = topPick?.confidence === "high"

  return (
    <div
      className={`rounded-2xl overflow-hidden border ${
        isElite
          ? "border-yellow-500/40 bg-gradient-to-b from-yellow-500/10 to-gray-900"
          : isHighConf
          ? "border-green-500/30 bg-gradient-to-b from-green-500/5 to-gray-900"
          : "border-white/10 bg-gray-900"
      }`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getSportIcon(game.sport)}</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              {game.league}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isElite && (
              <Badge variant="elite" className="text-xs animate-pulse">
                ELITE EDGE
              </Badge>
            )}
            {!isElite && isHighConf && (
              <Badge variant="high" className="text-xs">
                HIGH CONF
              </Badge>
            )}
            <span className="text-xs text-gray-500">
              {format(new Date(game.start_date), "h:mm a")}
            </span>
          </div>
        </div>

        {/* Teams & Odds */}
        <div className="space-y-2">
          {/* Away team */}
          <button
            onClick={() => onBet(game, game.away_team, awayOdds)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">{game.away_team}</span>
              <span className="text-xs text-gray-500">AWAY</span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-bold ${getEdgeColor(
                  game.awayEdge?.overallEdge ?? 0
                )}`}
              >
                Edge: {game.awayEdge?.overallEdge ?? "—"}
              </span>
              <span
                className={`font-bold text-sm ${
                  awayOdds > 0 ? "text-green-400" : "text-white"
                }`}
              >
                {formatOdds(awayOdds)}
              </span>
            </div>
          </button>

          {/* Home team */}
          <button
            onClick={() => onBet(game, game.home_team, homeOdds)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">{game.home_team}</span>
              <span className="text-xs text-gray-500">HOME</span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-bold ${getEdgeColor(
                  game.homeEdge?.overallEdge ?? 0
                )}`}
              >
                Edge: {game.homeEdge?.overallEdge ?? "—"}
              </span>
              <span
                className={`font-bold text-sm ${
                  homeOdds > 0 ? "text-green-400" : "text-white"
                }`}
              >
                {formatOdds(homeOdds)}
              </span>
            </div>
          </button>
        </div>

        {/* Top pick summary */}
        {topPick && topPick.recommendation !== "pass" && (
          <div className="mt-3 p-2 rounded-lg bg-white/5 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <p className="text-xs text-gray-300">
              <span className="font-medium text-white">{topPick.team}</span>:{" "}
              {topPick.reasoning?.[0] ?? "Edge detected"}
            </p>
          </div>
        )}
      </div>

      {/* Expand button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-500 hover:text-gray-300 border-t border-white/10 transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3 h-3" /> Hide Analysis
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" /> Full Analysis
          </>
        )}
      </button>

      {/* Expanded analysis */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <EdgeScoreCard team={game.away_team} edge={game.awayEdge} odds={awayOdds} />
            <EdgeScoreCard team={game.home_team} edge={game.homeEdge} odds={homeOdds} />
          </div>

          {/* Injuries */}
          {game.injuries?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> INJURY REPORT
              </h4>
              {game.injuries.map((inj, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">
                    {inj.player} ({inj.team})
                  </span>
                  <Badge
                    variant={inj.status === "out" ? "destructive" : "medium"}
                    className="text-xs"
                  >
                    {inj.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Market consensus */}
          {game.marketConsensus?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <h4 className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                  <BarChart2 className="w-3 h-3" /> MARKET CONSENSUS
                </h4>
                <span className="text-xs text-gray-600">(implied probability)</span>
              </div>
              {game.marketConsensus.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{entry.source}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{entry.pick}</span>
                    <span className="text-gray-500">{Math.round(entry.impliedProb * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sources */}
          {game.sources && (
            <div className="rounded-lg bg-white/5 p-3 space-y-1.5 border border-white/5">
              <h4 className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                <Info className="w-3 h-3" /> DATA SOURCES
              </h4>
              {Object.entries(game.sources).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between text-xs gap-2">
                  <span className="text-gray-500 capitalize flex-shrink-0">{key}</span>
                  <span className="text-gray-300 text-right">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
