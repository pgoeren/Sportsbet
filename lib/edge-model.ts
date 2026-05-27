import { calcExpectedValue, oddsToImpliedProb } from "./utils"

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
  impact: number // 0-10 impact rating
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
  isHome: boolean // evaluating for home team
  currentOdds: number
  openingOdds: number
  sport: string
}

export interface EdgeResult {
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

function calcHistoricalScore(input: EdgeInput): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 50

  const stats = input.isHome ? input.homeStats : input.awayStats
  if (!stats) return { score: 50, reasons: ["No historical data available"] }

  const winPct = stats.wins / (stats.wins + stats.losses)
  score = winPct * 100

  const recentWinPct = stats.last10.wins / 10
  if (recentWinPct > 0.7) {
    score += 10
    reasons.push(`Strong recent form: ${stats.last10.wins}-${stats.last10.losses} last 10`)
  } else if (recentWinPct < 0.3) {
    score -= 10
    reasons.push(`Poor recent form: ${stats.last10.wins}-${stats.last10.losses} last 10`)
  }

  const h2hWinPct = stats.headToHead.wins / Math.max(stats.headToHead.wins + stats.headToHead.losses, 1)
  if (h2hWinPct > 0.6) {
    score += 8
    reasons.push(`Dominates this matchup: ${stats.headToHead.wins}-${stats.headToHead.losses} H2H`)
  } else if (h2hWinPct < 0.4) {
    score -= 8
    reasons.push(`Struggles vs this opponent: ${stats.headToHead.wins}-${stats.headToHead.losses} H2H`)
  }

  return { score: Math.min(100, Math.max(0, score)), reasons }
}

function calcInjuryScore(input: EdgeInput): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 50

  const injuries = input.injuries ?? []
  const team = input.isHome ? input.homeTeam : input.awayTeam
  const oppTeam = input.isHome ? input.awayTeam : input.homeTeam

  const teamInjuries = injuries.filter(i => i.team === team)
  const oppInjuries = injuries.filter(i => i.team === oppTeam)

  let teamImpact = 0
  for (const inj of teamInjuries) {
    const multiplier = inj.status === "out" ? 1 : inj.status === "doubtful" ? 0.7 : inj.status === "questionable" ? 0.4 : 0.1
    teamImpact += inj.impact * multiplier
  }

  let oppImpact = 0
  for (const inj of oppInjuries) {
    const multiplier = inj.status === "out" ? 1 : inj.status === "doubtful" ? 0.7 : inj.status === "questionable" ? 0.4 : 0.1
    oppImpact += inj.impact * multiplier
  }

  score = 50 + (oppImpact - teamImpact) * 3

  if (teamImpact > 15) {
    reasons.push(`Significant injury concerns (impact: ${teamImpact.toFixed(0)})`)
  } else if (teamImpact === 0) {
    reasons.push("Full strength lineup")
  }

  if (oppImpact > 15) {
    reasons.push(`Opponent dealing with injuries (impact: ${oppImpact.toFixed(0)})`)
  }

  return { score: Math.min(100, Math.max(0, score)), reasons }
}

function calcAnalystScore(input: EdgeInput): { score: number; reasons: string[] } {
  const reasons: string[] = []
  const picks = input.analystPicks ?? []
  const team = input.isHome ? input.homeTeam : input.awayTeam

  if (picks.length === 0) return { score: 50, reasons: ["No analyst data"] }

  let weightedScore = 0
  let totalWeight = 0

  for (const pick of picks) {
    const weight = pick.confidence === "high" ? 3 : pick.confidence === "medium" ? 2 : 1
    const isForTeam = pick.pick === team
    weightedScore += isForTeam ? weight : -weight
    totalWeight += weight
  }

  const normalized = ((weightedScore / totalWeight) + 1) / 2 * 100
  const agreePct = picks.filter(p => p.pick === team).length / picks.length

  if (agreePct > 0.7) {
    reasons.push(`Strong analyst consensus: ${Math.round(agreePct * 100)}% picking this team`)
  } else if (agreePct < 0.3) {
    reasons.push(`Analysts fading this team: only ${Math.round(agreePct * 100)}% picking them`)
  }

  return { score: Math.min(100, Math.max(0, normalized)), reasons }
}

function calcHomeAwayScore(input: EdgeInput): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 50

  const stats = input.isHome ? input.homeStats : input.awayStats
  if (!stats) return { score: 50, reasons: [] }

  if (input.isHome) {
    const homeWinPct = stats.homeWins / Math.max(stats.homeWins + stats.homeLosses, 1)
    score = homeWinPct * 100
    if (homeWinPct > 0.65) reasons.push(`Strong home record: ${stats.homeWins}-${stats.homeLosses}`)
    else if (homeWinPct < 0.4) reasons.push(`Weak home record: ${stats.homeWins}-${stats.homeLosses}`)
  } else {
    const awayWinPct = stats.awayWins / Math.max(stats.awayWins + stats.awayLosses, 1)
    score = awayWinPct * 100
    if (awayWinPct > 0.55) reasons.push(`Travels well: ${stats.awayWins}-${stats.awayLosses} away`)
    else if (awayWinPct < 0.35) reasons.push(`Struggles on road: ${stats.awayWins}-${stats.awayLosses} away`)
  }

  return { score: Math.min(100, Math.max(0, score)), reasons }
}

function calcLineMovementScore(opening: number, current: number, isHome: boolean): { score: number; reasons: string[] } {
  const reasons: string[] = []
  const movement = current - opening

  let score = 50

  // Sharp money moves lines toward the value side
  if (Math.abs(movement) > 10) {
    if (movement < 0 && isHome) {
      // Line moving toward home = sharp money on home
      score = 70
      reasons.push(`Sharp action: line moved ${Math.abs(movement)} points toward this team`)
    } else if (movement > 0 && !isHome) {
      score = 70
      reasons.push(`Sharp action: line moved ${Math.abs(movement)} points toward this team`)
    } else {
      score = 35
      reasons.push(`Public fading: line moved ${Math.abs(movement)} points away from this team`)
    }
  } else {
    reasons.push("Stable line, no significant movement")
  }

  return { score, reasons }
}

export function calculateEdge(input: EdgeInput): EdgeResult {
  const historical = calcHistoricalScore(input)
  const injury = calcInjuryScore(input)
  const analyst = calcAnalystScore(input)
  const homeAway = calcHomeAwayScore(input)
  const lineMovement = calcLineMovementScore(input.openingOdds, input.currentOdds, input.isHome)

  // Weighted average
  const weights = {
    historical: 0.30,
    injury: 0.20,
    analyst: 0.20,
    homeAway: 0.15,
    lineMovement: 0.15,
  }

  const weightedScore =
    historical.score * weights.historical +
    injury.score * weights.injury +
    analyst.score * weights.analyst +
    homeAway.score * weights.homeAway +
    lineMovement.score * weights.lineMovement

  // Expected value calculation
  const impliedProb = oddsToImpliedProb(input.currentOdds)
  void impliedProb // used for context, model prob drives EV
  const modelProb = weightedScore / 100
  const ev = calcExpectedValue(input.currentOdds, modelProb)
  const evScore = Math.min(100, Math.max(0, 50 + ev))

  const overallEdge = weightedScore * 0.8 + evScore * 0.2

  let confidence: "low" | "medium" | "high" | "elite"
  let recommendation: "pass" | "bet" | "strong_bet"

  if (overallEdge >= 72) {
    confidence = "elite"
    recommendation = "strong_bet"
  } else if (overallEdge >= 60) {
    confidence = "high"
    recommendation = "bet"
  } else if (overallEdge >= 48) {
    confidence = "medium"
    recommendation = ev > 0 ? "bet" : "pass"
  } else {
    confidence = "low"
    recommendation = "pass"
  }

  return {
    historicalScore: Math.round(historical.score),
    injuryScore: Math.round(injury.score),
    analystScore: Math.round(analyst.score),
    homeAwayScore: Math.round(homeAway.score),
    lineMovementScore: Math.round(lineMovement.score),
    expectedValue: Math.round(ev * 100) / 100,
    overallEdge: Math.round(overallEdge),
    confidence,
    recommendation,
    reasoning: [
      ...historical.reasons,
      ...injury.reasons,
      ...analyst.reasons,
      ...homeAway.reasons,
      ...lineMovement.reasons,
    ].filter(Boolean),
  }
}

// Generate mock stats for demo
export function getMockStats(team: string, seed: number): TeamStats {
  let s = seed
  const rand = (min: number, max: number) => {
    const x = Math.sin(s++) * 10000
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min
  }
  void team // used for seeding via caller
  const wins = rand(20, 55)
  const losses = rand(15, 45)
  const homeWins = rand(10, 30)
  const homeLosses = rand(5, 20)
  return {
    wins,
    losses,
    homeWins,
    homeLosses,
    awayWins: wins - homeWins,
    awayLosses: losses - homeLosses,
    last10: { wins: rand(3, 8), losses: rand(2, 7) },
    pointsPerGame: rand(95, 125),
    pointsAllowedPerGame: rand(95, 125),
    headToHead: { wins: rand(1, 5), losses: rand(1, 5) },
  }
}

export function getMockInjuries(homeTeam: string, awayTeam: string): InjuryReport[] {
  return [
    { team: homeTeam, player: "Key Player", position: "PG", status: "questionable", impact: 6 },
    { team: awayTeam, player: "Star Forward", position: "SF", status: "out", impact: 9 },
  ]
}

export function getMockAnalystPicks(homeTeam: string, awayTeam: string): AnalystPick[] {
  return [
    { analyst: "ESPN Analytics", pick: homeTeam, confidence: "high" },
    { analyst: "The Action Network", pick: homeTeam, confidence: "medium" },
    { analyst: "Covers.com", pick: awayTeam, confidence: "low" },
    { analyst: "VSiN", pick: homeTeam, confidence: "high" },
  ]
}
