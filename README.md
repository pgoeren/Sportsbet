# Dinner Tonight

A gluten-free recipe feed focused on one question: what's for dinner tonight?

## Features

- **Tonight** — a single recipe suggestion for tonight, weighted toward the meals you already
  keep making, with a "Something different" button when you want a fresh option instead.
- **Feed** — a scrollable feed of gluten-free dinner recipes. Star ones you already make to add
  them to your regular rotation, skip ones that aren't for you, or send any recipe straight to
  tonight's pick.
- Everything is gluten-free by default — there's no filter to toggle.
- No account or database — your regulars, skips, and tonight's pick are stored on-device.

## How the rotation works

Recipes in `data/recipes.ts` are tagged `origin: "mine"` (your existing go-to meals) or
`origin: "discover"` (new options to try). Tonight's pick is drawn from your regulars — recipes
tagged `"mine"` plus anything you've starred in the feed — so the app keeps surfacing meals you
already know work, while "Something different" and the feed itself keep new options in view.

Edit `data/recipes.ts` to replace the starter recipes with your own source of gluten-free meals.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- **Next.js** — App Router, TypeScript
- **Tailwind CSS v4** — mobile-first dark theme
- **Radix UI / lucide-react** — accessible UI primitives and icons
- **PWA ready** — installable, works offline for cached pages

## Project structure

```
app/
  page.tsx          # Tonight: today's dinner pick
  feed/page.tsx      # Feed: browse all gluten-free recipes
components/
  RecipeCard.tsx     # Recipe card with keep/skip and expandable details
  BottomNav.tsx       # Tonight / Feed tab navigation
  ui/
    badge.tsx         # Tag badges (gluten-free, regular, new to try)
data/
  recipes.ts          # Recipe data — edit this to add your own meals
lib/
  dinner-store.ts      # Client-side rotation state (localStorage)
  utils.ts              # Shared class-name helper
```

## What's next

This starts intentionally small — tonight's dinner only. Natural next steps would be a
multi-day planner, a grocery list built from the week's picks, or letting you add recipes
through the UI instead of editing `data/recipes.ts` directly.
