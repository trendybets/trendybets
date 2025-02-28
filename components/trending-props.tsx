"use client"

import { GameCard } from "@/components/game-card"

const mockGames = [
  {
    homeTeam: {
      name: "Lakers",
      logo: "/teams/lakers.svg",
      record: "24-15"
    },
    awayTeam: {
      name: "Warriors",
      logo: "/teams/warriors.svg",
      record: "18-21"
    },
    time: "7:30 PM",
    spread: "-5.5",
    isFeature: true
  },
  {
    homeTeam: {
      name: "Celtics",
      logo: "/teams/celtics.svg",
      record: "28-11"
    },
    awayTeam: {
      name: "Knicks",
      logo: "/teams/knicks.svg",
      record: "22-17"
    },
    time: "8:00 PM",
    spread: "-3.5"
  },
  {
    homeTeam: {
      name: "Bucks",
      logo: "/teams/bucks.svg",
      record: "25-14"
    },
    awayTeam: {
      name: "76ers",
      logo: "/teams/76ers.svg",
      record: "23-16"
    },
    time: "6:00 PM",
    spread: "-2.5"
  }
]

export function TrendingProps() {
  return (
    <div className="space-y-6">
      {/* Featured Game */}
      {mockGames.slice(0, 1).map((game, index) => (
        <GameCard key={index} {...game} />
      ))}
      
      {/* Regular Games */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockGames.slice(1).map((game, index) => (
          <GameCard key={index} {...game} />
        ))}
      </div>
    </div>
  )
}

