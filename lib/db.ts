import { neon } from "@neondatabase/serverless"

const DATABASE_URL = process.env.DATABASE_URL

export function getDb() {
  if (!DATABASE_URL) throw new Error("DATABASE_URL not set")
  return neon(DATABASE_URL)
}

export async function setupDb() {
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS daily_picks (
      id          TEXT PRIMARY KEY,
      date        DATE NOT NULL,
      game_id     TEXT NOT NULL,
      sport       TEXT NOT NULL,
      league      TEXT NOT NULL,
      home_team   TEXT NOT NULL,
      away_team   TEXT NOT NULL,
      pick_team   TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      edge_score  INTEGER NOT NULL,
      confidence  TEXT NOT NULL,
      odds        INTEGER,
      game_time   TIMESTAMPTZ NOT NULL,
      result      TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS daily_picks_date_idx ON daily_picks(date)
  `
  // Add odds column if upgrading from older schema
  await sql`
    ALTER TABLE daily_picks ADD COLUMN IF NOT EXISTS odds INTEGER
  `.catch(() => {})
}

export async function savePick(pick: {
  id: string
  date: string
  gameId: string
  sport: string
  league: string
  homeTeam: string
  awayTeam: string
  pickTeam: string
  recommendation: string
  edgeScore: number
  confidence: string
  odds?: number
  gameTime: string
}) {
  try {
    const sql = getDb()
    await sql`
      INSERT INTO daily_picks
        (id, date, game_id, sport, league, home_team, away_team, pick_team, recommendation, edge_score, confidence, odds, game_time)
      VALUES
        (${pick.id}, ${pick.date}, ${pick.gameId}, ${pick.sport}, ${pick.league},
         ${pick.homeTeam}, ${pick.awayTeam}, ${pick.pickTeam}, ${pick.recommendation},
         ${pick.edgeScore}, ${pick.confidence}, ${pick.odds ?? null}, ${pick.gameTime})
      ON CONFLICT (id) DO NOTHING
    `
  } catch {
    // Non-fatal — picks tracking shouldn't break the main games endpoint
  }
}

export async function getPicksForDate(date: string) {
  const sql = getDb()
  return sql`SELECT * FROM daily_picks WHERE date = ${date} ORDER BY edge_score DESC`
}

export async function updatePickResult(gameId: string, result: "correct" | "incorrect" | "push") {
  const sql = getDb()
  await sql`UPDATE daily_picks SET result = ${result} WHERE game_id = ${gameId} AND result IS NULL`
}
