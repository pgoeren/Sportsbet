"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, TrendingUp, BookOpen, BarChart2 } from "lucide-react"

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/picks", icon: TrendingUp, label: "Picks" },
  { href: "/tracker", icon: BookOpen, label: "Tracker" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur border-t border-white/10 z-40">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] gap-1 transition-colors ${
                active ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
