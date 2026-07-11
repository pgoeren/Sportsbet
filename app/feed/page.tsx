"use client"

import { RecipeCard } from "@/components/RecipeCard"
import { useDinnerStore } from "@/lib/dinner-store"

export default function FeedPage() {
  const { ready, recipes, tonightRecipe, toggleKeeper, toggleSkip, setTonightTo, isKeeper } =
    useDinnerStore()

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold text-fd-text">Recipe feed</h1>
      <p className="text-sm text-fd-muted mt-1">
        Every recipe here is gluten-free. Star the ones you already make to keep them in your
        rotation, or send tonight&apos;s pick straight from here.
      </p>

      {!ready ? (
        <div className="mt-6 text-center text-fd-muted">Loading recipes…</div>
      ) : (
        <div className="mt-6 space-y-4">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isKeeper={isKeeper(recipe)}
              isTonight={tonightRecipe?.id === recipe.id}
              onToggleKeeper={toggleKeeper}
              onToggleSkip={toggleSkip}
              onMakeTonight={setTonightTo}
            />
          ))}
        </div>
      )}
    </div>
  )
}
