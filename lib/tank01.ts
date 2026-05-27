import axios from "axios"
import type { InjuryReport } from "./edge-model"

const API_KEY = process.env.TANK01_API_KEY
const BASE = "https://tank01-fantasy-stats.p.rapidapi.com"

const headers = {
  "X-RapidAPI-Key": API_KEY ?? "",
  "X-RapidAPI-Host": "tank01-fantasy-stats.p.rapidapi.com",
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

export async function fetchInjuries(sport: string, homeTeam: string, awayTeam: string): Promise<InjuryReport[]> {
  if (!API_KEY) return getMockInjuries(homeTeam, awayTeam)

  try {
    const endpoint = getEndpoint(sport)
    if (!endpoint) return getMockInjuries(homeTeam, awayTeam)

    const res = await axios.get(`${BASE}${endpoint}`, { headers, timeout: 8000 })
    const raw = res.data?.body ?? res.data ?? []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Array.isArray(raw) ? raw : Object.values(raw)).flatMap((player: any) => {
      const team = player.team ?? player.teamAbv ?? ""
      const pos  = player.pos ?? player.position ?? "?"
      const name = player.longName ?? player.playerName ?? player.name ?? "Unknown"
      const injStatus = player.injStatus ?? player.injury_status ?? player.status ?? "questionable"

      if (![homeTeam, awayTeam].some(t =>
        t.toLowerCase().includes(team.toLowerCase()) ||
        team.toLowerCase().includes(t.split(" ").pop()!.toLowerCase())
      )) return []

      return [{
        team:    [homeTeam, awayTeam].find(t =>
          t.toLowerCase().includes(team.toLowerCase()) ||
          team.toLowerCase().includes(t.split(" ").pop()!.toLowerCase())
        ) ?? team,
        player:   name,
        position: pos,
        status:   normalizeStatus(injStatus),
        impact:   getImpact(pos),
      }]
    }) as InjuryReport[]
  } catch (err) {
    console.error("Tank01 injury fetch error:", err)
    return getMockInjuries(homeTeam, awayTeam)
  }
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

function getMockInjuries(homeTeam: string, awayTeam: string): InjuryReport[] {
  return [
    { team: homeTeam, player: "Key Starter",   position: "PG", status: "questionable", impact: 7 },
    { team: awayTeam, player: "Star Player",   position: "SF", status: "out",          impact: 9 },
    { team: awayTeam, player: "Backup Guard",  position: "SG", status: "probable",     impact: 4 },
  ]
}
