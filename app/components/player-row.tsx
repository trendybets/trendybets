'use client'

import React, { memo } from 'react'
import { PlayerData } from '../types'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, ChevronRight, Award } from 'lucide-react'
import Image from 'next/image'
import { getSafeImageUrl } from '@/lib/image-utils'
import { colors } from '@/app/styles/design-system'

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
  isHovered: boolean
  onHover: (isHovered: boolean) => void
  calculateHits: (row: PlayerData, timeframeNumber: number) => {
    hits: number
    total: number
    percentage: number
    direction: string
    isStrong: boolean
  }
  getTimeframeNumber: (tf: string) => number
  getAverageValue: (row: PlayerData, timeframeNumber: number) => number
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
  const timeframeNumber = getTimeframeNumber(timeframe)
  const stats = calculateHits(player, timeframeNumber)
  
  // Get relevant game info
  const recentGames = player.games?.slice(0, timeframeNumber) || []
  const avgValue = getAverageValue(player, timeframeNumber)
  
  // Get line value differential
  const lineDiff = avgValue - player.line
  const lineDiffFormatted = `${lineDiff > 0 ? '+' : ''}${lineDiff.toFixed(1)}`

  // Generate a unique ID for this row for ARIA purposes
  const rowId = `player-${player.player.id}-${player.stat_type}`
  
  // Get team colors for visual accents
  const teamColor = teamColors[player.player.team] || { primary: "#0072ff", secondary: "#f2f2f2" }
  
  // Format hit rate for display
  const hitRatePercent = Math.round(stats.percentage * 100)
  
  // Flag for insufficient data
  const hasInsufficientData = stats.total < timeframeNumber
  
  // Determine confidence level based on hit rate
  const getConfidenceLevel = () => {
    if (hasInsufficientData) return 'low' // Lower confidence when data is insufficient
    if (hitRatePercent >= 75) return 'very-high'
    if (hitRatePercent >= 65) return 'high'
    if (hitRatePercent >= 55) return 'medium'
    if (hitRatePercent >= 45) return 'low'
    if (hitRatePercent >= 35) return 'medium'
    if (hitRatePercent >= 25) return 'high'
    return 'very-high'
  }
  
  const confidenceLevel = getConfidenceLevel()
  
  // Get color for hit rate
  const getHitRateColor = () => {
    if (stats.direction === 'MORE') {
      if (hitRatePercent >= 75) return 'bg-semantic-success'
      if (hitRatePercent >= 65) return 'bg-green-500'
      if (hitRatePercent >= 55) return 'bg-green-400'
    } else {
      if (hitRatePercent <= 25) return 'bg-semantic-success'
      if (hitRatePercent <= 35) return 'bg-green-500'
      if (hitRatePercent <= 45) return 'bg-green-400'
    }
    return 'bg-primary-black-300'
  }
  
  const hitRateColor = getHitRateColor()
  
  // Get recommendation text
  const getRecommendation = () => {
    if (stats.direction === 'MORE') {
      return hitRatePercent >= 55 ? 'OVER' : 'UNDER'
    } else {
      return hitRatePercent <= 45 ? 'UNDER' : 'OVER'
    }
  }
  
  const recommendation = getRecommendation()
  
  // Format hit rate display based on recommendation
  const getHitRateDisplay = () => {
    if (recommendation === 'OVER') {
      // For OVER bets, show the actual hits
      return {
        hits: stats.hits,
        total: stats.total,
        percentage: hitRatePercent
      }
    } else {
      // For UNDER bets, show the inverse (misses)
      return {
        hits: stats.total - stats.hits,
        total: stats.total,
        percentage: 100 - hitRatePercent
      }
    }
  }
  
  const hitRateDisplay = getHitRateDisplay()

  return (
    <tr 
      id={rowId}
      className={cn(
        "border-t border-primary-black-100 dark:border-primary-black-700 transition-colors cursor-pointer",
        isHovered 
          ? "bg-primary-black-50 dark:bg-primary-black-800" 
          : "hover:bg-primary-black-50 dark:hover:bg-primary-black-800",
        className
      )}
      onClick={() => onSelect(player)}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(player)
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${player.player.name}, ${player.stat_type}`}
    >
      {/* Player Name and Image */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {/* Player Image with Team Color Border */}
          <div className="relative h-10 w-10 mr-3 flex-shrink-0">
            <div 
              className="absolute inset-0 rounded-full" 
              style={{ 
                background: `linear-gradient(135deg, ${teamColor.primary}, ${teamColor.secondary})`,
                padding: '2px'
              }}
            >
              <Image 
                src={getSafeImageUrl(player.player.image_url)}
                alt={player.player.name}
                width={40}
                height={40}
                className="rounded-full bg-white object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://cdn.opticodds.com/player-images/default.png";
                }}
              />
            </div>
            
            {/* Trend Indicator */}
            {stats.isStrong && (
              <div 
                className={cn(
                  "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white",
                  stats.direction === 'MORE' 
                    ? "bg-semantic-success" 
                    : "bg-semantic-error"
                )}
                aria-hidden="true"
              >
                {stats.direction === 'MORE' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
              </div>
            )}
          </div>
          
          {/* Player Name, Position and Team */}
          <div>
            <div className="font-medium text-primary-black-900 dark:text-primary-black-100">
              {player.player.name}
            </div>
            <div className="flex items-center text-xs text-primary-black-500 dark:text-primary-black-400">
              <span>{player.player.position}</span>
              <span className="mx-1">•</span>
              <div className="flex items-center">
                <div 
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: teamColor.primary }}
                ></div>
                <span>{player.player.team}</span>
              </div>
            </div>
          </div>
        </div>
      </td>
      
      {/* Prop Line - Merged Stat Type and Line */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-black-100 dark:bg-primary-black-700 text-primary-black-800 dark:text-primary-black-200 mr-2">
            {player.stat_type}
          </span>
          <span className="text-primary-black-800 dark:text-primary-black-200 font-medium">
            {player.line.toFixed(1)}
          </span>
          
          {/* Next Game Info - Small text below */}
          {player.next_game && (
            <div className="ml-2 text-xs text-primary-black-400 dark:text-primary-black-500">
              <span>vs {player.next_game.home_team === player.player.team ? player.next_game.away_team : player.next_game.home_team}</span>
            </div>
          )}
        </div>
      </td>
      
      {/* Average */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <span className="text-primary-black-800 dark:text-primary-black-200 font-medium">
            {avgValue.toFixed(1)}
          </span>
          <span 
            className={cn(
              "ml-2 text-xs px-1.5 py-0.5 rounded",
              lineDiff > 0 
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            )}
          >
            {lineDiffFormatted}
          </span>
        </div>
      </td>
      
      {/* Hit Rate */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="w-full">
          {/* Hit Rate Progress Bar */}
          <div className="w-full mb-2 bg-primary-black-100 dark:bg-primary-black-700 rounded-full h-2 overflow-hidden">
            <div 
              className={cn("h-full rounded-full", hitRateColor)}
              style={{ width: `${hitRateDisplay.percentage}%` }}
            ></div>
          </div>
          
          {/* Hit Rate Text with Recommendation Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Recommendation Badge */}
              <div className={cn(
                "mr-2 px-2 py-0.5 rounded-full text-xs font-semibold uppercase flex items-center",
                recommendation === 'OVER'
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
              )}>
                {recommendation === 'OVER' ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {recommendation}
              </div>
              
              {/* Hit Rate */}
              <div className="flex items-center text-xs">
                <span className={cn(
                  "font-medium",
                  hasInsufficientData 
                    ? "text-amber-500 dark:text-amber-400"
                    : "text-primary-black-700 dark:text-primary-black-300"
                )}>
                  {hasInsufficientData ? (
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 mr-1">
                        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                      </svg>
                      {hitRateDisplay.hits}/{hitRateDisplay.total}
                    </span>
                  ) : (
                    `${hitRateDisplay.hits}/${hitRateDisplay.total}`
                  )}
                </span>
                <span className="text-primary-black-500 dark:text-primary-black-400 ml-2">
                  ({hitRateDisplay.percentage}%)
                </span>
              </div>
            </div>
            
            {hasInsufficientData && (
              <span className="text-xs text-amber-500 dark:text-amber-400">
                Limited data
              </span>
            )}
          </div>
        </div>
      </td>
      
      {/* Action Indicator */}
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <ChevronRight className="h-5 w-5 text-primary-black-400 dark:text-primary-black-500" />
      </td>
    </tr>
  )
}

// Use React.memo to prevent unnecessary re-renders
export const PlayerRow = memo(PlayerRowComponent) 