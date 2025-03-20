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
    // Adjust threshold based on timeframe - longer timeframes should have more relaxed thresholds
    const overThreshold = timeframe === 'L20' ? 0.65 : timeframe === 'L10' ? 0.67 : 0.7;
    const underThreshold = timeframe === 'L20' ? 0.35 : timeframe === 'L10' ? 0.33 : 0.3;
    
    switch (viewMode) {
      case 'strong-over':
        filtered = filtered.filter(player => {
          const hitRateData = safeCalculateHits(player, timeframe)
          const hitRate = hitRateData.hits / Math.max(1, hitRateData.total)
          return hitRate >= overThreshold // Use the adaptive threshold
        })
        break
      case 'strong-under':
        filtered = filtered.filter(player => {
          const hitRateData = safeCalculateHits(player, timeframe)
          const hitRate = hitRateData.hits / Math.max(1, hitRateData.total)
          return hitRate <= underThreshold // Use the adaptive threshold
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
          // Get hit rates
          const aHitRateData = safeCalculateHits(a, timeframe);
          const bHitRateData = safeCalculateHits(b, timeframe);
          
          // Calculate raw hit rates (percentage of games going over)
          const aRawHitRate = aHitRateData.hits / Math.max(1, aHitRateData.total);
          const bRawHitRate = bHitRateData.hits / Math.max(1, bHitRateData.total);
          
          // Determine if each player is an over or under recommendation
          const aIsOver = aRawHitRate >= 0.55;
          const bIsOver = bRawHitRate >= 0.55;
          
          // Calculate the effective hit rate based on recommendation
          // For under bets, 0.2 is actually better than 0.3 (80% vs 70% wins)
          const aEffectiveRate = aIsOver ? aRawHitRate : 1 - aRawHitRate;
          const bEffectiveRate = bIsOver ? bRawHitRate : 1 - bRawHitRate;
          
          comparison = aEffectiveRate - bEffectiveRate;
          break;
        case 'average':
          const aAvg = safeGetAverageValue(a, timeframe)
          const bAvg = safeGetAverageValue(b, timeframe)
          comparison = aAvg - bAvg
          break;
        case 'line':
          comparison = a.line - b.line
          break;
        case 'name':
          comparison = a.player.name.localeCompare(b.player.name)
          break;
        case 'confidence':
          const confidenceOrder = { 'very-high': 4, 'high': 3, 'medium': 2, 'low': 1 }
          const aConfidence = a.recommended_bet ? confidenceOrder[a.recommended_bet.confidence] || 0 : 0
          const bConfidence = b.recommended_bet ? confidenceOrder[b.recommended_bet.confidence] || 0 : 0
          comparison = aConfidence - bConfidence
          break;
      }
      
      // Apply sort direction
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    return filtered
  }
  
  const displayData = getFilteredData()
  
  // Calculate stats about the displayed data with adaptive thresholds
  const tableStats = {
    total: displayData.length,
    strongOverTrends: displayData.filter(player => {
      const hitRateData = safeCalculateHits(player, timeframe)
      const hitRate = hitRateData.hits / Math.max(1, hitRateData.total)
      return hitRate >= (timeframe === 'L20' ? 0.65 : timeframe === 'L10' ? 0.67 : 0.7)
    }).length,
    strongUnderTrends: displayData.filter(player => {
      const hitRateData = safeCalculateHits(player, timeframe)
      const hitRate = hitRateData.hits / Math.max(1, hitRateData.total)
      return hitRate <= (timeframe === 'L20' ? 0.35 : timeframe === 'L10' ? 0.33 : 0.3)
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

  // Ensure sorting is correctly applied when data or filters change
  useEffect(() => {
    // Force a resort with current sort settings when data changes
    setSortKey(sortKey);
  }, [data, timeframe, viewMode, searchQuery]);
  
  // Clear selected player when timeframe changes to avoid showing stale data
  useEffect(() => {
    setSelectedPlayer(null);
  }, [timeframe]);

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

  // Add a timeframe change handler
  useEffect(() => {
    // Reset pagination data when timeframe changes
    if (onLoadMore && hasMore) {
      // There's no need to trigger immediate re-fetch here
      // Just make sure the loader is visible and will trigger on scroll
      const scrollableContainer = document.querySelector('.min-h-\\[400px\\]');
      if (scrollableContainer) {
        // Scroll back to the top when timeframe changes
        scrollableContainer.scrollTop = 0;
      }
    }
  }, [timeframe]); // Only re-run when timeframe changes

  // Setup the intersection observer for infinite scrolling
  useEffect(() => {
    if (!hasMore || isLoading || !loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          // Call onLoadMore with the current timeframe to ensure consistent data loading
          if (onLoadMore) {
            console.log(`Loading more data with timeframe: ${timeframe}`);
            onLoadMore();
          }
        }
      },
      { threshold: 0.1, rootMargin: '100px' } // More aggressive loading threshold
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasMore, isLoading, onLoadMore, timeframe, loaderRef]); // Include timeframe in dependencies

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

  // Creating a Tabs component for timeframe selection
  const TimeframeTabs = () => (
    <Tabs 
      value={timeframe} 
      onValueChange={(value) => {
        // When timeframe changes, update the timeframe state
        setTimeframe(value);
        
        // Reset to top of content area for better user experience
        const scrollableContainer = document.querySelector('.min-h-\\[400px\\]');
        if (scrollableContainer) {
          scrollableContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Log the timeframe change with current viewMode for debugging
        console.log(`Timeframe changed to: ${value}, current view mode: ${viewMode}`);
      }}
      className="bg-white border border-gray-200 rounded-md"
    >
      <TabsList className="bg-gray-50">
        <TabsTrigger value="L5" className="px-3 py-1.5 text-sm font-medium">L5</TabsTrigger>
        <TabsTrigger value="L10" className="px-3 py-1.5 text-sm font-medium">L10</TabsTrigger>
        <TabsTrigger value="L20" className="px-3 py-1.5 text-sm font-medium">L20</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  // Add a special effect to reset scroll position when viewMode or timeframe changes
  useEffect(() => {
    // Reset scroll position when any filter changes 
    const scrollableContainer = document.querySelector('.min-h-\\[400px\\]');
    if (scrollableContainer) {
      scrollableContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Reset selected player when filters change to avoid showing stale data
    setSelectedPlayer(null);
  }, [viewMode, timeframe]);

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Enhanced header with stats and filters */}
      <div className="border-b border-gray-200 bg-gray-50 p-5">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
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
                  <div className="flex items-center text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    <span className="font-medium">
                      {tableStats.strongOverTrends} Strong Over
                      {timeframe === 'L20' && <span className="text-xs ml-1 opacity-80">(65%+)</span>}
                      {timeframe === 'L10' && <span className="text-xs ml-1 opacity-80">(67%+)</span>}
                      {timeframe === 'L5' && <span className="text-xs ml-1 opacity-80">(70%+)</span>}
                    </span>
                  </div>
                  <div className="flex items-center text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    <span className="font-medium">
                      {tableStats.strongUnderTrends} Strong Under
                      {timeframe === 'L20' && <span className="text-xs ml-1 opacity-80">(35%-)</span>}
                      {timeframe === 'L10' && <span className="text-xs ml-1 opacity-80">(33%-)</span>}
                      {timeframe === 'L5' && <span className="text-xs ml-1 opacity-80">(30%-)</span>}
                    </span>
                  </div>
                  {tableStats.limitedData > 0 && (
                    <div className="flex items-center text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      <span className="font-medium">{tableStats.limitedData} Limited Data</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Use the TimeframeTabs component */}
            <TimeframeTabs />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
            {/* Search field */}
            <div className="relative flex-grow max-w-md">
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
                Over {viewMode === 'strong-over' && timeframe === 'L20' && "(65%+)"}
                {viewMode === 'strong-over' && timeframe === 'L10' && "(67%+)"}
                {viewMode === 'strong-over' && timeframe === 'L5' && "(70%+)"}
              </Button>
              <Button
                variant={viewMode === 'strong-under' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('strong-under')}
                className="rounded-none border-r-0"
              >
                Under {viewMode === 'strong-under' && timeframe === 'L20' && "(35%-)"}
                {viewMode === 'strong-under' && timeframe === 'L10' && "(33%-)"}
                {viewMode === 'strong-under' && timeframe === 'L5' && "(30%-)"}
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
      
      {/* Table header - Simplified */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider flex justify-between items-center">
        <span>Player Stats & Recommendations</span>
        <div className="flex items-center space-x-1">
          <span>Sorted by:</span>
          <button 
            onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="text-blue-600 flex items-center hover:underline"
          > 
            Hit Rate 
            <ChevronDown className={cn("ml-1 h-3 w-3", sortDirection === 'asc' ? "rotate-180" : "")} />
          </button>
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
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  onClick={() => setSelectedPlayer(row)}
                  className="border-b border-gray-100 last:border-0"
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
                className="py-6 px-4 flex justify-center items-center bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
              >
                <RefreshCw className="h-5 w-5 animate-spin text-primary-blue-500 mr-3" />
                <span className="text-gray-600 dark:text-gray-300 font-medium">Loading more results...</span>
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