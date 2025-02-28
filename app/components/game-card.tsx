'use client'

import { cn } from "@/lib/utils"
import Image from "next/image"
import { formatOdds } from "@/lib/format-odds"
import { useState } from "react"
import { Card } from "@/components/ui/card"

// Add team colors
const teamColors: Record<string, { primary: string; secondary: string }> = {
  "Boston Celtics": { primary: "#007A33", secondary: "#BA9653" },
  "Brooklyn Nets": { primary: "#000000", secondary: "#FFFFFF" },
  "New York Knicks": { primary: "#006BB6", secondary: "#F58426" },
  "Philadelphia 76ers": { primary: "#006BB6", secondary: "#ED174C" },
  "Toronto Raptors": { primary: "#CE1141", secondary: "#000000" },
  "Chicago Bulls": { primary: "#CE1141", secondary: "#000000" },
  "Cleveland Cavaliers": { primary: "#860038", secondary: "#041E42" },
  "Detroit Pistons": { primary: "#C8102E", secondary: "#1D42BA" },
  "Indiana Pacers": { primary: "#002D62", secondary: "#FDBB30" },
  "Milwaukee Bucks": { primary: "#00471B", secondary: "#EEE1C6" },
  "Atlanta Hawks": { primary: "#E03A3E", secondary: "#C1D32F" },
  "Charlotte Hornets": { primary: "#1D1160", secondary: "#00788C" },
  "Miami Heat": { primary: "#98002E", secondary: "#F9A01B" },
  "Orlando Magic": { primary: "#0077C0", secondary: "#C4CED4" },
  "Washington Wizards": { primary: "#002B5C", secondary: "#E31837" },
  "Denver Nuggets": { primary: "#0E2240", secondary: "#FEC524" },
  "Minnesota Timberwolves": { primary: "#0C2340", secondary: "#236192" },
  "Oklahoma City Thunder": { primary: "#007AC1", secondary: "#EF3B24" },
  "Portland Trail Blazers": { primary: "#E03A3E", secondary: "#000000" },
  "Utah Jazz": { primary: "#002B5C", secondary: "#00471B" },
  "Golden State Warriors": { primary: "#1D428A", secondary: "#FFC72C" },
  "LA Clippers": { primary: "#C8102E", secondary: "#1D428A" },
  "Los Angeles Lakers": { primary: "#552583", secondary: "#FDB927" },
  "Phoenix Suns": { primary: "#1D1160", secondary: "#E56020" },
  "Sacramento Kings": { primary: "#5A2D81", secondary: "#63727A" },
  "Dallas Mavericks": { primary: "#00538C", secondary: "#002B5E" },
  "Houston Rockets": { primary: "#CE1141", secondary: "#000000" },
  "Memphis Grizzlies": { primary: "#5D76A9", secondary: "#12173F" },
  "New Orleans Pelicans": { primary: "#0C2340", secondary: "#C8102E" },
  "San Antonio Spurs": { primary: "#C4CED4", secondary: "#000000" }
}

type BetType = 'spread' | 'moneyline' | 'total'

interface Odds {
  moneyline?: Array<{
    is_home: boolean
    price: number
  }>
  spread?: Array<{
    is_home: boolean
    points: number
    price: number
  }>
  total?: Array<{
    selection_line: string
    points: number
    price: number
  }>
}

type Fixture = {
  id: string
  home_team: {
    id: string
    name: string
    logo: string
  }
  away_team: {
    id: string
    name: string
    logo: string
  }
  home_team_id: string
  away_team_id: string
  odds?: Odds
}

interface GameCardProps {
  fixture: Fixture
  selectedSportsbook: string | null
  onSelect?: (fixtureId: string) => void
  isSelected: boolean
  isFeatured: boolean
  children?: React.ReactNode
}

export function GameCard({ 
  fixture, 
  selectedSportsbook,
  onSelect, 
  isSelected, 
  isFeatured,
  children
}: GameCardProps) {
  // Add state for bet type
  const [selectedBetType, setSelectedBetType] = useState<BetType>('spread')

  // Add these console logs
  console.log('GameCard render:', {
    isSelected,
    isFeatured,
    fixtureId: fixture.id
  })

  console.log('GameCard props:', {
    fixtureId: fixture.id,
    homeTeamId: fixture.home_team_id,
    awayTeamId: fixture.away_team_id,
    odds: fixture.odds
  })

  if (isSelected || isFeatured) {
    const homeColors = teamColors[fixture.home_team.name] || { primary: '#1a365d', secondary: '#2d3748' }
    const awayColors = teamColors[fixture.away_team.name] || { primary: '#2d3748', secondary: '#1a365d' }

    // Get moneyline and spread odds by team
    const homeMoneyline = fixture.odds?.moneyline?.find(o => o.is_home)
    const awayMoneyline = fixture.odds?.moneyline?.find(o => !o.is_home)

    const homeSpread = fixture.odds?.spread?.find(o => o.is_home)
    const awaySpread = fixture.odds?.spread?.find(o => !o.is_home)

    // Get total points
    const totalOver = fixture.odds?.total?.find(o => o.selection_line?.toLowerCase() === 'over')
    const totalUnder = fixture.odds?.total?.find(o => o.selection_line?.toLowerCase() === 'under')

    console.log('Odds data for display:', {
      homeMoneyline,
      awayMoneyline,
      homeSpread,
      awaySpread,
      totalOver,
      totalUnder
    })

    return (
      <div className="w-full">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 opacity-90" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12">
                  <Image
                    src={fixture.home_team.logo || ''}
                    alt={fixture.home_team.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <div className="font-bold text-white">
                    {fixture.home_team.name}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <div className="font-bold text-white text-right">
                    {fixture.away_team.name}
                  </div>
                </div>
                <div className="relative w-12 h-12">
                  <Image
                    src={fixture.away_team.logo || ''}
                    alt={fixture.away_team.name}
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Odds Display */}
            {(homeSpread || awaySpread || homeMoneyline || awayMoneyline || totalOver || totalUnder) && (
              <div className="mt-4 bg-black/20 rounded-lg p-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-xs text-white/60">TEAM</div>
                  <div className="text-xs text-white/60 text-right">SPREAD</div>
                  <div className="text-xs text-white/60 text-right">TOTAL</div>
                  <div className="text-xs text-white/60 text-right">ML</div>

                  {/* Home Team Odds */}
                  <div className="text-sm text-white">{fixture.home_team.name}</div>
                  <div className="text-sm text-white text-right">
                    {homeSpread && `${homeSpread.points > 0 ? '+' : ''}${homeSpread.points}`}
                  </div>
                  <div className="text-sm text-white text-right">
                    {totalOver && `O ${totalOver.points}`}
                  </div>
                  <div className="text-sm text-white text-right">
                    {homeMoneyline && homeMoneyline.price}
                  </div>

                  {/* Away Team Odds */}
                  <div className="text-sm text-white">{fixture.away_team.name}</div>
                  <div className="text-sm text-white text-right">
                    {awaySpread && `${awaySpread.points > 0 ? '+' : ''}${awaySpread.points}`}
                  </div>
                  <div className="text-sm text-white text-right">
                    {totalUnder && `U ${totalUnder.points}`}
                  </div>
                  <div className="text-sm text-white text-right">
                    {awayMoneyline && awayMoneyline.price}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Card 
        className={cn(
          "relative overflow-hidden cursor-pointer transition-all duration-200",
          isSelected ? "ring-2 ring-blue-500" : "hover:ring-2 hover:ring-blue-500/50"
        )}
        onClick={() => onSelect?.(fixture.id)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 opacity-90" />
        <div className="relative p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <Image
                  src={fixture.home_team.logo || ''}
                  alt={fixture.home_team.name}
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <div className="font-bold text-white text-sm">
                  {fixture.home_team.name}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <div className="font-bold text-white text-sm text-right">
                  {fixture.away_team.name}
                </div>
              </div>
              <div className="relative w-10 h-10">
                <Image
                  src={fixture.away_team.logo || ''}
                  alt={fixture.away_team.name}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
} 