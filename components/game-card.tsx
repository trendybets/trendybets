"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { Database } from "@/types/supabase"
import { getTeamColors } from "@/lib/colors"
import { teamColors } from "@/lib/teamColors"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Bar } from "@/components/ui/bar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Fixture = Database['public']['Tables']['fixtures']['Row'] & {
  home_team: Database['public']['Tables']['teams']['Row']
  away_team: Database['public']['Tables']['teams']['Row']
}

type BaseOdds = Database['public']['Tables']['odds']['Row'] & {
  sportsbook: Database['public']['Tables']['sportsbook']['Row']
  sportsbook_logo?: string
}

// Add the transformed fields
type TransformedOdds = BaseOdds & {
  spread_points: number | null
  money_line: number
  total_points: number | null
  is_over_under: boolean
}

// Add a new type for player trends
type PlayerTrend = {
  lastFiveGames: string[]
  avgPoints: number
  overPercentage: number
}

// Add a new type for grouped odds
type GroupedOdds = {
  sportsbook: string
  logo: string
  spread: {
    away: { 
      points: number | null
      price: number | null
    } | null
    home: { 
      points: number | null
      price: number | null
    } | null
  }
  total: {
    over: { points: number; price: number } | null
    under: { points: number; price: number } | null
  }
  moneyline: {
    away: number | null
    home: number | null
  }
}

// Add this type
type BetType = 'spread' | 'moneyline' | 'total'

interface GameCardProps {
  fixture: Fixture
  selectedSportsbook: string | null
  onSelect: (id: string) => void
  isSelected: boolean
  odds?: TransformedOdds[]
  isFeatured?: boolean
}

export function GameCard({ fixture, selectedSportsbook, onSelect, isSelected, odds, isFeatured }: GameCardProps) {
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
    receivedOdds: odds
  })

  // At the top of the GameCard component, log the incoming odds
  console.log('Raw odds data:', odds)

  // First, let's log all unique market_ids to see what we're working with
  useEffect(() => {
    if (odds) {
      const uniqueMarkets = [...new Set(odds.map(o => o.market_id))]
      console.log('Available market types:', uniqueMarkets)
    }
  }, [odds])

  // Add a useEffect to monitor selectedBetType changes
  useEffect(() => {
    console.log('selectedBetType changed:', selectedBetType)
    
    // Log the current odds data when bet type changes
    if (odds) {
      const moneylineOdds = odds.filter(o => o.market_id === 'moneyline')
      console.log('Available moneyline odds:', moneylineOdds)
    }
  }, [selectedBetType, odds])

  if (isSelected || isFeatured) {
    const homeColors = teamColors[fixture.home_team.name] || { primary: '#1a365d', secondary: '#2d3748' }
    const awayColors = teamColors[fixture.away_team.name] || { primary: '#2d3748', secondary: '#1a365d' }

    // Get moneyline and spread odds by team
    const homeTeamOdds = odds?.filter(o => o.team_id === fixture.home_team_id)
    const awayTeamOdds = odds?.filter(o => o.team_id === fixture.away_team_id)

    // Get specific odds by market
    const homeMoneyline = homeTeamOdds?.find(o => o.market_id === 'moneyline')?.money_line
    const awayMoneyline = awayTeamOdds?.find(o => o.market_id === 'moneyline')?.money_line

    const homeSpread = homeTeamOdds?.find(o => o.market_id === 'point_spread')
    const awaySpread = awayTeamOdds?.find(o => o.market_id === 'point_spread')

    // Get total points directly from odds array since it doesn't have team_id
    const totalPoints = odds?.find(o => o.market_id === 'total_points')

    console.log('Odds data for display:', {
      homeTeamOdds,
      awayTeamOdds,
      totalPoints,
      homeMoneyline,
      awayMoneyline,
      homeSpread,
      awaySpread
    })

    const groupOddsBySportsbook = (odds: TransformedOdds[]): GroupedOdds[] => {
      console.log('Starting groupOddsBySportsbook with odds:', odds)
      
      const sportsbooks = ['DraftKings', 'Caesars', 'BetMGM', 'bet365']
      
      return sportsbooks.map(book => {
        const bookOdds = odds.filter(o => o.sportsbook === book)
        console.log(`\nProcessing ${book}:`, bookOdds)
        
        // Log moneyline search criteria
        console.log('Looking for moneyline odds with:', {
          market_id: 'moneyline',
          away_team_id: fixture.away_team_id,
          home_team_id: fixture.home_team_id
        })

        const awayMoneyline = bookOdds.find(o => {
          const isMoneyline = o.market_id === 'moneyline'
          const isAwayTeam = o.team_id === fixture.away_team_id
          console.log('Moneyline check:', {
            isMoneyline,
            isAwayTeam,
            price: o.price,
            market_id: o.market_id,
            team_id: o.team_id
          })
          return isMoneyline && isAwayTeam
        })

        console.log('Away moneyline found:', {
          price: awayMoneyline?.price,
          raw: awayMoneyline
        })

        const homeMoneyline = bookOdds.find(o => {
          const isMoneyline = o.market_id === 'money_line' || o.market === 'Money Line' || o.market_id === 'moneyline'
          const isHomeTeam = o.team_id === fixture.home_team_id
          return isMoneyline && isHomeTeam
        })
        console.log('Found home moneyline:', homeMoneyline)

        const result = {
          sportsbook: book,
          logo: bookOdds[0]?.sportsbook_logo || '/placeholder-sportsbook.png',
          spread: {
            away: bookOdds.find(o => 
              o.market_id === 'point_spread' && 
              o.team_id === fixture.away_team_id
            ) ? {
              points: bookOdds.find(o => 
                o.market_id === 'point_spread' && 
                o.team_id === fixture.away_team_id
              )?.points,
              price: bookOdds.find(o => 
                o.market_id === 'point_spread' && 
                o.team_id === fixture.away_team_id
              )?.price
            } : null,
            home: bookOdds.find(o => 
              o.market_id === 'point_spread' && 
              o.team_id === fixture.home_team_id
            ) ? {
              points: bookOdds.find(o => 
                o.market_id === 'point_spread' && 
                o.team_id === fixture.home_team_id
              )?.points,
              price: bookOdds.find(o => 
                o.market_id === 'point_spread' && 
                o.team_id === fixture.home_team_id
              )?.price
            } : null
          },
          total: {
            over: bookOdds.find(o => 
              o.market_id === 'total_points' && 
              o.selection_line === 'over'
            ) ? {
              points: bookOdds.find(o => 
                o.market_id === 'total_points' && 
                o.selection_line === 'over'
              )?.points || 0,
              price: bookOdds.find(o => 
                o.market_id === 'total_points' && 
                o.selection_line === 'over'
              )?.price || 0
            } : null,
            under: bookOdds.find(o => 
              o.market_id === 'total_points' && 
              o.selection_line === 'under'
            ) ? {
              points: bookOdds.find(o => 
                o.market_id === 'total_points' && 
                o.selection_line === 'under'
              )?.points || 0,
              price: bookOdds.find(o => 
                o.market_id === 'total_points' && 
                o.selection_line === 'under'
              )?.price || 0
            } : null
          },
          moneyline: {
            away: awayMoneyline?.price || null,
            home: homeMoneyline?.price || null
          }
        }

        // Add debug logs for totals
        const overOdds = bookOdds.find(o => 
          o.market_id === 'total_points' && 
          o.selection_line === 'over'
        )
        console.log('Found over odds:', overOdds)

        const underOdds = bookOdds.find(o => 
          o.market_id === 'total_points' && 
          o.selection_line === 'under'
        )
        console.log('Found under odds:', underOdds)

        console.log('Total odds result:', {
          over: result.total.over,
          under: result.total.under
        })

        console.log(`Final ${book} result:`, result)
        return result
      })
    }

    // In the GameCard component, add a function to find best odds
    const findBestOdds = (odds: GroupedOdds[], betType: BetType) => {
      if (odds.length === 0) return null

      switch (betType) {
        case 'spread':
          return {
            away: odds.reduce((best, current) => {
              if (!current.spread.away?.price) return best
              if (!best?.price || current.spread.away.price > best.price) {
                return { 
                  price: current.spread.away.price, 
                  points: current.spread.away.points,
                  sportsbook: current.sportsbook 
                }
              }
              return best
            }, null as { price: number; points: number; sportsbook: string } | null),
            home: odds.reduce((best, current) => {
              if (!current.spread.home?.price) return best
              if (!best?.price || current.spread.home.price > best.price) {
                return { 
                  price: current.spread.home.price, 
                  points: current.spread.home.points,
                  sportsbook: current.sportsbook 
                }
              }
              return best
            }, null as { price: number; points: number; sportsbook: string } | null)
          }
        case 'moneyline':
          return {
            away: odds.reduce((best, current) => {
              if (!current.moneyline.away) return best
              if (!best?.price || current.moneyline.away > best.price) {
                return { price: current.moneyline.away, sportsbook: current.sportsbook }
              }
              return best
            }, null as { price: number; sportsbook: string } | null),
            home: odds.reduce((best, current) => {
              if (!current.moneyline.home) return best
              if (!best?.price || current.moneyline.home > best.price) {
                return { price: current.moneyline.home, sportsbook: current.sportsbook }
              }
              return best
            }, null as { price: number; sportsbook: string } | null)
          }
        case 'total':
          return {
            total: odds.reduce((best, current) => {
              if (!current.total.over?.points) return best
              if (!best?.over_price || current.total.over.price > best.over_price) {
                return {
                  points: current.total.over.points,
                  over_price: current.total.over.price,
                  under_price: current.total.under?.price,
                  sportsbook: current.sportsbook
                }
              }
              return best
            }, null as { points: number; over_price: number; under_price?: number; sportsbook: string } | null)
          }
        default:
          return null
      }
    }

    // Find best odds
    const bestOdds = findBestOdds(groupOddsBySportsbook(odds || []), selectedBetType)

    // In the display section, add logging for the current state
    console.log('Current bet type:', selectedBetType)
    console.log('Best odds for display:', bestOdds)

    return (
      <div className="space-y-4">
        <Card 
          className="rounded-xl overflow-hidden shadow-2xl max-w-[900px] mx-auto"
          style={{
            background: `linear-gradient(to right, ${homeColors.primary}, ${awayColors.primary})`
          }}
        >
          <div className="flex flex-col items-center p-4 text-white">
            <div className="mb-4">
              <h2 className="text-xl font-bold tracking-widest bg-white/15 px-6 py-2 rounded-full shadow-lg backdrop-blur-sm border border-white/10 transition-all hover:bg-white/20">NBA</h2>
            </div>
            
            <div className="w-full mx-auto">
              {/* Teams and Time Container */}
              <div className="flex items-center justify-between max-w-[600px] mx-auto px-4 py-4 mb-6">
                {/* Away Team */}
                <div className="flex flex-col items-center w-40">
                  <div className="relative w-16 h-16 mb-3">
                    <Image
                      src={fixture.away_team.logo || '/placeholder-team.png'}
                      alt={fixture.away_team.name}
                      fill
                      sizes="64px"
                      className="object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold whitespace-nowrap">{fixture.away_team.name}</h3>
                    <p className="text-sm opacity-60">{fixture.away_record}</p>
                  </div>
                </div>

                {/* Game Time */}
                <div className="flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tracking-tight opacity-90">4:00</span>
                  <span className="text-sm opacity-60 mt-1">PM</span>
                </div>

                {/* Home Team */}
                <div className="flex flex-col items-center w-40">
                  <div className="relative w-16 h-16 mb-3">
                    <Image
                      src={fixture.home_team.logo || '/placeholder-team.png'}
                      alt={fixture.home_team.name}
                      fill
                      sizes="64px"
                      className="object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold whitespace-nowrap">{fixture.home_team.name}</h3>
                    <p className="text-sm opacity-60">{fixture.home_record}</p>
                  </div>
                </div>
              </div>

              {/* Odds Section - Parent container */}
              <div className="flex flex-col items-center">
                {/* Bet Type Selector */}
                <div className="mb-4">
                  <Select
                    value={selectedBetType}
                    onValueChange={(value) => {
                      console.log('Bet type changed to:', value)
                      setSelectedBetType(value as BetType)
                    }}
                  >
                    <SelectTrigger className="w-24 h-7 bg-white/10 border-0 text-white/70 text-xs">
                      <SelectValue placeholder="Select bet type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spread">Spread</SelectItem>
                      <SelectItem value="moneyline">Moneyline</SelectItem>
                      <SelectItem value="total">Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Odds Grid - Fixed column count */}
                <div className="grid grid-cols-6 gap-1.5">
                  {/* Team Column */}
                  <div className="col-span-1 text-white bg-white/5 rounded-lg p-2.5">
                    <div className="mb-3 opacity-50 text-xs font-medium uppercase tracking-wider">Team</div>
                    <div className="space-y-4">
                      <div className="font-medium text-sm">{fixture.away_team_abbreviation}</div>
                      <div className="font-medium text-sm">{fixture.home_team_abbreviation}</div>
                    </div>
                  </div>

                  {/* Best Column */}
                  <div className="col-span-1 text-white bg-green-500/5 rounded-lg p-2">
                    <div className="mb-2 opacity-50 text-xs font-medium uppercase tracking-wider">Best</div>
                    <div className="space-y-3">
                      {selectedBetType === 'spread' && (
                        <>
                          {bestOdds?.away && (
                            <div className="text-sm font-mono flex justify-between text-green-400">
                              <span className="font-bold">{bestOdds.away.points > 0 ? `+${bestOdds.away.points}` : bestOdds.away.points}</span>
                              <span className="opacity-80">{bestOdds.away.price > 0 ? `+${bestOdds.away.price}` : bestOdds.away.price}</span>
                            </div>
                          )}
                          {bestOdds?.home && (
                            <div className="text-sm font-mono flex justify-between text-green-400">
                              <span className="font-bold">{bestOdds.home.points > 0 ? `+${bestOdds.home.points}` : bestOdds.home.points}</span>
                              <span className="opacity-80">{bestOdds.home.price > 0 ? `+${bestOdds.home.price}` : bestOdds.home.price}</span>
                            </div>
                          )}
                        </>
                      )}
                      {selectedBetType === 'moneyline' && (
                        <>
                          <div className="text-sm font-mono flex justify-between">
                            {typeof bestOdds?.away?.price === 'number' ? (
                              <span className={`font-bold ${bestOdds?.away?.sportsbook === 'DraftKings' ? 'text-green-400' : ''}`}>
                                {bestOdds.away.price > 0 ? `+${bestOdds.away.price}` : bestOdds.away.price}
                              </span>
                            ) : (
                              <span className="opacity-50">
                                N/A {/* Add debug info */}
                                {JSON.stringify(bestOdds?.away)}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-mono flex justify-between">
                            {typeof bestOdds?.home?.price === 'number' ? (
                              <span className={`font-bold ${bestOdds?.home?.sportsbook === 'DraftKings' ? 'text-green-400' : ''}`}>
                                {bestOdds.home.price > 0 ? `+${bestOdds.home.price}` : bestOdds.home.price}
                              </span>
                            ) : (
                              <span className="opacity-50">
                                N/A {/* Add debug info */}
                                {JSON.stringify(bestOdds?.home)}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                      {selectedBetType === 'total' && (
                        <>
                          <div className="text-sm font-mono flex justify-between text-green-400">
                            {bestOdds?.total?.points ? (
                              <>
                                <span className="font-bold">O {bestOdds.total.points}</span>
                                <span className="opacity-80">{bestOdds.total.over_price}</span>
                              </>
                            ) : (
                              <span className="opacity-50">N/A</span>
                            )}
                          </div>
                          <div className="text-sm font-mono flex justify-between text-green-400">
                            {bestOdds?.total?.points ? (
                              <>
                                <span className="font-bold">U {bestOdds.total.points}</span>
                                <span className="opacity-80">{bestOdds.total.under_price}</span>
                              </>
                            ) : (
                              <span className="opacity-50">N/A</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sportsbook Columns */}
                  {groupOddsBySportsbook(odds || []).map((bookOdds) => (
                    <div key={bookOdds.sportsbook} className="col-span-1 text-white bg-white/5 rounded-lg p-2">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Image
                          src={bookOdds.logo}
                          alt={bookOdds.sportsbook}
                          width={16}
                          height={16}
                          className="object-contain"
                        />
                        <span className="text-xs font-medium opacity-50 uppercase tracking-wider">{bookOdds.sportsbook}</span>
                      </div>

                      <div className="space-y-3">
                        {selectedBetType === 'spread' && (
                          <>
                            <div className={`text-sm font-mono flex justify-between ${
                              bestOdds?.away?.sportsbook === bookOdds.sportsbook ? 'text-green-400' : ''
                            }`}>
                              {bookOdds.spread.away ? (
                                <>
                                  <span className="font-bold">{bookOdds.spread.away.points > 0 ? `+${bookOdds.spread.away.points}` : bookOdds.spread.away.points}</span>
                                  <span className="opacity-80">{bookOdds.spread.away.price > 0 ? `+${bookOdds.spread.away.price}` : bookOdds.spread.away.price}</span>
                                </>
                              ) : <span className="opacity-50">N/A</span>}
                            </div>
                            <div className={`text-sm font-mono flex justify-between ${
                              bestOdds?.home?.sportsbook === bookOdds.sportsbook ? 'text-green-400' : ''
                            }`}>
                              {bookOdds.spread.home ? (
                                <>
                                  <span className="font-bold">{bookOdds.spread.home.points > 0 ? `+${bookOdds.spread.home.points}` : bookOdds.spread.home.points}</span>
                                  <span className="opacity-80">{bookOdds.spread.home.price > 0 ? `+${bookOdds.spread.home.price}` : bookOdds.spread.home.price}</span>
                                </>
                              ) : <span className="opacity-50">N/A</span>}
                            </div>
                          </>
                        )}
                        {selectedBetType === 'moneyline' && (
                          <>
                            <div className="text-sm font-mono flex justify-between">
                              {typeof bookOdds.moneyline.away === 'number' ? (
                                <span className={`font-bold ${bestOdds?.away?.sportsbook === bookOdds.sportsbook ? 'text-green-400' : ''}`}>
                                  {bookOdds.moneyline.away > 0 ? `+${bookOdds.moneyline.away}` : bookOdds.moneyline.away}
                                </span>
                              ) : (
                                <span className="opacity-50">
                                  N/A {/* Add debug info */}
                                  {JSON.stringify(bookOdds.moneyline)}
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-mono flex justify-between">
                              {typeof bookOdds.moneyline.home === 'number' ? (
                                <span className={`font-bold ${bestOdds?.home?.sportsbook === bookOdds.sportsbook ? 'text-green-400' : ''}`}>
                                  {bookOdds.moneyline.home > 0 ? `+${bookOdds.moneyline.home}` : bookOdds.moneyline.home}
                                </span>
                              ) : (
                                <span className="opacity-50">N/A</span>
                              )}
                            </div>
                          </>
                        )}
                        {selectedBetType === 'total' && (
                          <>
                            <div className="text-sm font-mono flex justify-between">
                              {bookOdds.total.over?.points ? (
                                <>
                                  <span className="font-bold">O {bookOdds.total.over.points}</span>
                                  <span className="opacity-80">{bookOdds.total.over.price}</span>
                                </>
                              ) : (
                                <span className="opacity-50">N/A</span>
                              )}
                            </div>
                            <div className="text-sm font-mono flex justify-between">
                              {bookOdds.total.under?.points ? (
                                <>
                                  <span className="font-bold">U {bookOdds.total.under.points}</span>
                                  <span className="opacity-80">{bookOdds.total.under.price}</span>
                                </>
                              ) : (
                                <span className="opacity-50">N/A</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Non-featured game card
  return (
    <Card 
      className="bg-black/20 hover:bg-black/30 cursor-pointer transition-all duration-200"
      onClick={() => onSelect(fixture.id)}
    >
      <div className="flex items-center justify-between p-6 h-[120px]">
        {/* Away Team (Left) */}
        <div className="flex items-center space-x-4 w-[240px]">
          <div className="relative w-16 h-16">
            <Image
              src={fixture.away_team.logo || '/placeholder-team.png'}
              alt={fixture.away_team.name}
              fill
              sizes="64px"
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-lg text-white truncate">{fixture.away_team.name}</div>
            <div className="text-base text-white/60">{fixture.away_record}</div>
          </div>
        </div>
        
        {/* Game Time */}
        <div className="text-center min-w-[140px]">
          <div className="text-2xl font-medium text-white mb-2">
            {new Date(fixture.start_date).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit'
            })}
          </div>
          {/* Only show spread if it exists */}
          {odds?.find(o => 
            o.market_id === 'point_spread' && 
            o.team_id === fixture.away_team_id
          )?.spread_points && (
            <div className="text-base text-white/60">
              {odds.find(o => 
                o.market_id === 'point_spread' && 
                o.team_id === fixture.away_team_id
              )?.spread_points}
            </div>
          )}
        </div>

        {/* Home Team (Right) */}
        <div className="flex items-center space-x-4 w-[240px] justify-end">
          <div className="min-w-0 text-right">
            <div className="font-medium text-lg text-white truncate">{fixture.home_team.name}</div>
            <div className="text-base text-white/60">{fixture.home_record}</div>
          </div>
          <div className="relative w-16 h-16">
            <Image
              src={fixture.home_team.logo || '/placeholder-team.png'}
              alt={fixture.home_team.name}
              fill
              sizes="64px"
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}


