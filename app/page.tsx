"use client"
import { useState, useEffect } from "react"
import { TrendingUp, Target, RefreshCw, Zap, ChevronDown, ChevronUp, AlertCircle, BarChart2 } from "lucide-react"
import { GameCard } from "@/components/GameCard"
import { EdgeScoreCard } from "@/components/EdgeScoreCard"
import { PerformanceWidget } from "@/components/PerformanceWidget"
import { formatOdds } from "@/lib/utils"
import { getTeamLogoUrl } from "@/lib/team-logos"
import { format } from "date-fns"

interface GameOdd {
  sportsbook: string
  market_name: string
  team_name: string
  price: number
  point?: number
}

interface EdgeResult {
  historicalScore: number
  injuryScore: number
  analystScore: number
  homeAwayScore: number
  lineMovementScore: number
  expectedValue: number
  overallEdge: number
  confidence: "low" | "medium" | "high" | "elite"
  recommendation: "pass" | "bet" | "strong_bet"
  reasoning: string[]
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
  injuries: Array<{
    team: string
    player: string
    position: string
    status: "out" | "doubtful" | "questionable" | "probable"
    impact: number
  }>
  marketConsensus: Array<{ source: string; pick: string; impliedProb: number }>
  sources: { odds: string; injuries: string; consensus: string; stats: string }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function getOdds(game: GameData, team: string, market: string): GameOdd | undefined {
  return game.odds.find(o => o.market_name === market && o.team_name === team && o.sportsbook === "FanDuel")
    ?? game.odds.find(o => o.market_name === market && o.team_name === team)
}

function toDecimal(american: number) {
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american)
}

function toAmerican(decimal: number) {
  return decimal >= 2
    ? Math.round((decimal - 1) * 100)
    : Math.round(-100 / (decimal - 1))
}

// ─── PickCard ─────────────────────────────────────────────────────────────────

function PickCard({ game }: { game: GameData }) {
  const pick = game.topPick
  const [showAnalysis, setShowAnalysis] = useState(false)

  const mlEntry  = getOdds(game, pick.team, "moneyline")
  const spreadEntry = getOdds(game, pick.team, "spreads")
  const accentColor = pick.confidence === "elite" ? "#f5c842"
    : pick.confidence === "high" ? "#29d87f"
    : "#4ea8f8"
  const accentBg = pick.confidence === "elite" ? "#2a1f00"
    : pick.confidence === "high" ? "#0d2e1e"
    : "#0d1e30"
  const opposingTeam = pick.team === game.home_team ? game.away_team : game.home_team
  const isHome = pick.team === game.home_team

  // Recommend spread when ML is heavy favorite — better value
  const useSpreakAsPrimary = mlEntry !== undefined && mlEntry.price < -185 && spreadEntry !== undefined

  const consensus = game.marketConsensus?.find(c => c.pick === pick.team)

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "#1a2535", border: `1px solid ${accentColor}` }}>

      {/* Accent top bar */}
      <div style={{ height: "3px", backgroundColor: accentColor }} />

      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#8c9bb5" }}>
            {game.league}
          </span>
          <span className="text-xs" style={{ color: "#4d6080" }}>
            {format(new Date(game.start_date), "h:mm a")}
          </span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: accentBg, color: accentColor, border: `1px solid ${accentColor}` }}>
          <Zap className="w-3 h-3" />
          {pick.confidence === "elite" ? "ELITE PICK" : pick.confidence === "high" ? "STRONG BET" : "VALUE BET"}
        </div>
      </div>

      {/* Main pick */}
      <div className="px-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {(() => {
              const logo = getTeamLogoUrl(pick.team, game.league)
              return logo ? (
                <img src={logo} alt={pick.team} width={44} height={44}
                  className="rounded-full flex-shrink-0 object-contain"
                  style={{ backgroundColor: "#0f1923", padding: "2px" }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
              ) : null
            })()}
            <div className="min-w-0">
              <p className="font-black text-white text-xl leading-tight truncate">{pick.team}</p>
              <p className="text-sm mt-0.5" style={{ color: "#8c9bb5" }}>
                {isHome ? "Home" : "Away"} · vs {opposingTeam}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {useSpreakAsPrimary && spreadEntry ? (
              <>
                <div className="px-3 py-2 rounded-lg text-right"
                  style={{ backgroundColor: accentBg, border: `1px solid ${accentColor}` }}>
                  <p className="text-xs font-semibold" style={{ color: accentColor }}>
                    SPREAD {spreadEntry.point !== undefined ? (spreadEntry.point > 0 ? `+${spreadEntry.point}` : spreadEntry.point) : ""}
                  </p>
                  <p className="font-black text-xl leading-tight" style={{ color: accentColor }}>
                    {formatOdds(spreadEntry.price)}
                  </p>
                </div>
                {mlEntry && (
                  <p className="text-xs" style={{ color: "#4d6080" }}>ML {formatOdds(mlEntry.price)}</p>
                )}
              </>
            ) : mlEntry ? (
              <>
                <div className="px-3 py-2 rounded-lg text-right"
                  style={{ backgroundColor: accentBg, border: `1px solid ${accentColor}` }}>
                  <p className="text-xs font-semibold" style={{ color: accentColor }}>MONEYLINE</p>
                  <p className="font-black text-xl leading-tight" style={{ color: accentColor }}>
                    {formatOdds(mlEntry.price)}
                  </p>
                </div>
                {spreadEntry && (
                  <p className="text-xs" style={{ color: "#4d6080" }}>
                    Spread {spreadEntry.point !== undefined ? (spreadEntry.point > 0 ? `+${spreadEntry.point}` : spreadEntry.point) : ""} ({formatOdds(spreadEntry.price)})
                  </p>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* Edge + reasoning */}
        <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "1px solid #1e2d40" }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold" style={{ color: accentColor }}>
              Edge {pick.overallEdge}
            </span>
            {consensus && (
              <>
                <span style={{ color: "#4d6080" }}>·</span>
                <span className="text-xs" style={{ color: "#8c9bb5" }}>
                  {Math.round(consensus.impliedProb * 100)}% market consensus
                </span>
              </>
            )}
          </div>
          {pick.reasoning?.slice(0, 2).map((r, i) => (
            <p key={i} className="text-xs flex items-start gap-1.5" style={{ color: "#8c9bb5" }}>
              <span style={{ color: accentColor, flexShrink: 0, marginTop: "1px" }}>•</span>
              {r}
            </p>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center px-4 py-2 border-t" style={{ borderColor: "#1e2d40", backgroundColor: "#0d1421" }}>
        <span className="text-xs" style={{ color: "#4d6080" }}>
          Model auto-tracking · see Record tab for results
        </span>
        <button onClick={() => setShowAnalysis(!showAnalysis)}
          className="ml-auto flex items-center gap-1 text-xs font-semibold"
          style={{ color: "#4d6080" }}>
          {showAnalysis ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Analysis
        </button>
      </div>

      {/* Expanded analysis */}
      {showAnalysis && (
        <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: "1px solid #1e2d40" }}>
          <div className="grid grid-cols-1 gap-3">
            <EdgeScoreCard team={game.away_team} edge={game.awayEdge}
              odds={game.odds.find(o => o.market_name === "moneyline" && o.team_name === game.away_team)?.price ?? -110}
              compact={false} />
            <EdgeScoreCard team={game.home_team} edge={game.homeEdge}
              odds={game.odds.find(o => o.market_name === "moneyline" && o.team_name === game.home_team)?.price ?? -110}
              compact={false} />
          </div>

          {game.injuries?.length > 0 && (
            <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "#0f1923", border: "1px solid #263044" }}>
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#8c9bb5" }}>
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
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#8c9bb5" }}>
                <BarChart2 className="w-3.5 h-3.5" /> Market Consensus
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
    </div>
  )
}

// ─── ParlayCard ───────────────────────────────────────────────────────────────

function ParlayCard({ games }: { games: GameData[] }) {
  if (games.length < 2) return null

  // Use top 2 picks sorted by edge score
  const top2 = [...games].sort((a, b) => b.topPick.overallEdge - a.topPick.overallEdge).slice(0, 2)

  const ml1 = getOdds(top2[0], top2[0].topPick.team, "moneyline")?.price
  const ml2 = getOdds(top2[1], top2[1].topPick.team, "moneyline")?.price

  if (ml1 === undefined || ml2 === undefined) return null

  const combined   = toDecimal(ml1) * toDecimal(ml2)
  const parlayOdds = toAmerican(combined)
  const return100  = Math.round(combined * 100)

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#1a2535", border: "1px solid #4ea8f8" }}>
      <div style={{ height: "3px", backgroundColor: "#4ea8f8" }} />

      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-white">Parlay Suggestion</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#0d1e30", color: "#4ea8f8", border: "1px solid #4ea8f8" }}>
            2-TEAM ML
          </span>
        </div>
      </div>

      <div className="px-4 space-y-0">
        {top2.map((game, i) => {
          const odds = i === 0 ? ml1 : ml2
          return (
            <div key={game.id} className="flex items-center justify-between py-2.5"
              style={{ borderBottom: i === 0 ? "1px solid #1e2d40" : "none" }}>
              <div>
                <p className="text-sm font-bold text-white">{game.topPick.team}</p>
                <p className="text-xs" style={{ color: "#8c9bb5" }}>
                  {game.league} · {format(new Date(game.start_date), "h:mm a")}
                </p>
              </div>
              <span className="font-bold text-sm" style={{ color: odds > 0 ? "#29d87f" : "#ffffff" }}>
                {formatOdds(odds)}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mx-4 mb-4 rounded-lg p-3" style={{ backgroundColor: "#0d1e30", border: "1px solid #4ea8f8" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: "#8c9bb5" }}>Combined odds</p>
            <p className="text-2xl font-black" style={{ color: "#4ea8f8" }}>{formatOdds(parlayOdds)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "#8c9bb5" }}>$100 bet returns</p>
            <p className="text-2xl font-black text-white">${return100}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [games, setGames] = useState<GameData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  const fetchGames = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/games")
      const data = await res.json()
      setGames(data.games ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGames() }, [])

  const filtered = filter === "all" ? games : games.filter(g => g.sport === filter)
  const sports   = ["all", ...Array.from(new Set(games.map(g => g.sport)))]

  // All games the model recommends — sorted elite → high → medium by edge score
  const bestBets = filtered
    .filter(g => g.topPick?.recommendation !== "pass")
    .sort((a, b) => {
      const rank = { elite: 0, high: 1, medium: 2, low: 3 } as Record<string, number>
      return (rank[a.topPick.confidence] ?? 3) - (rank[b.topPick.confidence] ?? 3)
        || b.topPick.overallEdge - a.topPick.overallEdge
    })

  // Remaining games grouped by league (for odds reference)
  const bestBetIds = new Set(bestBets.map(g => g.id))
  const byLeague   = filtered
    .filter(g => !bestBetIds.has(g.id))
    .reduce<Record<string, GameData[]>>((acc, g) => {
      if (!acc[g.league]) acc[g.league] = []
      acc[g.league].push(g)
      return acc
    }, {})

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur px-4 py-3"
        style={{ backgroundColor: "rgba(15,25,35,0.97)", borderBottom: "1px solid #1e2d40" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-1.5">
              BetEdge
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#29d87f" }} />
            </h1>
            <p className="text-xs" style={{ color: "#4d6080" }}>Model picks · auto-tracked daily</p>
          </div>
          <button onClick={fetchGames} className="p-2 rounded-full" style={{ backgroundColor: "#243044" }}>
            <RefreshCw className="w-4 h-4" style={{ color: "#8c9bb5" }} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6 pb-28">
        <PerformanceWidget />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Zap, color: "#f5c842", value: bestBets.length, label: "Best Bets" },
            { icon: Target, color: "#4ea8f8", value: games.length, label: "Games Today" },
            { icon: TrendingUp, color: "#29d87f",
              value: games.length > 0 ? Math.round(games.reduce((a, g) => a + (g.topPick?.overallEdge ?? 0), 0) / games.length) : 0,
              label: "Avg Edge" },
          ].map(({ icon: Icon, color, value, label }) => (
            <div key={label} className="rounded-xl p-3 text-center"
              style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
              <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-xs" style={{ color: "#8c9bb5" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Sport filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {sports.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold capitalize"
              style={{
                backgroundColor: filter === s ? "#29d87f" : "#243044",
                color: filter === s ? "#0f1923" : "#8c9bb5",
              }}>
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-44 rounded-xl animate-pulse" style={{ backgroundColor: "#1a2535" }} />
            ))}
          </div>
        ) : (
          <>
            {/* ── TODAY'S PICKS ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: "#f5c842" }} />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">Today&apos;s Picks</h2>
                <div className="flex-1" style={{ height: "1px", backgroundColor: "#1e2d40" }} />
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#2a1f00", color: "#f5c842" }}>
                  {bestBets.length}
                </span>
              </div>

              {bestBets.length === 0 ? (
                <div className="rounded-xl p-6 text-center"
                  style={{ backgroundColor: "#1a2535", border: "1px solid #263044" }}>
                  <p className="font-semibold" style={{ color: "#8c9bb5" }}>No model picks today</p>
                  <p className="text-xs mt-1" style={{ color: "#4d6080" }}>
                    Model is passing on all games — check back later or refresh
                  </p>
                </div>
              ) : (
                bestBets.map(g => <PickCard key={g.id} game={g} />)
              )}
            </div>

            {/* ── PARLAY SUGGESTION ── */}
            {bestBets.length >= 2 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Parlay Suggestion</h2>
                  <div className="flex-1" style={{ height: "1px", backgroundColor: "#1e2d40" }} />
                </div>
                <ParlayCard games={bestBets} />
              </div>
            )}

            {/* ── ALL MATCHUPS (odds reference) ── */}
            {Object.keys(byLeague).length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#4d6080" }}>
                    All Matchups
                  </h2>
                  <div className="flex-1" style={{ height: "1px", backgroundColor: "#1e2d40" }} />
                  <span className="text-xs" style={{ color: "#4d6080" }}>odds reference</span>
                </div>
                {Object.entries(byLeague).map(([league, leagueGames]) => (
                  <div key={league} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#4d6080" }}>
                        {league}
                      </h3>
                      <div className="flex-1" style={{ height: "1px", backgroundColor: "#1e2d40" }} />
                      <span className="text-xs" style={{ color: "#4d6080" }}>{leagueGames.length}</span>
                    </div>
                    {leagueGames.map(g => <GameCard key={g.id} game={g} />)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
