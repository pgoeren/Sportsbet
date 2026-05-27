import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { BottomNav } from "@/components/BottomNav"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "BetEdge - Smart Sports Betting",
  description: "AI-powered sports betting recommendations with edge analysis",
  manifest: "/manifest.json",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#111827" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        <main className="max-w-lg mx-auto pb-24 min-h-screen">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  )
}
