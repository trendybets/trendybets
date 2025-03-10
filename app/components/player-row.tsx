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
  getAverageValue
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
  
  // Determine confidence level based on hit rate
  const getConfidenceLevel = () => {
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

  return (
    <tr 
      id={rowId}
      className={cn(
        "border-t border-primary-black-100 dark:border-primary-black-700 transition-colors cursor-pointer",
        isHovered 
          ? "bg-primary-black-50 dark:bg-primary-black-800" 
          : "hover:bg-primary-black-50 dark:hover:bg-primary-black-800"
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
          
          {/* Player Name and Position */}
          <div>
            <div className="font-medium text-primary-black-900 dark:text-primary-black-100">
              {player.player.name}
            </div>
            <div className="text-xs text-primary-black-500 dark:text-primary-black-400">
              {player.player.position}
            </div>
          </div>
        </div>
      </td>
      
      {/* Team */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div 
            className="w-4 h-4 rounded-full mr-2"
            style={{ backgroundColor: teamColor.primary }}
          ></div>
          <span className="text-primary-black-800 dark:text-primary-black-200">
            {player.player.team}
          </span>
        </div>
      </td>
      
      {/* Next Game */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-primary-black-800 dark:text-primary-black-200">
          {player.next_game ? (
            <div className="flex flex-col">
              <span>{player.next_game.home_team} vs {player.next_game.away_team}</span>
              <span className="text-xs text-primary-black-500 dark:text-primary-black-400">
                {new Date(player.next_game.date).toLocaleDateString()}
              </span>
            </div>
          ) : (
            <span className="text-primary-black-400 dark:text-primary-black-500">No upcoming game</span>
          )}
        </div>
      </td>
      
      {/* Stat Type */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-black-100 dark:bg-primary-black-700 text-primary-black-800 dark:text-primary-black-200">
          {player.stat_type}
        </span>
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
      
      {/* Line */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-primary-black-800 dark:text-primary-black-200 font-medium">
          {player.line.toFixed(1)}
        </span>
      </td>
      
      {/* Hit Rate */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          {/* Hit Rate Bar */}
          <div className="w-full bg-primary-black-100 dark:bg-primary-black-700 rounded-full h-2.5 mb-1">
            <div 
              className={cn("h-2.5 rounded-full", hitRateColor)}
              style={{ width: `${hitRatePercent}%` }}
            ></div>
          </div>
          
          {/* Hit Rate Text */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-primary-black-500 dark:text-primary-black-400">
              {stats.hits}/{stats.total} ({hitRatePercent}%)
            </span>
            
            {/* Recommendation */}
            <div 
              className={cn(
                "flex items-center text-xs font-medium px-1.5 py-0.5 rounded",
                confidenceLevel === 'very-high' || confidenceLevel === 'high'
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-primary-black-100 text-primary-black-600 dark:bg-primary-black-700 dark:text-primary-black-300"
              )}
            >
              {(confidenceLevel === 'very-high' || confidenceLevel === 'high') && (
                <Award className="h-3 w-3 mr-1" />
              )}
              {recommendation}
            </div>
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