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

// ─── Signal 1: Market EV — multi-book consensus vs best available price ───────
// Core research finding: Closing Line Value is the gold-standard edge metric.
// We approximate it by comparing vig-removed consensus probability across books
// to the best available market price. Positive EV = model prob beats market price.

function calcMarketEV(input: EdgeInput): { score: number; ev: number; consensusProb: number; reasons: string[] } {
  const reasons: string[] = []
  const team = input.isHome ? input.homeTeam : input.awayTeam
  const opp  = input.isHome ? input.awayTeam : input.homeTeam
  const odds  = input.allOdds ?? []

  const teamPrices = odds.filter(o => o.market_name === "moneyline" && o.team_name === team).map(o => o.price)
  const oppPrices  = odds.filter(o => o.market_name === "moneyline" && o.team_name === opp).map(o => o.price)

  // Vig-removed consensus probability: average across books that have both sides
  const vigFreeProbs: number[] = []
  const bookCount = Math.min(teamPrices.length, oppPrices.length)
  for (let i = 0; i < bookCount; i++) {
    const tImpl = oddsToImpliedProb(teamPrices[i])
    const oImpl = oddsToImpliedProb(oppPrices[i])
    vigFreeProbs.push(tImpl / (tImpl + oImpl)) // remove vig by normalising
  }

  const consensusProb = vigFreeProbs.length > 0
    ? vigFreeProbs.reduce((a, b) => a + b) / vigFreeProbs.length
    : oddsToImpliedProb(input.currentOdds)

  // Best available price across all books (or fall back to current)
  const best = teamPrices.length > 0 ? bestPrice(teamPrices) : input.currentOdds

  // EV on a $100 stake at best available price using consensus probability
  const ev = calcExpectedValue(best, consensusProb)

  // Score: 50 = break-even; +5 per EV dollar (EV of $10 → score 100)
  const score = Math.min(100, Math.max(0, 50 + ev * 5))

  if (ev > 7) {
    reasons.push(`Strong market edge: ${ev.toFixed(1)}% EV above ${vigFreeProbs.length}-book consensus`)
  } else if (ev > 4) {
    reasons.push(`Positive EV: ${ev.toFixed(1)}% vs ${vigFreeProbs.length}-book consensus (${Math.round(consensusProb * 100)}% implied)`)
  } else if (ev > 1) {
    reasons.push(`Marginal value at best available price (${ev.toFixed(1)}% EV)`)
  } else if (ev < -5) {
    reasons.push(`Overpriced: market has ${Math.round(consensusProb * 100)}% implied — no edge here`)
  }

  return { score, ev, consensusProb, reasons }
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

  const marketEV    = calcMarketEV(input)
  const bookDiv     = calcBookDivergence(input)
  const injury      = calcInjuryScore(input)
  const situational = calcSituationalScore(input, stats, marketEV.consensusProb)
  const lineMove    = calcLineMovementScore(input.openingOdds, input.currentOdds, input.isHome)

  // Weight distribution grounded in research hierarchy:
  // CLV/EV is the only durable edge → highest weight
  // Injury data is real and highly predictive
  // Situational spots are research-backed but smaller magnitude
  // Line movement and book divergence are confirming signals
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

  // ── Confirming signal count (required for elite/high) ────────────────────
  // Research: No single signal is sufficient — elite bets require convergence.
  const confirming = [
    bookDiv.score >= 60,         // books disagree → stale price opportunity
    injury.score  >= 63,         // meaningful injury advantage
    situational.score >= 63,     // strong situational spot (bounce-back, home dog, etc.)
    lineMove.score >= 65,        // favorable sharp money indicator
    ev > 3,                      // meaningful EV above consensus
  ].filter(Boolean).length

  // ── Thresholds grounded in research ─────────────────────────────────────
  // Break-even at -110 = 52.4% win rate.
  // Sharp bettors target 55–60% (Trademate, Pinnacle research).
  // Elite: EV > 5% is the CLV threshold for identified sharp accounts.
  // High: EV > 2% is meaningful sustained edge (Trademate sharp threshold).
  // Medium: EV > 0 = positive expectation, worth a small bet.
  // Hard requirement: injury score ≥ 48 for elite (no big injury on our side).

  let confidence: "low" | "medium" | "high" | "elite"
  let recommendation: "pass" | "bet" | "strong_bet"

  if (overallEdge >= 70 && ev > 5 && confirming >= 3 && injury.score >= 48) {
    // Multiple independent signals converge + strong EV + no major injury liability
    confidence     = "elite"
    recommendation = "strong_bet"
  } else if (overallEdge >= 61 && ev > 2 && confirming >= 2) {
    confidence     = "high"
    recommendation = "strong_bet"
  } else if (overallEdge >= 53 && ev > 0) {
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
