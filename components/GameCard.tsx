"use client"
import { useState } from "react"
import { formatOdds } from "@/lib/utils"
import { EdgeScoreCard } from "./EdgeScoreCard"
import { format } from "date-fns"
import { ChevronDown, ChevronUp, AlertCircle, BarChart2, Info, Zap, CheckCircle } from "lucide-react"
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

interface TrackInfo {
  team: string
  odds: number
  market: string
  line?: string
}

interface GameCardProps {
  game: GameData
}

function getSportEmoji(sport: string) {
  switch (sport.toLowerCase()) {
    case "basketball": return "🏀"
    case "football":   return "🏈"
    case "baseball":   return "⚾"
    case "hockey":     return "🏒"
    default:           return "🏆"
  }
}

function OddsCell({
  line, odds, isRecommended, onClick
}: { line?: string; odds?: number; isRecommended: boolean; onClick: () => void }) {
  if (odds === undefined) return (
    <div className="flex-1 flex items-center justify-center rounded-lg h-14"
      style={{ backgroundColor: "#1e2d40", color: "#4d6080" }}>
      <span className="text-xs">—</span>
    </div>
  )
  return (
    <button onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center rounded-lg h-14 transition-all active:scale-95"
      style={{
        backgroundColor: isRecommended ? "#0d2e1e" : "#243044",
        border: isRecommended ? "1.5px solid #29d87f" : "1.5px solid transparent",
      }}>
      {line && (
        <span className="text-xs font-semibold" style={{ color: isRecommended ? "#29d87f" : "#8c9bb5" }}>
          {line}
        </span>
      )}
      <span className="text-sm font-bold" style={{ color: isRecommended ? "#29d87f" : "#ffffff" }}>
        {formatOdds(odds)}
      </span>
    </button>
  )
}

export function GameCard({ game }: GameCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null)
  const [stake, setStake] = useState("25")
  const [tracked, setTracked] = useState(false)

  const topPick = game.topPick
  const isRecommended = topPick?.recommendation !== "pass"

  const getOdds = (team: string, market: string) =>
    game.odds.find(o => o.market_name === market && o.team_name === team && o.sportsbook === "FanDuel")
    ?? game.odds.find(o => o.market_name === market && o.team_name === team)

  const awayML     = getOdds(game.away_team, "moneyline")
  const homeML     = getOdds(game.home_team, "moneyline")
  const awaySpread = getOdds(game.away_team, "spreads")
  const homeSpread = getOdds(game.home_team, "spreads")
  const overTotal  = game.odds.find(o => o.market_name === "totals" && o.team_name === "Over" && o.sportsbook === "FanDuel")
                  ?? game.odds.find(o => o.market_name === "totals" && o.team_name === "Over")
  const underTotal = game.odds.find(o => o.market_name === "totals" && o.team_name === "Under" && o.sportsbook === "FanDuel")
                  ?? game.odds.find(o => o.market_name === "totals" && o.team_name === "Under")

  const isAwayPick = isRecommended && topPick.team === game.away_team
  const isHomePick = isRecommended && topPick.team === game.home_team

  const potentialWin = (() => {
    if (!trackInfo) return 0
    const s = parseFloat(stake) || 0
    const o = trackInfo.odds
    return o > 0 ? (s * o) / 100 : (s * 100) / Math.abs(o)
  })()

  const track = (team: string, odds: number, market: string, line?: string) => {
    setTracked(false)
    setTrackInfo(prev =>
      prev?.team === team && prev?.market === market ? null : { team, odds, market, line }
    )
  }

  const confirmTrack = async () => {
    const s = parseFloat(stake) || 25
    const o = trackInfo!.odds
    const win = o > 0 ? (s * o) / 100 : (s * 100) / Math.abs(o)
    const { saveBet } = await import("@/lib/bets-store")
    saveBet({
      sport: game.sport,
      league: game.league,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      betType: trackInfo!.market,
      team: trackInfo!.team,
      odds: o,
      stake: s,
      potentialWin: win,
      notes: isRecommended ? `Edge ${topPick.overallEdge} · ${topPick.confidence}` : "",
      gameId: game.id,
      status: "pending",
    })
    setTracked(true)
    setTrackInfo(null)
  }

  const spreadLine = (point: number | undefined) =>
    point !== undefined ? (point > 0 ? `+${point}` : `${point}`) : undefined

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>

      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{getSportEmoji(game.sport)}</span>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#8c9bb5" }}>
            {game.league}
          </span>
          <span className="text-xs" style={{ color: "#4d6080" }}>
            {format(new Date(game.start_date), "h:mm a")}
          </span>
        </div>
        {isRecommended && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{
              backgroundColor: topPick.confidence === "elite" ? "#2a1f00" : "#0d2e1e",
              color: topPick.confidence === "elite" ? "#f5c842" : "#29d87f",
              border: `1px solid ${topPick.confidence === "elite" ? "#f5c842" : "#29d87f"}`,
            }}>
            <Zap className="w-3 h-3" />
            {topPick.confidence === "elite" ? "ELITE PICK" : topPick.confidence === "high" ? "STRONG BET" : "VALUE BET"}
          </div>
        )}
      </div>

      {/* Column headers */}
      <div className="px-4 pb-1">
        <div className="flex items-center gap-2">
          <div className="flex-1" />
          {["SPREAD", "TOTAL", "MONEY LINE"].map(h => (
            <div key={h} className="flex-1 text-center">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#4d6080" }}>
                {h}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Away team row */}
      <div className="px-4 pb-2 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate">{game.away_team}</p>
          <p className="text-xs" style={{ color: "#8c9bb5" }}>Away</p>
        </div>
        <OddsCell
          line={spreadLine(awaySpread?.point)}
          odds={awaySpread?.price}
          isRecommended={isAwayPick}
          onClick={() => awaySpread && track(game.away_team, awaySpread.price, "Spread", spreadLine(awaySpread.point))}
        />
        <OddsCell
          line={overTotal?.point !== undefined ? `O ${overTotal.point}` : undefined}
          odds={overTotal?.price}
          isRecommended={false}
          onClick={() => overTotal && track("Over", overTotal.price, "Over", overTotal.point !== undefined ? `O ${overTotal.point}` : undefined)}
        />
        <OddsCell
          odds={awayML?.price}
          isRecommended={isAwayPick}
          onClick={() => awayML && track(game.away_team, awayML.price, "Moneyline")}
        />
      </div>

      {/* Divider */}
      <div className="mx-4" style={{ height: "1px", backgroundColor: "#1e2d40" }} />

      {/* Home team row */}
      <div className="px-4 pt-2 pb-3 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate">{game.home_team}</p>
          <p className="text-xs" style={{ color: "#8c9bb5" }}>Home</p>
        </div>
        <OddsCell
          line={spreadLine(homeSpread?.point)}
          odds={homeSpread?.price}
          isRecommended={isHomePick}
          onClick={() => homeSpread && track(game.home_team, homeSpread.price, "Spread", spreadLine(homeSpread.point))}
        />
        <OddsCell
          line={underTotal?.point !== undefined ? `U ${underTotal.point}` : undefined}
          odds={underTotal?.price}
          isRecommended={false}
          onClick={() => underTotal && track("Under", underTotal.price, "Under", underTotal.point !== undefined ? `U ${underTotal.point}` : undefined)}
        />
        <OddsCell
          odds={homeML?.price}
          isRecommended={isHomePick}
          onClick={() => homeML && track(game.home_team, homeML.price, "Moneyline")}
        />
      </div>

      {/* Edge summary bar */}
      {isRecommended && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg flex items-center gap-2"
          style={{ backgroundColor: "#0d1e30", border: "1px solid #1e3a50" }}>
          <span className="text-xs font-bold" style={{ color: "#29d87f" }}>
            {topPick.team}
          </span>
          <span className="text-xs" style={{ color: "#4d6080" }}>·</span>
          <span className="text-xs font-bold" style={{ color: "#8c9bb5" }}>
            Edge {topPick.overallEdge}
          </span>
          <span className="text-xs" style={{ color: "#4d6080" }}>·</span>
          <span className="text-xs truncate" style={{ color: "#8c9bb5" }}>
            {topPick.reasoning?.[0] ?? "Model edge detected"}
          </span>
        </div>
      )}

      {/* Inline track panel */}
      {trackInfo && (
        <div className="mx-4 mb-3 rounded-lg p-3 space-y-2"
          style={{ backgroundColor: "#0d1e30", border: "1px solid #263044" }}>
          <p className="text-xs" style={{ color: "#8c9bb5" }}>
            <span className="font-semibold" style={{ color: "#4d6080" }}>{trackInfo.market}</span>
            {" · "}
            <span className="font-semibold text-white">{trackInfo.team}</span>
            {trackInfo.line && <span style={{ color: "#4d6080" }}> {trackInfo.line}</span>}
            {" · "}
            <span style={{ color: "#29d87f" }}>{formatOdds(trackInfo.odds)}</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "#4d6080" }}>Stake $</span>
            <input
              type="number"
              inputMode="decimal"
              value={stake}
              onChange={e => setStake(e.target.value)}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm font-bold text-white"
              style={{ backgroundColor: "#243044", border: "1px solid #263044", outline: "none", minWidth: 0 }}
            />
            <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#29d87f" }}>
              → ${potentialWin.toFixed(0)}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={confirmTrack}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
              style={{ backgroundColor: "#29d87f", color: "#0f1923" }}>
              Track Bet
            </button>
            <button onClick={() => setTrackInfo(null)}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: "#243044", color: "#8c9bb5" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tracked confirmation */}
      {tracked && !trackInfo && (
        <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ backgroundColor: "#0d2e1e", border: "1px solid #29d87f" }}>
          <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#29d87f" }} />
          <span className="text-sm font-semibold" style={{ color: "#29d87f" }}>Bet tracked!</span>
          <button onClick={() => setTracked(false)}
            className="ml-auto text-xs" style={{ color: "#4d6080" }}>
            dismiss
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex border-t" style={{ borderColor: "#1e2d40" }}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors"
          style={{ color: expanded ? "#29d87f" : "#8c9bb5" }}>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Hide Analysis" : "Edge Analysis"}
        </button>
        <div style={{ width: "1px", backgroundColor: "#1e2d40" }} />
        <button
          onClick={() => setShowSources(!showSources)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold transition-colors"
          style={{ color: "#4d6080" }}>
          <Info className="w-3.5 h-3.5" />
          Sources
        </button>
      </div>

      {/* Expanded: Edge analysis */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3" style={{ borderTop: "1px solid #1e2d40" }}>
          <div className="grid grid-cols-1 gap-3">
            <EdgeScoreCard team={game.away_team} edge={game.awayEdge} odds={awayML?.price ?? -110} compact={false} />
            <EdgeScoreCard team={game.home_team} edge={game.homeEdge} odds={homeML?.price ?? -110} compact={false} />
          </div>

          {game.injuries?.length > 0 && (
            <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "#0f1923", border: "1px solid #263044" }}>
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: "#8c9bb5" }}>
                <AlertCircle className="w-3.5 h-3.5" /> Injury Report
              </h4>
              {game.injuries.map((inj, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-white font-medium">{inj.player}</span>
                    <span className="ml-1" style={{ color: "#4d6080" }}>({inj.position})</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: inj.status === "out" ? "#3d1218" : inj.status === "doubtful" ? "#2a1f00" : "#1e2d40",
                      color: inj.status === "out" ? "#f05b64" : inj.status === "doubtful" ? "#f5c842" : "#8c9bb5",
                    }}>
                    {inj.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {game.marketConsensus?.length > 0 && (
            <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "#0f1923", border: "1px solid #263044" }}>
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: "#8c9bb5" }}>
                <BarChart2 className="w-3.5 h-3.5" /> Market Consensus
                <span className="font-normal normal-case tracking-normal" style={{ color: "#4d6080" }}>
                  (implied prob)
                </span>
              </h4>
              {game.marketConsensus.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span style={{ color: "#8c9bb5" }}>{entry.source}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{entry.pick}</span>
                    <span style={{ color: "#4d6080" }}>{Math.round(entry.impliedProb * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sources panel */}
      {showSources && !expanded && (
        <div className="px-4 pb-4 pt-3 space-y-1.5" style={{ borderTop: "1px solid #1e2d40" }}>
          {game.sources && Object.entries(game.sources).map(([key, value]) => (
            <div key={key} className="flex items-start justify-between text-xs gap-3">
              <span className="capitalize font-semibold" style={{ color: "#4d6080" }}>{key}</span>
              <span className="text-right" style={{ color: "#8c9bb5" }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
