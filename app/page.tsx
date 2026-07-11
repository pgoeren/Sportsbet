"use client"

import { Shuffle } from "lucide-react"
import { RecipeCard } from "@/components/RecipeCard"
import { useDinnerStore } from "@/lib/dinner-store"

export default function TonightPage() {
  const { ready, tonightRecipe, keepers, reroll, toggleKeeper, toggleSkip, isKeeper } =
    useDinnerStore()

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="px-4 pt-6">
      <p className="text-sm text-fd-muted">{today}</p>
      <h1 className="text-2xl font-bold text-fd-text mt-1">What&apos;s for dinner tonight?</h1>

      {!ready || !tonightRecipe ? (
        <div
          className="mt-6 rounded-2xl border p-6 text-center text-fd-muted"
          style={{ borderColor: "#362c20" }}
        >
          Loading your dinner idea…
        </div>
      ) : (
        <div className="mt-6">
          <RecipeCard
            recipe={tonightRecipe}
            isKeeper={isKeeper(tonightRecipe)}
            isTonight
            onToggleKeeper={toggleKeeper}
            onToggleSkip={(id) => {
              toggleSkip(id)
              reroll()
            }}
            defaultExpanded
          />

          <button
            onClick={reroll}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 mt-4 text-sm font-semibold border"
            style={{ borderColor: "#362c20", color: "#e8a33d" }}
          >
            <Shuffle className="w-4 h-4" /> Something different
          </button>

          <p className="text-xs text-fd-dim mt-3 text-center">
            {keepers.size > 0
              ? "Picked from your regulars and starred favorites."
              : "Star recipes in the Feed to build your regular rotation."}
          </p>
        </div>
      )}
    </div>
  )
}
