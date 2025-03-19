'use client'

import { useEffect, useState } from 'react'
import { Search, Filter, ChevronDown, Info, TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlayerData } from '../types'
import { PlayerRow } from './player-row'
import { TableSkeleton } from '@/components/ui/skeleton'
import { DynamicPlayerAnalysisDialog } from './dynamic-player-analysis-dialog'
import { useTrendsTable } from '@/lib/hooks/use-trends-table'
import { Dispatch, SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { colors } from '@/app/styles/design-system'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface GameStats {
  points: number
  assists: number
  total_rebounds: number
  date: string
  opponent?: string
  is_away?: boolean
}

interface TrendsTableProps {
  data: PlayerData[]
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  availableTeams?: string[]
  availableFixtures?: string[]
  filters?: {
    stat: string
    team: string
    fixture: string
  }
  setFilters?: Dispatch<SetStateAction<{
    stat: string
    team: string
    fixture: string
  }>>
}

type TimeframeKey = 'last5' | 'last10' | 'last20'
type SortDirection = 'asc' | 'desc'
type SortKey = 'hit_rate' | 'average' | 'line' | 'name' | 'confidence'
type ViewMode = 'all' | 'strong-over' | 'strong-under' | 'home' | 'away'

export function TrendsTable({ data, isLoading = false, hasMore = false, onLoadMore, availableTeams, availableFixtures, filters, setFilters }: TrendsTableProps) {
  // Use the custom hook to manage state
  const {
    timeframe,
    statType,
    selectedPlayer,
    searchQuery,
    hoveredRowId,
    loaderRef,
    teams,
    filteredAndSortedData,
    setTimeframe,
    setStatType,
    setSelectedPlayer,
    setSearchQuery,
    handleRowHover,
    setupObserver,
    getTimeframeNumber,
    getAverageValue,
    calculateHits
  } = useTrendsTable({ data, isLoading, hasMore, onLoadMore })

  // State for mobile filter drawer
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  
  // State for sorting
  const [sortKey, setSortKey] = useState<SortKey>('hit_rate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  
  // State for view mode with updated default value
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  
  // Type assertion to resolve type mismatch - this tells TypeScript that we know what we're doing
  const typedCalculateHits = calculateHits as unknown as (player: PlayerData, timeframe: number) => { 
    hits: number; 
    total: number; 
    percentage: number; 
    direction: string; 
    isStrong: boolean;
  };
  
  const typedGetAverageValue = getAverageValue as unknown as (player: PlayerData, timeframe: number) => number;
  
  // Create type-safe wrapper functions for hook functions that expect number
  const safeCalculateHits = (player: PlayerData, timeframeStr: string) => {
    const timeframeNumber = getTimeframeNumber(timeframeStr);
    return typedCalculateHits(player, timeframeNumber);
  }
  
  const safeGetAverageValue = (player: PlayerData, timeframeStr: string) => {
    const timeframeNumber = getTimeframeNumber(timeframeStr);
    return typedGetAverageValue(player, timeframeNumber);
  }
  
  // Custom filtered data based on view mode
  const getFilteredData = () => {
    // Apply base filtering from the custom hook
    let filtered = [...filteredAndSortedData]
    
    // Apply additional filtering based on view mode
    switch (viewMode) {
      case 'strong-over':
        filtered = filtered.filter(player => {
          const hitRateData = safeCalculateHits(player, timeframe)
          const hitRate = hitRateData.hits / Math.max(1, hitRateData.total)
          return hitRate >= 0.7
        })
        break
      case 'strong-under':
        filtered = filtered.filter(player => {
          const hitRateData = safeCalculateHits(player, timeframe)
          const hitRate = hitRateData.hits / Math.max(1, hitRateData.total)
          return hitRate <= 0.3
        })
        break
      case 'home':
        filtered = filtered.filter(player => 
          player.next_game && player.player.team === player.next_game.home_team
        )
        break
      case 'away':
        filtered = filtered.filter(player => 
          player.next_game && player.player.team === player.next_game.away_team
        )
        break
      default:
        // 'all' - no additional filtering
        break
    }
    
    // Apply custom sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortKey) {
        case 'hit_rate':
          const aHitRate = safeCalculateHits(a, timeframe).hits / Math.max(1, safeCalculateHits(a, timeframe).total)
          const bHitRate = safeCalculateHits(b, timeframe).hits / Math.max(1, safeCalculateHits(b, timeframe).total)
          comparison = aHitRate - bHitRate
          break
        case 'average':
          const aAvg = safeGetAverageValue(a, timeframe)
          const bAvg = safeGetAverageValue(b, timeframe)
          comparison = aAvg - bAvg
          break
        case 'line':
          comparison = a.line - b.line
          break
        case 'name':
          comparison = a.player.name.localeCompare(b.player.name)
          break
        case 'confidence':
          const confidenceOrder = { 'very-high': 4, 'high': 3, 'medium': 2, 'low': 1 }
          const aConfidence = a.recommended_bet ? confidenceOrder[a.recommended_bet.confidence] || 0 : 0
          const bConfidence = b.recommended_bet ? confidenceOrder[b.recommended_bet.confidence] || 0 : 0
          comparison = aConfidence - bConfidence
          break
      }
      
      // Apply sort direction
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    return filtered
  }
  
  const displayData = getFilteredData()
  
  // Calculate stats about the displayed data
  const tableStats = {
    total: displayData.length,
    strongOverTrends: displayData.filter(player => {
      const hitRateData = safeCalculateHits(player, timeframe)
      const hitRate = hitRateData.hits / Math.max(1, hitRateData.total)
      return hitRate >= 0.7
    }).length,
    strongUnderTrends: displayData.filter(player => {
      const hitRateData = safeCalculateHits(player, timeframe)
      const hitRate = hitRateData.hits / Math.max(1, hitRateData.total)
      return hitRate <= 0.3
    }).length,
    limitedData: displayData.filter(player => {
      return player.games && player.games.length < getTimeframeNumber(timeframe)
    }).length
  }
  
  // Function to handle sorting
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      // Toggle direction if same key
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new key and reset direction to desc
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  // Define variants for animations
  const rowVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    hover: { backgroundColor: 'rgba(249, 250, 251, 0.1)', scale: 1.01 }
  }

  // Empty state component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="bg-gray-100 p-4 rounded-full mb-4">
        <Search className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-medium text-gray-900 mb-1">No trends found</h3>
      <p className="text-gray-500 max-w-md">
        Try adjusting your filters or search query to find more betting trends.
      </p>
    </div>
  )

  // Setup intersection observer for infinite scrolling
  useEffect(() => {
    return setupObserver()
  }, [setupObserver])

  // Filter options
  const statOptions = [
    { value: 'all', label: 'All Stats' },
    { value: 'points', label: 'Points' },
    { value: 'assists', label: 'Assists' },
    { value: 'rebounds', label: 'Rebounds' },
    { value: 'pts+reb+ast', label: 'PRA' },
    { value: 'pts+reb', label: 'PTS+REB' },
    { value: 'pts+ast', label: 'PTS+AST' },
    { value: 'reb+ast', label: 'REB+AST' },
    { value: 'blocks', label: 'Blocks' },
    { value: 'steals', label: 'Steals' },
    { value: 'turnovers', label: 'Turnovers' },
    { value: 'three_pointers_made', label: '3PT Made' },
  ]

  // Handle filter changes
  const handleFilterChange = (filterType: 'stat' | 'team' | 'fixture', value: string) => {
    if (setFilters && filters) {
      setFilters({
        ...filters,
        [filterType]: value
      })
    }
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Enhanced header with stats and filters */}
      <div className="border-b border-gray-200 bg-gray-50 p-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Betting Trends
              {!isLoading && (
                <span className="ml-2 text-sm text-gray-500">
                  ({displayData.length} players)
                </span>
              )}
            </h2>
            
            {/* Stats pills with updated terminology */}
            {!isLoading && displayData.length > 0 && (
              <div className="flex space-x-3 mt-2 text-xs">
                <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>{tableStats.strongOverTrends} Strong Over</span>
                </div>
                <div className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  <span>{tableStats.strongUnderTrends} Strong Under</span>
                </div>
                {tableStats.limitedData > 0 && (
                  <div className="flex items-center text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    <span>{tableStats.limitedData} Limited Data</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
            {/* Search field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search players or teams..."
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Timeframe tabs */}
            <Tabs 
              value={timeframe} 
              onValueChange={setTimeframe}
              className="bg-white border border-gray-200 rounded-md"
            >
              <TabsList className="bg-gray-50">
                <TabsTrigger value="L5" className="px-3 py-1 text-sm">L5</TabsTrigger>
                <TabsTrigger value="L10" className="px-3 py-1 text-sm">L10</TabsTrigger>
                <TabsTrigger value="L20" className="px-3 py-1 text-sm">L20</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* View mode filter with updated labels */}
            <div className="flex">
              <Button
                variant={viewMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('all')}
                className="rounded-l-md rounded-r-none border-r-0"
              >
                All
              </Button>
              <Button
                variant={viewMode === 'strong-over' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('strong-over')}
                className="rounded-none border-r-0"
              >
                Over
              </Button>
              <Button
                variant={viewMode === 'strong-under' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('strong-under')}
                className="rounded-none border-r-0"
              >
                Under
              </Button>
              <Button
                variant={viewMode === 'home' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('home')}
                className="rounded-none border-r-0"
              >
                Home
              </Button>
              <Button
                variant={viewMode === 'away' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('away')}
                className="rounded-r-md rounded-l-none"
              >
                Away
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Table header with better alignment */}
      <div className="border-b border-gray-200">
        <div className="flex items-center py-3 px-4 sm:px-6 bg-gray-50 text-sm font-medium text-gray-500">
          <div className="w-[40%] pl-10">
            <button
              className={cn(
                "flex items-center hover:text-gray-700",
                sortKey === 'name' && "text-indigo-600"
              )}
              onClick={() => handleSort('name')}
            >
              Player / Team
              <ChevronDown 
                className={cn(
                  "ml-1 h-4 w-4",
                  sortKey === 'name' && sortDirection === 'desc' && "rotate-180"
                )} 
              />
            </button>
          </div>
          <div className="w-[15%] flex justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center justify-center hover:text-gray-700",
                      sortKey === 'line' && "text-indigo-600"
                    )}
                    onClick={() => handleSort('line')}
                  >
                    Line
                    <ChevronDown 
                      className={cn(
                        "ml-1 h-4 w-4",
                        sortKey === 'line' && sortDirection === 'desc' && "rotate-180"
                      )} 
                    />
                    <Info className="ml-1 h-3 w-3 text-gray-400" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">The betting line for this prop</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="w-[15%] flex justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center justify-center hover:text-gray-700",
                      sortKey === 'average' && "text-indigo-600"
                    )}
                    onClick={() => handleSort('average')}
                  >
                    Avg
                    <ChevronDown 
                      className={cn(
                        "ml-1 h-4 w-4",
                        sortKey === 'average' && sortDirection === 'desc' && "rotate-180"
                      )} 
                    />
                    <Info className="ml-1 h-3 w-3 text-gray-400" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Average performance over the selected timeframe</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="w-[15%] flex justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center justify-center hover:text-gray-700",
                      sortKey === 'hit_rate' && "text-indigo-600"
                    )}
                    onClick={() => handleSort('hit_rate')}
                  >
                    Hit Rate
                    <ChevronDown 
                      className={cn(
                        "ml-1 h-4 w-4",
                        sortKey === 'hit_rate' && sortDirection === 'desc' && "rotate-180"
                      )} 
                    />
                    <Info className="ml-1 h-3 w-3 text-gray-400" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Percentage of games where the player went over the line</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="w-[15%] flex justify-center">
            <span className="text-xs font-medium uppercase tracking-wider">
              Details
            </span>
          </div>
        </div>
      </div>

      {/* Table body */}
      <div className="min-h-[400px]">
        {isLoading ? (
          <TableSkeleton rows={10} />
        ) : displayData.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {displayData.map((row, index) => (
                <motion.div
                  key={`${row.player.id}-${row.stat_type}`}
                  initial="hidden"
                  animate="visible"
                  variants={rowVariants}
                  whileHover="hover"
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  onClick={() => setSelectedPlayer(row)}
                  className="border-b border-gray-100 last:border-0 cursor-pointer"
                >
                  <PlayerRow 
                    player={row}
                    timeframe={timeframe}
                    isHovered={hoveredRowId === `${row.player.id}-${row.stat_type}`}
                    onHover={(isHovered) => 
                      handleRowHover(`${row.player.id}-${row.stat_type}`, isHovered)
                    }
                    calculateHits={safeCalculateHits}
                    getAverageValue={safeGetAverageValue}
                    getTimeframeNumber={getTimeframeNumber}
                    onSelect={setSelectedPlayer}
                  />
                </motion.div>
              ))}
            </div>
            {hasMore && (
              <div
                ref={loaderRef}
                className="flex justify-center items-center p-4 text-gray-400"
              >
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="ml-2">Loading more...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Player analysis dialog */}
      {selectedPlayer && (
        <DynamicPlayerAnalysisDialog
          player={selectedPlayer}
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  )
} 