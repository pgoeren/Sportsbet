"use client"

import { useCallback, useEffect, useState } from "react"
import { recipes, type Recipe } from "@/data/recipes"

const KEEPERS_KEY = "gf-dinner:keepers"
const SKIPPED_KEY = "gf-dinner:skipped"
const TONIGHT_KEY = "gf-dinner:tonight"

interface TonightPick {
  date: string
  recipeId: string
}

interface Hydrated {
  keepers: Set<string>
  skipped: Set<string>
  tonight: TonightPick | null
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function readIds(key: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(key)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function writeIds(key: string, ids: Set<string>) {
  window.localStorage.setItem(key, JSON.stringify([...ids]))
}

function readTonight(): TonightPick | null {
  try {
    const raw = window.localStorage.getItem(TONIGHT_KEY)
    return raw ? (JSON.parse(raw) as TonightPick) : null
  } catch {
    return null
  }
}

function writeTonight(pick: TonightPick) {
  window.localStorage.setItem(TONIGHT_KEY, JSON.stringify(pick))
}

function pickRandom(pool: Recipe[], exclude?: string): Recipe | undefined {
  const options = exclude ? pool.filter((r) => r.id !== exclude) : pool
  const from = options.length ? options : pool
  if (!from.length) return undefined
  return from[Math.floor(Math.random() * from.length)]
}

export function useDinnerStore() {
  // null until the one-time localStorage read on mount completes; this hook only
  // ever runs client-side, so there is no SSR value to keep in sync with.
  const [hydrated, setHydrated] = useState<Hydrated | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of localStorage on mount, not state kept in sync with an external source
    setHydrated({
      keepers: readIds(KEEPERS_KEY),
      skipped: readIds(SKIPPED_KEY),
      tonight: readTonight(),
    })
  }, [])

  const ready = hydrated !== null
  const keepers = hydrated?.keepers ?? new Set<string>()
  const skipped = hydrated?.skipped ?? new Set<string>()
  const tonight = hydrated?.tonight ?? null

  const available = recipes.filter((r) => !skipped.has(r.id))
  const rotation = available.filter((r) => r.origin === "mine" || keepers.has(r.id))

  const choosePick = useCallback(
    (excludeId?: string): Recipe | undefined => {
      // Prefer the established rotation so tonight favors meals you already keep making.
      const pool = rotation.length ? rotation : available
      return pickRandom(pool, excludeId)
    },
    [rotation, available]
  )

  // Once hydrated, make sure today has a pick (assigns one on first visit of the day).
  useEffect(() => {
    if (!ready) return
    const key = todayKey()
    if (tonight?.date === key) return
    const choice = choosePick()
    if (!choice) return
    const next = { date: key, recipeId: choice.id }
    writeTonight(next)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- assigns today's pick only when missing, guarded above
    setHydrated((prev) => (prev ? { ...prev, tonight: next } : prev))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tonight])

  const reroll = useCallback(() => {
    const choice = choosePick(tonight?.recipeId)
    if (!choice) return
    const next = { date: todayKey(), recipeId: choice.id }
    writeTonight(next)
    setHydrated((prev) => (prev ? { ...prev, tonight: next } : prev))
  }, [choosePick, tonight])

  const setTonightTo = useCallback((recipeId: string) => {
    const next = { date: todayKey(), recipeId }
    writeTonight(next)
    setHydrated((prev) => (prev ? { ...prev, tonight: next } : prev))
  }, [])

  const toggleKeeper = useCallback((recipeId: string) => {
    setHydrated((prev) => {
      if (!prev) return prev
      const next = new Set(prev.keepers)
      if (next.has(recipeId)) next.delete(recipeId)
      else next.add(recipeId)
      writeIds(KEEPERS_KEY, next)
      return { ...prev, keepers: next }
    })
  }, [])

  const toggleSkip = useCallback((recipeId: string) => {
    setHydrated((prev) => {
      if (!prev) return prev
      const next = new Set(prev.skipped)
      if (next.has(recipeId)) next.delete(recipeId)
      else next.add(recipeId)
      writeIds(SKIPPED_KEY, next)
      return { ...prev, skipped: next }
    })
  }, [])

  const tonightRecipe = tonight
    ? recipes.find((r) => r.id === tonight.recipeId)
    : undefined

  return {
    ready,
    recipes: available,
    keepers,
    skipped,
    tonightRecipe,
    reroll,
    setTonightTo,
    toggleKeeper,
    toggleSkip,
    isKeeper: (r: Recipe) => r.origin === "mine" || keepers.has(r.id),
  }
}
