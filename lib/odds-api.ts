import axios from "axios"

const BASE_URL = "https://api.the-odds-api.com/v4"
const API_KEY = process.env.THE_ODDS_API_KEY

// Cache odds for 30 minutes — odds don't change that fast and quota is limited
const CACHE_TTL_MS = 30 * 60 * 1000
let cachedGames: Game[] | null = null
let cacheExpiry = 0

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
  const now = Date.now()

  if (!API_KEY) {
    console.warn("THE_ODDS_API_KEY not set — using demo data")
    return getMockGames().filter(g => new Date(g.start_date).getTime() > now)
  }

  // Return cached result if still fresh (saves quota — 3 calls per page load adds up fast)
  if (!sport && cachedGames && now < cacheExpiry) {
    return cachedGames.filter(g => new Date(g.start_date).getTime() > now)
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
    return getMockGames().filter(g => new Date(g.start_date).getTime() > now)
  }

  // Store in cache
  if (!sport) {
    cachedGames = games
    cacheExpiry = now + CACHE_TTL_MS
  }

  return games.filter(g => new Date(g.start_date).getTime() > now)
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
      // NBA Western Conference Finals Game 7 — OKC Thunder vs San Antonio Spurs
      id: "mock-1", sport: "basketball", league: "NBA",
      home_team: "Oklahoma City Thunder", away_team: "San Antonio Spurs", start_date: h(3),
      odds: [
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Oklahoma City Thunder", price: -175 },
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "San Antonio Spurs",     price: 148  },
        { sportsbook: "FanDuel",    market_name: "spreads",   team_name: "Oklahoma City Thunder", price: -110, point: -3.5 },
        { sportsbook: "FanDuel",    market_name: "totals",    team_name: "Over",                  price: -108, point: 214.5 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Oklahoma City Thunder", price: -170 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "San Antonio Spurs",     price: 143  },
        { sportsbook: "BetMGM",     market_name: "moneyline", team_name: "Oklahoma City Thunder", price: -172 },
        { sportsbook: "BetMGM",     market_name: "moneyline", team_name: "San Antonio Spurs",     price: 140  },
      ],
    },
    {
      // 7:15 PM ET: Chicago Cubs @ St. Louis Cardinals
      id: "mock-2", sport: "baseball", league: "MLB",
      home_team: "St. Louis Cardinals", away_team: "Chicago Cubs", start_date: h(2),
      odds: [
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "St. Louis Cardinals", price: -118 },
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Chicago Cubs",         price: -102 },
        { sportsbook: "FanDuel",    market_name: "totals",    team_name: "Over",                 price: -110, point: 8.5 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "St. Louis Cardinals", price: -115 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Chicago Cubs",         price: -105 },
      ],
    },
    {
      // 10:15 PM ET: Philadelphia Phillies @ Los Angeles Dodgers
      id: "mock-3", sport: "baseball", league: "MLB",
      home_team: "Los Angeles Dodgers", away_team: "Philadelphia Phillies", start_date: h(5),
      odds: [
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Los Angeles Dodgers",   price: -148 },
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Philadelphia Phillies", price: 125  },
        { sportsbook: "FanDuel",    market_name: "totals",    team_name: "Over",                  price: -110, point: 8.0 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Los Angeles Dodgers",   price: -145 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Philadelphia Phillies", price: 122  },
        { sportsbook: "BetMGM",     market_name: "moneyline", team_name: "Los Angeles Dodgers",   price: -150 },
        { sportsbook: "BetMGM",     market_name: "moneyline", team_name: "Philadelphia Phillies", price: 126  },
      ],
    },
    {
      // NHL Eastern Conference Finals — Carolina Hurricanes vs Montreal Canadiens (CAR leads 3-1)
      id: "mock-4", sport: "hockey", league: "NHL",
      home_team: "Carolina Hurricanes", away_team: "Montreal Canadiens", start_date: h(4),
      odds: [
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Carolina Hurricanes", price: -195 },
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Montreal Canadiens",  price: 162  },
        { sportsbook: "FanDuel",    market_name: "totals",    team_name: "Over",                price: -112, point: 5.5 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Carolina Hurricanes", price: -188 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Montreal Canadiens",  price: 155  },
        { sportsbook: "BetMGM",     market_name: "moneyline", team_name: "Carolina Hurricanes", price: -192 },
        { sportsbook: "BetMGM",     market_name: "moneyline", team_name: "Montreal Canadiens",  price: 158  },
      ],
    },
    {
      // 8:10 PM ET: Milwaukee Brewers @ Houston Astros
      id: "mock-5", sport: "baseball", league: "MLB",
      home_team: "Houston Astros", away_team: "Milwaukee Brewers", start_date: h(3),
      odds: [
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Houston Astros",    price: -130 },
        { sportsbook: "FanDuel",    market_name: "moneyline", team_name: "Milwaukee Brewers", price: 110  },
        { sportsbook: "FanDuel",    market_name: "totals",    team_name: "Over",              price: -110, point: 8.0 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Houston Astros",    price: -128 },
        { sportsbook: "DraftKings", market_name: "moneyline", team_name: "Milwaukee Brewers", price: 108  },
      ],
    },
  ]
}
