"use client"

import { useState } from "react"
import { Clock, Users, Star, X, ChevronDown, ChevronUp, UtensilsCrossed } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Recipe } from "@/data/recipes"

interface RecipeCardProps {
  recipe: Recipe
  isKeeper: boolean
  isTonight?: boolean
  onToggleKeeper: (id: string) => void
  onToggleSkip: (id: string) => void
  onMakeTonight?: (id: string) => void
  defaultExpanded?: boolean
}

export function RecipeCard({
  recipe,
  isKeeper,
  isTonight,
  onToggleKeeper,
  onToggleSkip,
  onMakeTonight,
  defaultExpanded = false,
}: RecipeCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ backgroundColor: "#241d16", borderColor: isTonight ? "#e8a33d" : "#362c20" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-fd-text leading-snug">{recipe.title}</h3>
          <p className="text-sm text-fd-muted mt-1">{recipe.description}</p>
        </div>
        <button
          onClick={() => onToggleKeeper(recipe.id)}
          aria-label={isKeeper ? "Remove from regulars" : "Keep in rotation"}
          className="shrink-0 p-1.5 rounded-full"
          style={{ color: isKeeper ? "#e8a33d" : "#7a6c56" }}
        >
          <Star className="w-5 h-5" fill={isKeeper ? "#e8a33d" : "none"} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <Badge variant="gf">Gluten-free</Badge>
        {isKeeper && <Badge variant="keeper">Regular</Badge>}
        {!isKeeper && recipe.origin === "discover" && <Badge variant="discover">New to try</Badge>}
        <span className="flex items-center gap-1 text-xs text-fd-muted">
          <Clock className="w-3.5 h-3.5" /> {recipe.minutes} min
        </span>
        <span className="flex items-center gap-1 text-xs text-fd-muted">
          <Users className="w-3.5 h-3.5" /> {recipe.servings}
        </span>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-sm font-medium mt-3"
        style={{ color: "#e8a33d" }}
      >
        {expanded ? "Hide details" : "View ingredients & steps"}
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <p className="font-semibold text-fd-text mb-1">Ingredients</p>
            <ul className="space-y-1 text-fd-muted list-disc list-inside">
              {recipe.ingredients.map((ing) => (
                <li key={ing}>{ing}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-fd-text mb-1">Steps</p>
            <ol className="space-y-1 text-fd-muted list-decimal list-inside">
              {recipe.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-4">
        {onMakeTonight && !isTonight && (
          <button
            onClick={() => onMakeTonight(recipe.id)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold"
            style={{ backgroundColor: "#e8a33d", color: "#191510" }}
          >
            <UtensilsCrossed className="w-4 h-4" /> Make tonight
          </button>
        )}
        <button
          onClick={() => onToggleSkip(recipe.id)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-sm font-semibold border",
            onMakeTonight && !isTonight ? "" : "flex-1"
          )}
          style={{ borderColor: "#362c20", color: "#b4a58f" }}
        >
          <X className="w-4 h-4" /> Not for me
        </button>
      </div>
    </div>
  )
}
