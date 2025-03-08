'use client'

import React, { memo } from 'react'
import { PlayerData } from '../types'
import { cn } from '@/lib/utils'
import { TrendingUp, ChevronDown } from 'lucide-react'

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

  return (
    <tr 
      className={cn(
        "border-t border-gray-100 transition-colors cursor-pointer hover:bg-blue-50",
        isHovered && "bg-blue-50"
      )}
      onClick={() => onSelect(player)}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <td className="px-3 md:px-4 py-2 md:py-3">
        <div className="flex flex-col md:flex-row md:items-center w-full">
          {/* Top row for mobile - Player info and hit rate */}
          <div className="flex justify-between items-center w-full md:w-auto md:min-w-[280px] md:mr-4">
            {/* Player Image and Info */}
            <div className="flex items-center w-full">
              {/* Player Image */}
              <div className="relative mr-2 md:mr-3">
                <img 
                  src={player.player.image_url}
                  alt={player.player.name}
                  className="h-8 w-8 md:h-10 md:w-10 rounded-full border border-gray-200 bg-gray-100 team-logo"
                />
                {stats.isStrong && (
                  <div className={cn(
                    "absolute -top-1 -right-1 flex h-3 w-3 md:h-4 md:w-4 items-center justify-center rounded-full text-white trend-indicator",
                    stats.direction === 'MORE' ? "trend-indicator-up" : "trend-indicator-down"
                  )}>
                    {stats.direction === 'MORE' ? (
                      <TrendingUp className="h-2 w-2 md:h-2.5 md:w-2.5" />
                    ) : (
                      <ChevronDown className="h-2 w-2 md:h-2.5 md:w-2.5" />
                    )}
                  </div>
                )}
              </div>
              
              {/* Player Info */}
              <div className="flex-1 min-w-0 md:min-w-[240px]">
                <div className="flex flex-col md:flex-row md:items-baseline md:space-x-1">
                  <span className="font-medium text-sm md:text-base text-gray-900 truncate max-w-[180px] md:max-w-none player-name">{player.player.name}</span>
                  <span className="text-xs text-gray-500 truncate max-w-[180px] md:max-w-none team-pill">{player.player.position} • {player.player.team}</span>
                </div>
              </div>
            </div>

            {/* Hit Rate - Moved to top right on mobile */}
            <div className="md:hidden">
              <div className={cn(
                "odds-badge",
                stats.percentage >= 0.7 ? "odds-badge-positive" : 
                stats.percentage >= 0.5 ? "odds-badge-neutral" : 
                "odds-badge-negative"
              )}>
                {(stats.percentage * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Bottom row for mobile - Trend narrative */}
          <div className="mt-1 md:mt-0 md:flex-1 text-xs md:text-sm text-gray-600 trend-narrative">
            <span className="font-medium">{player.stat_type} {player.line}</span>
            <span> | Avg: {avgValue.toFixed(1)} ({lineDiffFormatted})</span>
            <span> | {stats.hits}/{stats.total} games</span>
          </div>
        </div>
      </td>
      
      {/* Hit Rate - Desktop */}
      <td className="hidden md:table-cell px-3 md:px-4 py-2 md:py-3 text-center">
        <div className={cn(
          "odds-badge",
          stats.percentage >= 0.7 ? "odds-badge-positive" : 
          stats.percentage >= 0.5 ? "odds-badge-neutral" : 
          "odds-badge-negative"
        )}>
          {(stats.percentage * 100).toFixed(0)}%
        </div>
      </td>
      
      {/* Line */}
      <td className="hidden md:table-cell px-3 md:px-4 py-2 md:py-3 text-center">
        <span className="text-sm font-medium text-gray-900">{player.line}</span>
      </td>
      
      {/* Average */}
      <td className="hidden md:table-cell px-3 md:px-4 py-2 md:py-3 text-center">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{avgValue.toFixed(1)}</span>
          <span className={cn(
            "text-xs",
            lineDiff > 0 ? "text-green-600" : lineDiff < 0 ? "text-red-600" : "text-gray-500"
          )}>
            {lineDiffFormatted}
          </span>
        </div>
      </td>
      
      {/* Hit Count */}
      <td className="hidden md:table-cell px-3 md:px-4 py-2 md:py-3 text-center">
        <span className="text-sm font-medium text-gray-900">{stats.hits}/{stats.total}</span>
      </td>
      
      {/* Prop Type */}
      <td className="hidden md:table-cell px-3 md:px-4 py-2 md:py-3 text-center">
        <span className="text-sm text-gray-900">{player.stat_type}</span>
      </td>
    </tr>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const PlayerRow = memo(PlayerRowComponent) 