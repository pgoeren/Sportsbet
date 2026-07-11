"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UtensilsCrossed, LayoutList } from "lucide-react"

const tabs = [
  { href: "/",     icon: UtensilsCrossed, label: "Tonight" },
  { href: "/feed", icon: LayoutList,      label: "Feed"    },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40"
      style={{ backgroundColor: "#211a13", borderTop: "1px solid #362c20" }}>
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className="relative flex-1 flex flex-col items-center gap-1 pt-2 transition-colors"
              style={{
                paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px))`,
                color: active ? "#e8a33d" : "#b4a58f",
              }}>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-b"
                  style={{ backgroundColor: "#e8a33d" }} />
              )}
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-xs font-semibold">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
