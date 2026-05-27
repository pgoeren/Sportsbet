import axios from "axios"

const BASE_URL = "https://api.oddsjam.com/api/v2"
const API_KEY = process.env.ODDSJAM_API_KEY

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "x-api-key": API_KEY },
  timeout: 10000,
})

export interface OddsJamGame {
  id: string
  sport: string
  league: string
  home_team: string
  away_team: string
  start_date: string
  odds: OddsJamOdd[]
}

export interface OddsJamOdd {
  sportsbook: string
  market_name: string
  team_name: string
  price: number
  point?: number
}

export async function fetchUpcomingGames(sport?: string, league?: string): Promise<OddsJamGame[]> {
  try {
    const params: Record<string, string> = {}
    if (sport) params.sport = sport
    if (league) params.league = league

    const res = await client.get("/games/upcoming", { params })
    return res.data?.data ?? []
  } catch (err) {
    console.error("OddsJam fetch error:", err)
    // Return mock data when API key not configured
    return getMockGames()
  }
}

export async function fetchGameOdds(gameId: string): Promise<OddsJamOdd[]> {
  try {
    const res = await client.get(`/odds`, { params: { game_id: gameId } })
    return res.data?.data ?? []
  } catch (err) {
    console.error("OddsJam odds fetch error:", err)
    return []
  }
}

export async function fetchLineMovement(gameId: string): Promise<{ time: string; odds: number }[]> {
  try {
    const res = await client.get(`/line-movement`, { params: { game_id: gameId } })
    return res.data?.data ?? []
  } catch {
    return []
  }
}

// Mock data for development/demo when API key not configured
function getMockGames(): OddsJamGame[] {
  const now = new Date()
  return [
    {
      id: "mock-1",
      sport: "basketball",
      league: "NBA",
      home_team: "Boston Celtics",
      away_team: "Miami Heat",
      start_date: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      odds: [
        { sportsbook: "FanDuel", market_name: "moneyline", team_name: "Boston Celtics", price: -165 },
        { sportsbook: "FanDuel", market_name: "moneyline", team_name: "Miami Heat", price: +140 },
        { sportsbook: "FanDuel", market_name: "spreads", team_name: "Boston Celtics", price: -110, point: -3.5 },
        { sportsbook: "FanDuel", market_name: "totals", team_name: "Over", price: -108, point: 218.5 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Boston Celtics", price: -160 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Miami Heat", price: +135 },
      ]
    },
    {
      id: "mock-2",
      sport: "football",
      league: "NFL",
      home_team: "Kansas City Chiefs",
      away_team: "Buffalo Bills",
      start_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      odds: [
        { sportsbook: "FanDuel", market_name: "moneyline", team_name: "Kansas City Chiefs", price: -140 },
        { sportsbook: "FanDuel", market_name: "moneyline", team_name: "Buffalo Bills", price: +118 },
        { sportsbook: "FanDuel", market_name: "spreads", team_name: "Kansas City Chiefs", price: -110, point: -2.5 },
        { sportsbook: "FanDuel", market_name: "totals", team_name: "Over", price: -112, point: 47.5 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Kansas City Chiefs", price: -145 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Buffalo Bills", price: +122 },
      ]
    },
    {
      id: "mock-3",
      sport: "baseball",
      league: "MLB",
      home_team: "New York Yankees",
      away_team: "Los Angeles Dodgers",
      start_date: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
      odds: [
        { sportsbook: "FanDuel", market_name: "moneyline", team_name: "New York Yankees", price: +115 },
        { sportsbook: "FanDuel", market_name: "moneyline", team_name: "Los Angeles Dodgers", price: -135 },
        { sportsbook: "FanDuel", market_name: "totals", team_name: "Over", price: -110, point: 8.5 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "New York Yankees", price: +112 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Los Angeles Dodgers", price: -132 },
      ]
    },
    {
      id: "mock-4",
      sport: "basketball",
      league: "NBA",
      home_team: "Golden State Warriors",
      away_team: "Los Angeles Lakers",
      start_date: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(),
      odds: [
        { sportsbook: "FanDuel", market_name: "moneyline", team_name: "Golden State Warriors", price: -190 },
        { sportsbook: "FanDuel", market_name: "moneyline", team_name: "Los Angeles Lakers", price: +160 },
        { sportsbook: "FanDuel", market_name: "spreads", team_name: "Golden State Warriors", price: -112, point: -4.5 },
        { sportsbook: "FanDuel", market_name: "totals", team_name: "Over", price: -115, point: 225.5 },
        { sportsbook: "BetMGM", market_name: "moneyline", team_name: "Golden State Warriors", price: -185 },
        { sportsbook: "BetMGM", market_name: "moneyline", team_name: "Los Angeles Lakers", price: +155 },
      ]
    },
    {
      id: "mock-5",
      sport: "hockey",
      league: "NHL",
      home_team: "Colorado Avalanche",
      away_team: "Edmonton Oilers",
      start_date: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(),
      odds: [
        { sportsbook: "FanDuel", market_name: "moneyline", team_name: "Colorado Avalanche", price: +105 },
        { sportsbook: "FanDuel", market_name: "moneyline", team_name: "Edmonton Oilers", price: -125 },
        { sportsbook: "FanDuel", market_name: "totals", team_name: "Over", price: -118, point: 6.0 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Colorado Avalanche", price: +108 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Edmonton Oilers", price: -128 },
      ]
    }
  ]
}
