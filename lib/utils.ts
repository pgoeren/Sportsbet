import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`
}

export function oddsToImpliedProb(odds: number): number {
  if (odds > 0) return 100 / (odds + 100)
  return Math.abs(odds) / (Math.abs(odds) + 100)
}

export function impliedProbToOdds(prob: number): number {
  if (prob >= 0.5) return Math.round(-(prob / (1 - prob)) * 100)
  return Math.round(((1 - prob) / prob) * 100)
}

export function calcExpectedValue(odds: number, winProb: number): number {
  const stake = 100
  let payout: number
  if (odds > 0) payout = odds
  else payout = 10000 / Math.abs(odds)
  return (winProb * payout) - ((1 - winProb) * stake)
}

export function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case "elite": return "text-yellow-400"
    case "high": return "text-green-400"
    case "medium": return "text-blue-400"
    default: return "text-gray-400"
  }
}

export function getEdgeColor(edge: number): string {
  if (edge >= 70) return "text-yellow-400"
  if (edge >= 55) return "text-green-400"
  if (edge >= 40) return "text-blue-400"
  return "text-gray-400"
}
