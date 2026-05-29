import { calcExpectedValue, oddsToImpliedProb } from "./utils"
import type { GameOdd } from "./odds-api"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamStats {
  wins: number
  losses: number
  homeWins: number
  homeLosses: number
  awayWins: number
  awayLosses: number
  last10: { wins: number; losses: number }
  pointsPerGame: number
  pointsAllowedPerGame: number
  headToHead: { wins: number; losses: number }
}

export interface InjuryReport {
  team: string
  player: string
  position: string
  status: "out" | "doubtful" | "questionable" | "probable"
  impact: number // 0-10
}

export interface AnalystPick {
  analyst: string
  pick: string
  confidence: "low" | "medium" | "high"
}

export interface EdgeInput {
  homeTeam: string
  awayTeam: string
  homeStats?: TeamStats
  awayStats?: TeamStats
  injuries?: InjuryReport[]
  analystPicks?: AnalystPick[]
  isHome: boolean
  currentOdds: number
  openingOdds: number
  sport: string
  allOdds?: GameOdd[] // full multi-book odds array
}

export interface EdgeResult {
  historicalScore: number   // repurposed: situational edge score
  injuryScore: number
  analystScore: number      // repurposed: market EV score
  homeAwayScore: number     // repurposed: book divergence / value score
  lineMovementScore: number
  expectedValue: number
  overallEdge: number
  confidence: "low" | "medium" | "high" | "elite"
  recommendation: "pass" | "bet" | "strong_bet"
  reasoning: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decimalOdds(american: number): number {
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american)
}

function bestPrice(prices: number[]): number {
  // Highest decimal return = most value for the bettor
  return prices.reduce((best, p) => decimalOdds(p) > decimalOdds(best) ? p : best, prices[0])
}

// ─── Signal 1: Market EV — model-adjusted probability vs best available price ──
// Core insight: EV = model_probability vs market_price.
// Betting consensus prob at consensus price = always negative due to vig.
// Real edge comes when our model probability (adjusted for injuries + situational
// signals) diverges from what the market implies. Each percentage point of
// genuine model edge over the market implied prob = positive EV.

function calcConsensusProb(input: EdgeInput): { consensusProb: number; bestPrice: number; bookCount: number } {
  const team = input.isHome ? input.homeTeam : input.awayTeam
  const opp  = input.isHome ? input.awayTeam : input.homeTeam
  const odds  = input.allOdds ?? []

  const teamPrices = odds.filter(o => o.market_name === "moneyline" && o.team_name === team).map(o => o.price)
  const oppPrices  = odds.filter(o => o.market_name === "moneyline" && o.team_name === opp).map(o => o.price)

  // Vig-removed probability per book that has both sides (multiplicative devig)
  const vigFreeProbs: number[] = []
  const count = Math.min(teamPrices.length, oppPrices.length)
  for (let i = 0; i < count; i++) {
    const tImpl = oddsToImpliedProb(teamPrices[i])
    const oImpl = oddsToImpliedProb(oppPrices[i])
    vigFreeProbs.push(tImpl / (tImpl + oImpl))
  }

  const consensusProb = vigFreeProbs.length > 0
    ? vigFreeProbs.reduce((a, b) => a + b) / vigFreeProbs.length
    : oddsToImpliedProb(input.currentOdds)

  const best = teamPrices.length > 0 ? bestPrice(teamPrices) : input.currentOdds
  return { consensusProb, bestPrice: best, bookCount: vigFreeProbs.length }
}

// Probability adjustments from real signals — these are what create model edge
// over the market. Sized conservatively: each source capped, total capped at ±0.15.
function calcProbabilityDeltas(input: EdgeInput, stats: TeamStats | undefined): {
  injuryDelta: number
  situationalDelta: number
  lineDelta: number
} {
  const team = input.isHome ? input.homeTeam : input.awayTeam
  const opp  = input.isHome ? input.awayTeam : input.homeTeam
  const injuries = input.injuries ?? []
  const statusMult: Record<string, number> = { out: 1, doubtful: 0.75, questionable: 0.4, probable: 0.1 }

  // Injury delta: opponent injuries are under-priced by market in first 30–60 min
  let teamImpact = 0, oppImpact = 0
  for (const inj of injuries) {
    const m = statusMult[inj.status] ?? 0
    if (inj.team === team) teamImpact += inj.impact * m
    else if (inj.team === opp) oppImpact += inj.impact * m
  }
  const injuryDelta = Math.max(-0.10, Math.min(0.10, (oppImpact - teamImpact) * 0.007))

  // Situational delta: research-backed probability adjustments
  let situationalDelta = 0

  if (stats) {
    const overallWin = stats.wins / Math.max(stats.wins + stats.losses, 1)
    const recentWin  = stats.last10.wins / 10
    if (overallWin - recentWin > 0.25) situationalDelta += 0.05  // bounce-back
    if (recentWin - overallWin > 0.25) situationalDelta -= 0.04  // regression
  }

  // Home underdog: market systematically over-prices road favorites
  if (input.isHome && oddsToImpliedProb(input.currentOdds) < 0.47) situationalDelta += 0.04

  // Moderate underdog: favorite-longshot bias correction (JoPE, NBER)
  if (input.currentOdds >= 120 && input.currentOdds <= 200) situationalDelta += 0.03

  // Large road favorite: historically covers only 43.8% (Sharp Football)
  if (input.sport === "football" && !input.isHome) {
    const allOdds = input.allOdds ?? []
    const spreads = allOdds.filter(o => o.market_name === "spreads" && o.team_name === input.awayTeam)
    const avg = spreads.length > 0 ? spreads.reduce((a, o) => a + (o.point ?? 0), 0) / spreads.length : 0
    if (avg < -7) situationalDelta -= 0.06
  }

  situationalDelta = Math.max(-0.08, Math.min(0.08, situationalDelta))

  // Line movement delta: direction as fraction of move size
  const openDec = decimalOdds(input.openingOdds)
  const currDec = decimalOdds(input.currentOdds)
  const movePct = (currDec - openDec) / openDec
  // Negative movePct = got more favored = money on this side
  const lineDelta = Math.max(-0.04, Math.min(0.04, -movePct * 2))

  return { injuryDelta, situationalDelta, lineDelta }
}

function calcMarketEV(
  input: EdgeInput,
  stats: TeamStats | undefined,
): { score: number; ev: number; consensusProb: number; modelProb: number; bestAvailablePrice: number; reasons: string[] } {
  const reasons: string[] = []

  const { consensusProb, bestPrice: best, bookCount } = calcConsensusProb(input)
  const { injuryDelta, situationalDelta, lineDelta } = calcProbabilityDeltas(input, stats)

  // Model probability: market consensus adjusted by our real-signal deltas
  const modelProb = Math.min(0.95, Math.max(0.05,
    consensusProb + injuryDelta + situationalDelta + lineDelta
  ))

  // EV: model probability vs best available market price
  const ev = calcExpectedValue(best, modelProb)

  // How much our model diverges from market consensus (the true edge signal)
  const edgeOverMarket = modelProb - consensusProb

  const score = Math.min(100, Math.max(0, 50 + ev * 3))

  if (ev > 8) {
    reasons.push(
      `Strong edge: model at ${Math.round(modelProb * 100)}% vs market ${Math.round(consensusProb * 100)}% ` +
      `(+${(edgeOverMarket * 100).toFixed(1)}pp above ${bookCount}-book consensus)`
    )
  } else if (ev > 3) {
    reasons.push(
      `Positive EV: model ${Math.round(modelProb * 100)}% vs market ${Math.round(consensusProb * 100)}% ` +
      `— ${(edgeOverMarket * 100).toFixed(1)}pp model edge`
    )
  } else if (ev > 0) {
    reasons.push(
      `Marginal edge: model ${Math.round(modelProb * 100)}% vs market ${Math.round(consensusProb * 100)}%`
    )
  } else if (ev < -5) {
    reasons.push(
      `Market favors the other side: model at ${Math.round(modelProb * 100)}% vs ` +
      `${Math.round(consensusProb * 100)}% consensus`
    )
  }

  return { score, ev, consensusProb, modelProb, bestAvailablePrice: best, reasons }
}

// ─── Signal 2: Book Divergence — stale line opportunity ───────────────────────
// When multiple books disagree on price, at least one has a soft/stale number.
// Research: shopping for even half-points near key numbers is mathematically clean.

function calcBookDivergence(input: EdgeInput): { score: number; reasons: string[] } {
  const reasons: string[] = []
  const team = input.isHome ? input.homeTeam : input.awayTeam
  const odds  = input.allOdds ?? []
  const prices = odds.filter(o => o.market_name === "moneyline" && o.team_name === team).map(o => o.price)

  if (prices.length < 2) return { score: 50, reasons: [] }

  const decimals = prices.map(decimalOdds)
  const maxD = Math.max(...decimals)
  const minD = Math.min(...decimals)
  const divergePct = ((maxD - minD) / minD) * 100

  let score = 50
  if (divergePct > 6) {
    score = 72
    reasons.push(`Books split ${divergePct.toFixed(1)}% — soft line exists at ${prices.length} books`)
  } else if (divergePct > 3) {
    score = 61
    reasons.push(`Book divergence: ${divergePct.toFixed(1)}% spread across ${prices.length} books`)
  } else if (divergePct > 1) {
    score = 54
  }

  return { score, reasons }
}

// ─── Signal 3: Injury-Adjusted Value ─────────────────────────────────────────
// Real injury data from Tank01. Key positions (QB, PG, SP, G) have outsized impact.
// The market often takes 30–60 min to fully price in injury news.

function calcInjuryScore(input: EdgeInput): { score: number; reasons: string[] } {
  const reasons: string[] = []
  const team = input.isHome ? input.homeTeam : input.awayTeam
  const opp  = input.isHome ? input.awayTeam : input.homeTeam
  const injuries = input.injuries ?? []

  const statusMult: Record<string, number> = { out: 1, doubtful: 0.75, questionable: 0.4, probable: 0.1 }

  let teamImpact = 0
  let oppImpact  = 0

  for (const inj of injuries) {
    const mult = statusMult[inj.status] ?? 0
    if (inj.team === team) teamImpact += inj.impact * mult
    else if (inj.team === opp) oppImpact += inj.impact * mult
  }

  // Score: 50 = neutral; opponent injuries help us, our injuries hurt
  const score = Math.min(100, Math.max(0, 50 + (oppImpact - teamImpact) * 3))

  if (teamImpact > 15) {
    reasons.push(`Major injury concerns — estimated ${teamImpact.toFixed(0)} pts of impact lost`)
  } else if (teamImpact > 8) {
    reasons.push(`Injury risk: ${teamImpact.toFixed(0)} pts of starter impact compromised`)
  } else if (teamImpact === 0 && oppImpact === 0) {
    reasons.push("Both teams at full strength")
  }

  if (oppImpact > 15) {
    reasons.push(`Opponent significantly undermanned — ${oppImpact.toFixed(0)} pts of impact missing`)
  } else if (oppImpact > 8) {
    reasons.push(`Opponent dealing with notable injuries (impact: ${oppImpact.toFixed(0)})`)
  }

  return { score, reasons }
}

// ─── Signal 4: Situational Edge — research-backed spots ───────────────────────
// Sources: Sharp Football Analysis, Wharton NBA research, OddsShark, academic studies.
// These are among the highest-confidence situational edges in the literature.

function calcSituationalScore(
  input: EdgeInput,
  stats: TeamStats | undefined,
  consensusProb: number,
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 50

  // ── Bounce-back spot ──────────────────────────────────────────────────────
  // Research: NBA teams off a 12.5+ pt loss cover 56% ATS (+9.2% ROI).
  // Proxy via mock stats: if team's last-10 win% is significantly below their
  // overall win%, they are likely underperforming their true level → regression.
  if (stats) {
    const overallWinPct = stats.wins / Math.max(stats.wins + stats.losses, 1)
    const recentWinPct  = stats.last10.wins / 10
    const dropoff = overallWinPct - recentWinPct

    if (dropoff > 0.25) {
      score += 12
      reasons.push(
        `Bounce-back spot: ${stats.last10.wins}-${stats.last10.losses} recently vs ` +
        `${Math.round(overallWinPct * 100)}% overall — regression to mean likely`
      )
    } else if (dropoff < -0.25) {
      // Hot streak above true level → regression risk
      score -= 8
      reasons.push(
        `Regression risk: hot streak (${stats.last10.wins}-${stats.last10.losses}) ` +
        `unsustainable at ${Math.round(overallWinPct * 100)}% true level`
      )
    }
  }

  // ── Large road favorite fade ───────────────────────────────────────────────
  // Research: NFL road favorites at -7.5+ cover only 43.8% (Sharp Football Analysis).
  // Public over-bets road powerhouses, inflating the line.
  if (input.sport === "football" && !input.isHome) {
    const allOdds   = input.allOdds ?? []
    const team      = input.awayTeam
    const spreads   = allOdds.filter(o => o.market_name === "spreads" && o.team_name === team)
    const avgSpread = spreads.length > 0
      ? spreads.reduce((a, o) => a + (o.point ?? 0), 0) / spreads.length
      : null

    if (avgSpread !== null && avgSpread < -7) {
      score -= 14
      reasons.push(
        `Large road favorite (${avgSpread.toFixed(1)}) — NFL road favorites here cover only 43.8% ATS`
      )
    }
  }

  // ── Home underdog value ──────────────────────────────────────────────────
  // Research: Road underdogs (when looking from away side) at 60% ATS — books
  // systematically over-price road favorites due to public home-bias overcorrection.
  // From the HOME UNDERDOG perspective: structural edge.
  if (input.isHome && consensusProb < 0.47) {
    score += 10
    reasons.push("Home underdog — market over-prices road favorite; structural ATS value")
  }

  // ── Moderate underdog: favorite-longshot bias correction ──────────────────
  // Research (Journal of Political Economy, NBER): longshots are systematically
  // overbet; large favorites are underbet. Moderate underdogs (+120–+200) sit
  // in the sweet spot where the market overprices the favorite.
  if (input.currentOdds >= 120 && input.currentOdds <= 200) {
    score += 7
    reasons.push(
      `Underdog range (+${input.currentOdds}) — favorite-longshot bias tends to ` +
      `over-price the other side here`
    )
  }

  // ── Dominant home record (real signal when stats are meaningful) ───────────
  if (stats && input.isHome) {
    const homeWinPct = stats.homeWins / Math.max(stats.homeWins + stats.homeLosses, 1)
    if (homeWinPct > 0.68) {
      score += 8
      reasons.push(`Elite home record: ${stats.homeWins}-${stats.homeLosses} at home`)
    } else if (homeWinPct < 0.35) {
      score -= 6
      reasons.push(`Weak home record: ${stats.homeWins}-${stats.homeLosses} at home`)
    }
  }

  // ── Head-to-head dominance ────────────────────────────────────────────────
  if (stats) {
    const h2hTotal  = stats.headToHead.wins + stats.headToHead.losses
    const h2hWinPct = h2hTotal > 0 ? stats.headToHead.wins / h2hTotal : 0.5
    if (h2hWinPct > 0.70 && h2hTotal >= 3) {
      score += 6
      reasons.push(
        `Historically dominates this matchup: ${stats.headToHead.wins}-${stats.headToHead.losses} H2H`
      )
    } else if (h2hWinPct < 0.30 && h2hTotal >= 3) {
      score -= 6
      reasons.push(
        `Struggles in this matchup: ${stats.headToHead.wins}-${stats.headToHead.losses} H2H`
      )
    }
  }

  return { score: Math.min(100, Math.max(0, score)), reasons }
}

// ─── Signal 5: Line Movement / Sharp Money Indicator ─────────────────────────
// Research: Reverse Line Movement (line moves opposite public betting %) indicates
// sharp syndicate money. When a line moves toward a team, sharp money is on them.
// Steam moves close within 5 min — line direction tells us who the smart money favours.
// NOTE: Opening odds are currently simulated ±10 pts — direction is approximate.

function calcLineMovementScore(
  opening: number,
  current: number,
  isHome: boolean,
): { score: number; reasons: string[] } {
  const reasons: string[] = []

  const openDec = decimalOdds(opening)
  const currDec = decimalOdds(current)
  const movePct  = ((currDec - openDec) / openDec) * 100
  const absMove  = Math.abs(movePct)

  if (absMove < 1) {
    reasons.push("Stable line — market in agreement, no significant sharp movement")
    return { score: 55, reasons } // stable = mildly positive (efficient market agrees)
  }

  // Positive movePct = odds got longer (team less favored = money went other way = RLM-ish)
  // Negative movePct = odds got shorter (team more favored = sharp/public backing this team)
  const movedTowardTeam = movePct < 0 // decimal decreased = implied prob went up = more favored

  let score = 50

  if (movedTowardTeam && absMove > 4) {
    score = 70
    reasons.push(`Sharp indicator: line moved ${absMove.toFixed(1)}% toward this team`)
  } else if (movedTowardTeam && absMove > 2) {
    score = 60
    reasons.push(`Moderate line movement toward this team (${absMove.toFixed(1)}%)`)
  } else if (!movedTowardTeam && absMove > 5) {
    // Line moved away significantly — sharp money on the other side
    score = 28
    reasons.push(
      `Reverse signal: line moved ${absMove.toFixed(1)}% away — sharp money may be on other side`
    )
  } else if (!movedTowardTeam && absMove > 3) {
    score = 38
    reasons.push(`Line drifted ${absMove.toFixed(1)}% away — some pressure on the other side`)
  }

  return { score, reasons }
}

// ─── Main: calculateEdge ──────────────────────────────────────────────────────

export function calculateEdge(input: EdgeInput): EdgeResult {
  const stats = input.isHome ? input.homeStats : input.awayStats

  // calcMarketEV now incorporates injury + situational deltas into modelProb
  // so EV reflects real model signal, not just vig-eroded market probability.
  const marketEV    = calcMarketEV(input, stats)
  const bookDiv     = calcBookDivergence(input)
  const injury      = calcInjuryScore(input)
  const situational = calcSituationalScore(input, stats, marketEV.consensusProb)
  const lineMove    = calcLineMovementScore(input.openingOdds, input.currentOdds, input.isHome)

  const weights = {
    marketEV:    0.35,
    injury:      0.25,
    situational: 0.20,
    lineMove:    0.10,
    bookDiv:     0.10,
  }

  const weightedScore =
    marketEV.score    * weights.marketEV    +
    injury.score      * weights.injury      +
    situational.score * weights.situational +
    lineMove.score    * weights.lineMove    +
    bookDiv.score     * weights.bookDiv

  const overallEdge = Math.round(weightedScore)
  const ev = marketEV.ev

  // Confirming signals: independent factors pointing the same direction
  const confirming = [
    bookDiv.score     >= 60,
    injury.score      >= 63,
    situational.score >= 63,
    lineMove.score    >= 65,
    ev > 3,
  ].filter(Boolean).length

  // ── Confidence tiers ────────────────────────────────────────────────────
  // Elite: multiple independent signals + meaningful EV + no injury liability
  // High: positive EV + at least 2 confirming signals
  // Medium: any positive overall score above neutral — model always picks best
  //         available (no "pass everything" scenario; worst case is medium)
  // Pass: only if score is genuinely below neutral (< 50) — rare with real data

  let confidence: "low" | "medium" | "high" | "elite"
  let recommendation: "pass" | "bet" | "strong_bet"

  if (overallEdge >= 70 && ev > 5 && confirming >= 3 && injury.score >= 48) {
    confidence     = "elite"
    recommendation = "strong_bet"
  } else if (overallEdge >= 61 && ev > 2 && confirming >= 2) {
    confidence     = "high"
    recommendation = "strong_bet"
  } else if (overallEdge >= 52) {
    // Medium: positive overall score — model recommends the bet
    // EV is informational but not a gate here; the other signals justify the pick
    confidence     = "medium"
    recommendation = "bet"
  } else {
    confidence     = "low"
    recommendation = "pass"
  }

  return {
    historicalScore:   Math.round(situational.score), // situational edge
    injuryScore:       Math.round(injury.score),
    analystScore:      Math.round(marketEV.score),    // multi-book EV
    homeAwayScore:     Math.round(bookDiv.score),     // book divergence
    lineMovementScore: Math.round(lineMove.score),
    expectedValue:     Math.round(ev * 100) / 100,
    overallEdge,
    confidence,
    recommendation,
    reasoning: [
      ...marketEV.reasons,
      ...injury.reasons,
      ...situational.reasons,
      ...lineMove.reasons,
      ...bookDiv.reasons,
    ].filter(Boolean),
  }
}

// ─── Mock stats for demo (seeded pseudo-random for consistent display) ────────

export function getMockStats(team: string, seed: number): TeamStats {
  let s = seed
  const rand = (min: number, max: number) => {
    const x = Math.sin(s++) * 10000
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min
  }
  void team
  const wins  = rand(20, 55)
  const losses = rand(15, 45)
  const homeWins = rand(10, 30)
  const homeLosses = rand(5, 20)
  return {
    wins, losses, homeWins, homeLosses,
    awayWins:  wins - homeWins,
    awayLosses: losses - homeLosses,
    last10: { wins: rand(2, 8), losses: rand(2, 8) },
    pointsPerGame: rand(95, 125),
    pointsAllowedPerGame: rand(95, 125),
    headToHead: { wins: rand(1, 6), losses: rand(1, 6) },
  }
}

export function getMockInjuries(homeTeam: string, awayTeam: string): InjuryReport[] {
  return [
    { team: homeTeam, player: "Key Player",  position: "PG", status: "questionable", impact: 6 },
    { team: awayTeam, player: "Star Forward", position: "SF", status: "out",          impact: 9 },
  ]
}

export function getMockAnalystPicks(homeTeam: string, awayTeam: string): AnalystPick[] {
  return [
    { analyst: "ESPN Analytics",     pick: homeTeam, confidence: "high"   },
    { analyst: "The Action Network", pick: homeTeam, confidence: "medium" },
    { analyst: "Covers.com",         pick: awayTeam, confidence: "low"    },
    { analyst: "VSiN",               pick: homeTeam, confidence: "high"   },
  ]
}
