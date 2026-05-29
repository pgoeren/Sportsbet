"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen } from "lucide-react"

const tabs = [
  { href: "/",        icon: Home,     label: "Home"   },
  { href: "/tracker", icon: BookOpen, label: "Record" },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40"
      style={{ backgroundColor: "#131f2e", borderTop: "1px solid #1e2d40" }}>
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className="relative flex-1 flex flex-col items-center gap-1 pt-2 transition-colors"
              style={{
                paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px))`,
                color: active ? "#29d87f" : "#8c9bb5",
              }}>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-b"
                  style={{ backgroundColor: "#29d87f" }} />
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
