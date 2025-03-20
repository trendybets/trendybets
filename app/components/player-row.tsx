'use client'

import React, { memo, useState, useEffect } from 'react'
import { PlayerData } from '../types'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react'
import Image from 'next/image'
import { getSafeImageUrl } from '@/lib/image-utils'
import { colors } from '@/app/styles/design-system'
import { PlayerTeamDisplay } from '@/app/components/player-team-display'
import { formatHitRate, formatOdds } from '@/lib/format-utils'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import MiniBarGraph from './MiniBarGraph'
import AnimatedProgressBar from './AnimatedProgressBar'
import { PlayerPerformanceBarChart } from './PlayerPerformanceBarChart'
import { createClient } from '@supabase/supabase-js'

// Define Supabase URL and key variables at the top level
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hvegilvwwvdmivnphlyo.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWdpbHZ3d3ZkbWl2bnBobHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY3MDU4OTIsImV4cCI6MjAzMjI4MTg5Mn0.bIhCn1cQgH0kDldI-9z8OJHPPu0SXqAEOJnj9V90JqY';

// Team colors for visual accents
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

interface PlayerRowProps {
  player: PlayerData
  timeframe: string
  onSelect: (player: PlayerData) => void
  isHovered?: boolean
  onHover: (isHovered: boolean) => void
  calculateHits: (player: PlayerData, timeframe: string) => { hits: number, total: number }
  getTimeframeNumber: (timeframe: string) => number
  getAverageValue: (player: PlayerData, timeframe: string) => number
  className?: string
}

/**
 * Memoized PlayerRow component to prevent unnecessary re-renders
 */
function PlayerRowComponent({
  player,
  timeframe,
  onSelect,
  isHovered,
  onHover,
  calculateHits,
  getTimeframeNumber,
  getAverageValue,
  className
}: PlayerRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [sportsbookLogo, setSportsbookLogo] = useState<string | null>(null)
  
  // Get hit rate data
  const hitRateData = calculateHits(player, timeframe)
  const hitRate = hitRateData.hits / Math.max(1, hitRateData.total)
  const timeframeNumber = getTimeframeNumber(timeframe)
  const averageValue = getAverageValue(player, timeframe)
  
  // Check if we have limited data
  const hasLimitedData = player.games && player.games.length < timeframeNumber
  
  // Determine bet recommendation based on hit rate
  const recommendedBetType = hitRate >= 0.55 ? 'OVER' : 'UNDER'
  const isStrongOver = hitRate >= 0.7
  const isStrongUnder = hitRate <= 0.3
  const isStrongTrend = isStrongOver || isStrongUnder
  
  // Format the hit rate for display
  const formattedHitRate = recommendedBetType === "OVER" 
    ? formatHitRate(hitRate) 
    : formatHitRate(1 - hitRate)
  
  // Determine color scheme for hit rate
  const getHitRateColor = () => {
    const displayRate = recommendedBetType === "OVER" ? hitRate : 1 - hitRate;
    
    if (displayRate >= 0.7) return 'text-green-600 dark:text-green-500'
    if (displayRate >= 0.6) return 'text-teal-600 dark:text-teal-500'
    if (displayRate >= 0.5) return 'text-blue-600 dark:text-blue-500'
    if (displayRate >= 0.4) return 'text-yellow-600 dark:text-yellow-500'
    if (displayRate >= 0.3) return 'text-orange-600 dark:text-orange-500'
    return 'text-red-600 dark:text-red-500'
  }
  
  // Get color scheme for progress bar
  const getHitRateColorScheme = () => {
    const displayRate = recommendedBetType === "OVER" ? hitRate : 1 - hitRate;
    
    if (displayRate >= 0.7) return 'success'
    if (displayRate <= 0.3) return 'danger'
    return 'default'
  }
  
  // Get formatted line value
  const lineValue = player.line || 0
  
  // Determine if average is over or under line
  const isOverLine = averageValue > lineValue
  const differenceFromLine = (averageValue - lineValue).toFixed(1)
  
  // Function to return streak info
  const getStreak = () => {
    if (!player.games || player.games.length === 0) return { count: 0, type: '' }
    
    const games = player.games.slice(0, timeframeNumber)
    let currentStreak = 1
    
    // Get the relevant stat value
    const getStatValue = (game: any) => {
      switch(player.stat_type.toLowerCase()) {
        case 'points': return game.points
        case 'assists': return game.assists
        case 'rebounds': return game.total_rebounds
        default: return 0
      }
    }
    
    // Get the first game's status (over/under)
    const firstGameValue = getStatValue(games[0])
    const firstGameOver = firstGameValue > lineValue
    
    // Count consecutive games with the same status
    for (let i = 1; i < games.length; i++) {
      const currentValue = getStatValue(games[i])
      const isCurrentOver = currentValue > lineValue
      
      if (isCurrentOver === firstGameOver) {
        currentStreak++
      } else {
        break
      }
    }
    
    return {
      count: currentStreak,
      type: firstGameOver ? 'OVER' : 'UNDER'
    }
  }
  
  const streak = getStreak()
  const hasStreak = streak.count > 2
  
  // Fetch sportsbook logo when expanded
  useEffect(() => {
    if (isExpanded && !sportsbookLogo) {
      const fetchSportsbookLogo = async () => {
        try {
          // Initialize Supabase client with the defined variables
          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          
          // Fetch DraftKings logo (since that's where our odds come from)
          const { data, error } = await supabase
            .from('sportsbook')
            .select('logo')
            .eq('name', 'DraftKings')
            .single();
            
          if (error) {
            console.error('Error fetching sportsbook logo:', error);
          } else if (data?.logo) {
            setSportsbookLogo(data.logo);
          }
        } catch (error) {
          console.error('Error fetching sportsbook logo:', error);
        }
      };
      
      fetchSportsbookLogo();
    }
  }, [isExpanded, sportsbookLogo]);
  
  // Toggle expanded state
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  return (
    <>
      <div 
        className={cn(
          "transition-colors duration-200 group cursor-pointer flex items-center",
          isHovered ? "bg-primary-blue-50/50 dark:bg-primary-blue-900/20" : "",
          isExpanded ? "bg-primary-blue-50 dark:bg-primary-blue-900/20 border-b-0" : "",
          className
        )}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onClick={() => onSelect(player)}
      >
        {/* Player Info - Left section */}
        <div className="w-[50%] pl-4 pr-2 py-3 flex items-center">
          <button
            className="mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            aria-label={isExpanded ? "Collapse details" : "Expand details"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          
          <div className="flex items-center flex-1">
            <div className="relative h-10 w-10 rounded-full overflow-hidden mr-3 flex-shrink-0">
              <Image
                src={getSafeImageUrl(player.player.image_url)}
                alt={player.player.name}
                fill
                sizes="40px"
                className="object-cover"
                priority={false}
              />
            </div>
            
            <div className="flex flex-col min-w-0">
              <div className="flex items-center">
                <div className="font-medium text-primary-black-900 dark:text-primary-black-100 truncate mr-2">
                  {player.player.name}
                </div>
                {hasLimitedData && (
                  <div className="flex-shrink-0 text-amber-500 dark:text-amber-400 tooltip-wrapper" title={`Limited data: only ${player.games?.length || 0} of ${timeframeNumber} games available`}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
              
              <div className="flex items-center text-sm text-primary-black-500 dark:text-primary-black-400">
                <PlayerTeamDisplay team={player.player.team} className="mr-2" />
                <span className="text-xs px-2 py-0.5 bg-primary-black-100 dark:bg-primary-black-700 rounded-full">
                  {player.stat_type}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats & Recommendation - Right section */}
        <div className={cn(
          "w-[50%] px-4 py-3 flex items-center justify-between rounded-r-lg",
          isStrongOver ? "bg-green-50 dark:bg-green-900/20" : 
          isStrongUnder ? "bg-red-50 dark:bg-red-900/20" : ""
        )}>
          {/* Line & Avg */}
          <div className="flex items-center space-x-6">
            <div className="flex flex-col items-center">
              <div className="text-sm text-primary-black-500 dark:text-primary-black-400 mb-1">Line</div>
              <div className="font-semibold text-primary-black-900 dark:text-primary-black-100">{player.line}</div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="text-sm text-primary-black-500 dark:text-primary-black-400 mb-1">Average</div>
              <div className={cn(
                "font-semibold",
                isOverLine ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
              )}>
                {averageValue.toFixed(1)}
              </div>
            </div>
          </div>
          
          {/* Recommendation & Hit Rate */}
          <div className="flex items-center">
            <div className="flex flex-col items-center mr-6">
              <div className="text-sm text-primary-black-500 dark:text-primary-black-400 mb-1">Hit Rate</div>
              <div className={cn(
                "font-semibold",
                getHitRateColor()
              )}>
                {formattedHitRate}
              </div>
              <div className="text-xs text-primary-black-500 dark:text-primary-black-400">
                {recommendedBetType === "OVER" 
                  ? `${hitRateData.hits}/${hitRateData.total} hits`
                  : `${hitRateData.total - hitRateData.hits}/${hitRateData.total} hits`}
              </div>
            </div>
            
            <Button 
              size="sm" 
              variant={isStrongTrend ? "default" : "outline"}
              className={cn(
                "font-medium min-w-[90px]",
                isStrongOver ? "bg-green-600 hover:bg-green-700" : 
                isStrongUnder ? "bg-red-600 hover:bg-red-700" : ""
              )}
            >
              {recommendedBetType}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Expanded Row */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "border-t-0 px-6 py-4 border-t border-dashed border-primary-black-200 dark:border-primary-black-700",
              className
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-primary-black-600 dark:text-primary-black-300">
                Recent Performance & Stats
              </div>
              
              {sportsbookLogo && (
                <div className="flex items-center bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">Odds by</div>
                  <div className="h-5 w-16 relative">
                    <Image 
                      src={sportsbookLogo}
                      alt="DraftKings"
                      fill
                      sizes="64px"
                      className="object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Performance Graph */}
              <div className="md:col-span-2 bg-white dark:bg-primary-black-800 rounded-lg p-4 border border-primary-black-200 dark:border-primary-black-700 shadow-sm">
                <h4 className="text-sm font-medium text-primary-black-600 dark:text-primary-black-300 mb-3">
                  Recent Performance
                </h4>
                <div className="h-64">
                  {player.games && player.games.length > 0 ? (
                    <PlayerPerformanceBarChart
                      games={player.games.slice(0, 10)}
                      statType={player.stat_type}
                      line={player.line || 0}
                      title=""
                      showTrend={false}
                      className="border-none shadow-none p-0"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-primary-black-400">
                      No game data available
                    </div>
                  )}
                </div>
                {hasLimitedData && (
                  <div className="mt-2 text-xs text-amber-500 dark:text-amber-400 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Limited data available
                  </div>
                )}
              </div>
              
              {/* Hit Rate Progress and Streak & Stats - in the third column */}
              <div className="space-y-4">
                {/* Hit Rate Progress */}
                <div className="bg-white dark:bg-primary-black-800 rounded-lg p-4 border border-primary-black-200 dark:border-primary-black-700 shadow-sm">
                  <h4 className="text-sm font-medium text-primary-black-600 dark:text-primary-black-300 mb-2">
                    Hit Rate
                  </h4>
                  <div className="mb-4">
                    <AnimatedProgressBar
                      value={hitRate * 100}
                      label={`${timeframe} Games`}
                      colorScheme={getHitRateColorScheme()}
                      valueFormatter={(val) => `${val.toFixed(0)}%`}
                    />
                  </div>
                  <div className="text-xs text-primary-black-500 dark:text-primary-black-400 mt-1">
                    {recommendedBetType === "OVER" 
                      ? `${hitRateData.hits}/${hitRateData.total} hits`
                      : `${hitRateData.total - hitRateData.hits}/${hitRateData.total} hits`}
                  </div>
                  <div className={cn(
                    "mt-2 text-sm font-medium",
                    recommendedBetType === "OVER" ? "text-green-600" : "text-red-600"
                  )}>
                    Recommendation: {recommendedBetType}
                  </div>
                </div>
                
                {/* Streak & Stats */}
                <div className="bg-white dark:bg-primary-black-800 rounded-lg p-4 border border-primary-black-200 dark:border-primary-black-700 shadow-sm">
                  <h4 className="text-sm font-medium text-primary-black-600 dark:text-primary-black-300 mb-2">
                    Current Streak
                  </h4>
                  <div className="flex items-center">
                    <div className={cn(
                      "text-2xl font-bold mr-2",
                      streak.type === 'OVER' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                    )}>
                      {streak.count}
                    </div>
                    <div className={cn(
                      "text-sm",
                      streak.type === 'OVER' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                    )}>
                      consecutive {streak.type.toLowerCase()}s
                    </div>
                  </div>
                  <div className="flex mt-3 space-x-1">
                    {Array.from({ length: Math.min(streak.count, 5) }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-2 flex-1 rounded-full",
                          streak.type === 'OVER' ? 'bg-green-500' : 'bg-red-500'
                        )}
                      />
                    ))}
                    {Array.from({ length: Math.max(0, 5 - streak.count) }).map((_, i) => (
                      <div
                        key={i + streak.count}
                        className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(player)
                }}
              >
                View Full Analysis
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Use React.memo to prevent unnecessary re-renders
export const PlayerRow = memo(PlayerRowComponent) 