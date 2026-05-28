import axios from "axios"
import type { InjuryReport } from "./edge-model"

const API_KEY = process.env.TANK01_API_KEY
const BASE = "https://tank01-fantasy-stats.p.rapidapi.com"

const headers = {
  "X-RapidAPI-Key": API_KEY ?? "",
  "X-RapidAPI-Host": "tank01-fantasy-stats.p.rapidapi.com",
}

// Cache the full injury list per sport for 30 minutes.
// Without this, every game triggers a separate API call — 5 games = 5 calls per load.
// With this, each sport is fetched once and filtered locally for each matchup.
const CACHE_TTL_MS = 30 * 60 * 1000
const sportCache = new Map<string, { data: RawPlayer[]; expiry: number }>()

interface RawPlayer {
  team: string
  player: string
  position: string
  status: InjuryReport["status"]
  impact: number
}

// Position impact weights — how much losing this position hurts
const POSITION_IMPACT: Record<string, number> = {
  // NBA
  PG: 8, SG: 7, SF: 7, PF: 6, C: 6,
  // NFL
  QB: 10, RB: 7, WR: 7, TE: 6, OT: 5, DE: 5, LB: 5, CB: 5, S: 4, K: 3,
  // MLB (use "CAT" to avoid duplicate C key)
  SP: 9, RP: 5, CAT: 6, "1B": 5, "2B": 5, "3B": 5, SS: 6, LF: 5, CF: 6, RF: 5, DH: 5,
  // NHL
  G: 9, D: 6, LW: 6, RW: 6,
}

function getImpact(position: string): number {
  return POSITION_IMPACT[position.toUpperCase()] ?? 5
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeStatus(raw: string): InjuryReport["status"] {
  const s = raw.toLowerCase()
  if (s.includes("out"))          return "out"
  if (s.includes("doubtful"))     return "doubtful"
  if (s.includes("questionable")) return "questionable"
  return "probable"
}

function getEndpoint(sport: string): string | null {
  switch (sport.toLowerCase()) {
    case "basketball": return "/getNBAInjuryList"
    case "football":   return "/getNFLInjuries"
    case "baseball":   return "/getMLBInjuryList"
    case "hockey":     return "/getNHLInjuryList"
    default:           return null
  }
}

// Fetch (and cache) the full league-wide injury list for a sport.
// Returns normalized players for the whole league — callers filter by team.
async function fetchLeagueInjuries(sport: string): Promise<RawPlayer[]> {
  const endpoint = getEndpoint(sport)
  if (!endpoint) return []

  const now = Date.now()
  const cached = sportCache.get(sport)
  if (cached && now < cached.expiry) return cached.data

  const res = await axios.get(`${BASE}${endpoint}`, { headers, timeout: 8000 })
  const raw = res.data?.body ?? res.data ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const players: RawPlayer[] = (Array.isArray(raw) ? raw : Object.values(raw)).map((p: any) => ({
    team:     p.team ?? p.teamAbv ?? "",
    player:   p.longName ?? p.playerName ?? p.name ?? "Unknown",
    position: p.pos ?? p.position ?? "?",
    status:   normalizeStatus(p.injStatus ?? p.injury_status ?? p.status ?? "questionable"),
    impact:   getImpact(p.pos ?? p.position ?? "?"),
  }))

  sportCache.set(sport, { data: players, expiry: now + CACHE_TTL_MS })
  return players
}

export async function fetchInjuries(sport: string, homeTeam: string, awayTeam: string): Promise<InjuryReport[]> {
  if (!API_KEY) return getMockInjuries(homeTeam, awayTeam)

  try {
    const all = await fetchLeagueInjuries(sport)
    if (all.length === 0) return getMockInjuries(homeTeam, awayTeam)

    return all
      .filter(p => [homeTeam, awayTeam].some(t =>
        t.toLowerCase().includes(p.team.toLowerCase()) ||
        p.team.toLowerCase().includes(t.split(" ").pop()!.toLowerCase())
      ))
      .map(p => ({
        team: [homeTeam, awayTeam].find(t =>
          t.toLowerCase().includes(p.team.toLowerCase()) ||
          p.team.toLowerCase().includes(t.split(" ").pop()!.toLowerCase())
        ) ?? p.team,
        player:   p.player,
        position: p.position,
        status:   p.status,
        impact:   p.impact,
      }))
  } catch (err) {
    console.error("Tank01 injury fetch error:", err)
    return getMockInjuries(homeTeam, awayTeam)
  }
}

function getMockInjuries(homeTeam: string, awayTeam: string): InjuryReport[] {
  return [
    { team: homeTeam, player: "Key Starter",  position: "PG", status: "questionable", impact: 7 },
    { team: awayTeam, player: "Star Player",  position: "SF", status: "out",          impact: 9 },
    { team: awayTeam, player: "Backup Guard", position: "SG", status: "probable",     impact: 4 },
  ]
}
