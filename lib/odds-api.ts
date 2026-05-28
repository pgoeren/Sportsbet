import axios from "axios"

const BASE_URL = "https://api.the-odds-api.com/v4"
const API_KEY = process.env.THE_ODDS_API_KEY

// The Odds API sport keys → our internal labels
const SPORT_MAP: Record<string, { sport: string; league: string; months: number[] }> = {
  basketball_nba:         { sport: "basketball", league: "NBA",   months: [10,11,12,1,2,3,4,5,6] },
  americanfootball_nfl:   { sport: "football",   league: "NFL",   months: [9,10,11,12,1,2] },
  baseball_mlb:           { sport: "baseball",   league: "MLB",   months: [4,5,6,7,8,9,10] },
  icehockey_nhl:          { sport: "hockey",     league: "NHL",   months: [10,11,12,1,2,3,4,5,6] },
  basketball_ncaab:       { sport: "basketball", league: "NCAAB", months: [11,12,1,2,3,4] },
  americanfootball_ncaaf: { sport: "football",   league: "NCAAF", months: [8,9,10,11,12,1] },
}

function activeSeasonKeys(): string[] {
  const month = new Date().getMonth() + 1
  return Object.entries(SPORT_MAP)
    .filter(([, v]) => v.months.includes(month))
    .map(([k]) => k)
}

// Our internal shared game format (same shape the UI already expects)
export interface Game {
  id: string
  sport: string
  league: string
  home_team: string
  away_team: string
  start_date: string
  odds: GameOdd[]
}

export interface GameOdd {
  sportsbook: string
  market_name: string  // "moneyline" | "spreads" | "totals"
  team_name: string
  price: number
  point?: number
}

export async function fetchUpcomingGames(sport?: string): Promise<Game[]> {
  if (!API_KEY) {
    console.warn("THE_ODDS_API_KEY not set — using demo data")
    const now = Date.now()
    return getMockGames().filter(g => new Date(g.start_date).getTime() > now)
  }

  const sportKeys = sport
    ? Object.entries(SPORT_MAP).filter(([, v]) => v.sport === sport).map(([k]) => k)
    : activeSeasonKeys()

  const results = await Promise.allSettled(
    sportKeys.map(key => fetchOddsForSport(key))
  )

  const games = results
    .filter((r): r is PromiseFulfilledResult<Game[]> => r.status === "fulfilled")
    .flatMap(r => r.value)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

  // If real API returned nothing (quota exceeded, invalid key, no games), fall back to demo data
  if (games.length === 0) {
    console.warn("Odds API returned no games — falling back to demo data")
    const now = Date.now()
    return getMockGames().filter(g => new Date(g.start_date).getTime() > now)
  }

  return games
}

async function fetchOddsForSport(sportKey: string): Promise<Game[]> {
  const res = await axios.get(`${BASE_URL}/sports/${sportKey}/odds`, {
    params: {
      apiKey: API_KEY,
      regions: "us",
      markets: "h2h,spreads,totals",
      oddsFormat: "american",
      bookmakers: "fanduel,draftkings,betmgm,caesars,pointsbet",
    },
    timeout: 10000,
  })

  const meta = SPORT_MAP[sportKey]
  const now = Date.now()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data ?? [])
    .filter((g: any) => new Date(g.commence_time).getTime() > now)
    .map((g: any) => normalizeGame(g, meta))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeGame(raw: any, meta: { sport: string; league: string }): Game {
  const odds: GameOdd[] = []

  for (const bookmaker of raw.bookmakers ?? []) {
    const book = bookmaker.title as string
    for (const market of bookmaker.markets ?? []) {
      const marketName = market.key === "h2h" ? "moneyline"
        : market.key === "spreads" ? "spreads"
        : market.key === "totals" ? "totals"
        : market.key

      for (const outcome of market.outcomes ?? []) {
        odds.push({
          sportsbook: book,
          market_name: marketName,
          team_name: outcome.name,
          price: outcome.price,
          point: outcome.point,
        })
      }
    }
  }

  return {
    id: raw.id,
    sport: meta.sport,
    league: meta.league,
    home_team: raw.home_team,
    away_team: raw.away_team,
    start_date: raw.commence_time,
    odds,
  }
}

function getMockGames(): Game[] {
  const now = new Date()
  const h = (ms: number) => new Date(now.getTime() + ms * 60 * 60 * 1000).toISOString()

  return [
    {
      id: "mock-1", sport: "basketball", league: "NBA",
      home_team: "Boston Celtics", away_team: "Miami Heat", start_date: h(3),
      odds: [
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Boston Celtics", price: -165 },
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Miami Heat",     price: 140  },
        { sportsbook: "FanDuel",    market_name: "spreads",   team_name: "Boston Celtics", price: -110, point: -3.5 },
        { sportsbook: "FanDuel",    market_name: "totals",    team_name: "Over",           price: -108, point: 218.5 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Boston Celtics", price: -160 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Miami Heat",     price: 135  },
      ],
    },
    {
      id: "mock-2", sport: "baseball", league: "MLB",
      home_team: "Chicago Cubs", away_team: "Atlanta Braves", start_date: h(5),
      odds: [
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Chicago Cubs",    price: 105  },
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Atlanta Braves",  price: -125 },
        { sportsbook: "FanDuel",    market_name: "totals",    team_name: "Over",            price: -110, point: 8.0 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Chicago Cubs",    price: 108  },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Atlanta Braves",  price: -128 },
      ],
    },
    {
      id: "mock-3", sport: "baseball", league: "MLB",
      home_team: "New York Yankees", away_team: "Los Angeles Dodgers", start_date: h(6),
      odds: [
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "New York Yankees",     price: 115  },
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Los Angeles Dodgers",  price: -135 },
        { sportsbook: "FanDuel",    market_name: "totals",    team_name: "Over",                 price: -110, point: 8.5 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "New York Yankees",     price: 112  },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Los Angeles Dodgers",  price: -132 },
      ],
    },
    {
      id: "mock-4", sport: "basketball", league: "NBA",
      home_team: "Golden State Warriors", away_team: "Los Angeles Lakers", start_date: h(8),
      odds: [
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Golden State Warriors", price: -190 },
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Los Angeles Lakers",    price: 160  },
        { sportsbook: "FanDuel",    market_name: "spreads",   team_name: "Golden State Warriors", price: -112, point: -4.5 },
        { sportsbook: "FanDuel",    market_name: "totals",    team_name: "Over",                  price: -115, point: 225.5 },
        { sportsbook: "BetMGM",     market_name: "moneyline", team_name: "Golden State Warriors", price: -185 },
        { sportsbook: "BetMGM",     market_name: "moneyline", team_name: "Los Angeles Lakers",    price: 155  },
      ],
    },
    {
      id: "mock-5", sport: "hockey", league: "NHL",
      home_team: "Colorado Avalanche", away_team: "Edmonton Oilers", start_date: h(5),
      odds: [
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Colorado Avalanche", price: 105  },
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Edmonton Oilers",   price: -125 },
        { sportsbook: "FanDuel",    market_name: "totals",    team_name: "Over",              price: -118, point: 6.0 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Colorado Avalanche", price: 108  },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Edmonton Oilers",   price: -128 },
      ],
    },
  ]
}
