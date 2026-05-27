# BetEdge - Smart Sports Betting

A mobile-first sports betting recommendation and tracker app built with Next.js 15, Prisma, and Tailwind CSS. Features an edge model that scores betting opportunities based on historical performance, injuries, analyst consensus, home/away splits, and line movement.

## Features

- **Edge Model**: Composite scoring system (0-100) weighing historical data, injuries, analyst picks, home/away performance, and line movement
- **Game Browser**: View upcoming games across NBA, NFL, MLB, NHL with real-time odds
- **Top Picks**: Filtered view of Strong Bet / Bet / Pass recommendations
- **Bet Tracker**: Log and settle bets, track P&L
- **Analytics**: ROI, win rate, and per-sport performance breakdown
- **PWA Ready**: Installable mobile app with dark theme
- **OddsJam Integration**: Live odds via OddsJam API with mock data fallback

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `ODDSJAM_API_KEY` | OddsJam API key from https://oddsjam.com/api — app works without it using mock data |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_NAME` | App display name (default: BetEdge) |

### 3. Database setup

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Without a database

The app works fully in demo mode without a database — the games page and picks page use mock data automatically. Bet tracking (Tracker/Analytics pages) requires PostgreSQL.

## Stack

- **Next.js 15** — App Router, TypeScript, Server Components
- **Tailwind CSS v4** — Mobile-first dark theme
- **Prisma ORM** — PostgreSQL database
- **OddsJam API** — Live sports odds
- **Radix UI** — Accessible headless components
- **date-fns** — Date formatting
- **lucide-react** — Icons

## Project Structure

```
app/
  page.tsx          # Home: game browser with edge scores
  picks/page.tsx    # Top picks ranked by edge
  tracker/page.tsx  # Bet tracker with P&L
  analytics/page.tsx # Performance analytics
  api/
    games/route.ts  # Fetch games + calculate edge scores
    bets/route.ts   # CRUD for tracked bets
    bets/[id]/route.ts # Update/delete individual bets
components/
  GameCard.tsx       # Game card with expandable analysis
  EdgeScoreCard.tsx  # Edge breakdown visualization
  BetModal.tsx       # Bottom-sheet bet entry
  BottomNav.tsx      # Mobile tab navigation
  ui/
    badge.tsx        # Confidence/recommendation badges
    progress.tsx     # Score progress bars
lib/
  edge-model.ts      # Edge scoring algorithm
  oddsjam.ts         # OddsJam API client + mock data
  prisma.ts          # Prisma client singleton
  utils.ts           # Odds formatting, EV calculation
prisma/
  schema.prisma      # Database schema
```

## Edge Model

Scores are weighted composites (0-100):

| Factor | Weight | Description |
|---|---|---|
| Historical | 30% | Win %, recent form, H2H record |
| Injuries | 20% | Impact-weighted injury adjustments |
| Analyst Consensus | 20% | Weighted analyst pick agreement |
| Home/Away | 15% | Home/away split performance |
| Line Movement | 15% | Sharp money detection |

Thresholds: Elite (72+), High (60+), Medium (48+), Low (<48)
