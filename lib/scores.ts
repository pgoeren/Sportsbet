import axios from "axios"

const API_KEY = process.env.THE_ODDS_API_KEY
const BASE_URL = "https://api.the-odds-api.com/v4"

const SPORT_KEYS = [
  "basketball_nba",
  "americanfootball_nfl",
  "baseball_mlb",
  "icehockey_nhl",
]

export interface GameResult {
  id: string
  sport: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  winner: string
  completed: boolean
}

export async function fetchYesterdayResults(): Promise<GameResult[]> {
  if (!API_KEY) return []

  const results = await Promise.allSettled(
    SPORT_KEYS.map(sport =>
      axios.get(`${BASE_URL}/sports/${sport}/scores`, {
        params: { apiKey: API_KEY, daysFrom: 1 },
        timeout: 8000,
      })
    )
  )

  return results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .flatMap(r => r.value.data ?? [])
    .filter((g: any) => g.completed)
    .map((g: any) => {
      const homeScore = g.scores?.find((s: any) => s.name === g.home_team)?.score ?? 0
      const awayScore = g.scores?.find((s: any) => s.name === g.away_team)?.score ?? 0
      const winner = homeScore > awayScore ? g.home_team : awayScore > homeScore ? g.away_team : "push"
      return {
        id: g.id,
        sport: g.sport_key,
        homeTeam: g.home_team,
        awayTeam: g.away_team,
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        winner,
        completed: true,
      }
    })
}
