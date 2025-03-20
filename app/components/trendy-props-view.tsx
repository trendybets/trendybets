'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from '@/lib/utils'
import { calculateProjection } from '../lib/projections'
import { PlayerData } from '../types'
import { DynamicTrendsTable } from './dynamic-trends-table'
import { CardSkeleton, StatsCardSkeleton } from "@/components/ui/skeleton"
import { usePlayerOdds, useFilters } from '@/lib/context/app-state'
import { fetchPlayerOddsData } from '@/lib/services/data-service'
import { ResponsiveContainer } from '@/components/ui/responsive-container'
import { ResponsiveGrid } from '@/components/ui/responsive-grid'
import { 
  ResponsiveCard, 
  ResponsiveCardHeader, 
  ResponsiveCardTitle, 
  ResponsiveCardContent,
  ResponsiveCardFooter
} from '@/components/ui/responsive-card'
import { ChevronLeft, ChevronRight, TrendingUp, BarChart3, Filter, RefreshCw } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { colors } from '@/app/styles/design-system'

export default function TrendyPropsView() {
  // Get state and actions from context
  const { 
    playerOdds, 
    isLoading, 
    error, 
    pagination, 
    setPlayerOdds, 
    setLoading, 
    setError, 
    setPagination, 
    setPage 
  } = usePlayerOdds()
  
  const { 
    filters, 
    fixtures, 
    setFilter, 
    setFixtures, 
    setTeams 
  } = useFilters()
  
  // Track if there are more pages to load
  const hasMore = pagination.page < pagination.totalPages
  
  // Track last refresh time
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  
  useEffect(() => {
    loadPlayerOdds()
  }, [pagination.page]) // Load new data when page changes
  
  // Define loadPlayerOdds as a standalone function so it can be called from the button
  const loadPlayerOdds = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch player odds with pagination
      const response = await fetchPlayerOddsData(pagination.page, pagination.pageSize)
      
      console.log('Fetched player odds:', {
        totalPlayers: response.data?.length || 0,
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
        uniqueFixtures: response.fixtures.length,
        uniqueTeams: response.teams.length,
        samplePlayer: response.data?.[0] ? {
          name: response.data[0].player.name,
          team: response.data[0].player.team,
          nextGame: response.data[0].next_game,
          gamesCount: response.data[0].games?.length || 0
        } : 'No players found'
      })
      
      // Update global state
      setPlayerOdds(response.data)
      setPagination(response.pagination)
      setFixtures(response.fixtures)
      setTeams(response.teams)
      setLastRefreshed(new Date())
    } catch (err) {
      console.error('Error loading player odds:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }
  
  // Function to load the next page of data
  const loadNextPage = () => {
    if (hasMore) {
      // Log that we're loading the next page with current filters
      console.log(`Loading next page with filters:`, filters);
      setPage(pagination.page + 1);
    }
  }
  
  // Function to load the previous page of data
  const loadPrevPage = () => {
    if (pagination.page > 1) {
      setPage(pagination.page - 1)
    }
  }
  
  // Function to refresh the data
  const refreshData = () => {
    loadPlayerOdds()
  }

  // Get filtered data
  const filteredData = useMemo(() => {
    return playerOdds.filter(item => {
      // Apply stat type filter
      if (filters.stat !== 'all' && item.stat_type.toLowerCase() !== filters.stat.toLowerCase()) {
        return false
      }
      
      // Apply team filter
      if (filters.team !== 'all' && item.player.team.toLowerCase() !== filters.team.toLowerCase()) {
        return false
      }
      
      // Apply fixture filter
      if (filters.fixture !== 'all') {
        if (!item.next_game || !item.next_game.home_team || !item.next_game.away_team) return false
        const fixtureString = `${item.next_game.home_team} vs ${item.next_game.away_team}`
        if (fixtureString !== filters.fixture) return false
      }
      
      return true
    })
  }, [playerOdds, filters])
  
  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalProps: 0,
        strongTrends: 0,
        averageHitRate: 0,
        topProp: null
      }
    }
    
    // Count strong trends (hit rate >= 70% or <= 30%)
    let strongTrendsCount = 0
    let totalHitRate = 0
    let topProp: PlayerData | null = null
    let highestConfidence = 0
    
    filteredData.forEach(prop => {
      // Calculate hit rate
      if (!prop.games || prop.games.length === 0) return
      
      const games = prop.games.slice(0, 10) // Use last 10 games
      let hits = 0
      games.forEach(game => {
        const value = prop.stat_type.toLowerCase() === 'points' 
          ? game.points 
          : prop.stat_type.toLowerCase() === 'assists'
            ? game.assists
            : game.total_rebounds
        
        if (value > prop.line) hits++
      })
      
      const hitRate = hits / games.length
      totalHitRate += hitRate
      
      // Check if it's a strong trend
      if (hitRate >= 0.7 || hitRate <= 0.3) {
        strongTrendsCount++
      }
      
      // Check if it's the top prop
      const confidence = Math.abs(hitRate - 0.5) * 2 // Scale to 0-1
      if (confidence > highestConfidence) {
        highestConfidence = confidence
        topProp = prop
      }
    })
    
    return {
      totalProps: filteredData.length,
      strongTrends: strongTrendsCount,
      averageHitRate: totalHitRate / filteredData.length,
      topProp
    }
  }, [filteredData])

  if (isLoading && playerOdds.length === 0) {
    return (
      <ResponsiveContainer padding="md">
        <div className="flex flex-col space-y-4 py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-black-900 dark:text-primary-black-100 font-sports">Trendy Props</h1>
          <p className="text-primary-black-700 dark:text-primary-black-300 font-medium">
            Player trends and statistics for upcoming games
          </p>
        </div>
        
        <ResponsiveGrid columns={{ xs: 1, md: 3 }} gap="md" className="mt-6">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </ResponsiveGrid>
        
        <ResponsiveCard elevated className="mt-8">
          <ResponsiveCardHeader>
            <div className="h-8 w-1/3 bg-primary-black-200 dark:bg-primary-black-700 animate-pulse rounded-md"></div>
          </ResponsiveCardHeader>
          <ResponsiveCardContent>
            <CardSkeleton className="mb-4" />
            <CardSkeleton className="mb-4" />
            <CardSkeleton className="mb-4" />
            <CardSkeleton className="mb-4" />
            <CardSkeleton />
          </ResponsiveCardContent>
        </ResponsiveCard>
      </ResponsiveContainer>
    )
  }

  if (playerOdds.length === 0 && !isLoading) {
    return (
      <ResponsiveContainer padding="md">
        <div className="flex flex-col space-y-4 py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-black-900 dark:text-primary-black-100 font-sports">Trendy Props</h1>
          <p className="text-primary-black-700 dark:text-primary-black-300 font-medium">
            Player trends and statistics for upcoming games
          </p>
        </div>
        
        <ResponsiveCard elevated className="p-8 text-center text-primary-black-600 dark:text-primary-black-400 mt-8">
          <div className="text-xl font-medium mb-2">No player odds available</div>
          <div className="text-sm mb-4">Please try again later</div>
          <Button onClick={refreshData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </ResponsiveCard>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer padding="md">
      <div className="flex flex-col space-y-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary-black-900 dark:text-primary-black-100 font-sports">Trendy Props</h1>
            <p className="text-primary-black-700 dark:text-primary-black-300 font-medium">
              Player trends and statistics for upcoming games
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center">
            <span className="text-xs text-primary-black-500 dark:text-primary-black-400 mr-2">
              Last updated: {lastRefreshed.toLocaleTimeString()}
            </span>
            <Button 
              onClick={refreshData} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold">Error Loading Data</h3>
          <p>{error}</p>
        </div>
      )}
      
      {/* Summary Cards */}
      <ResponsiveGrid columns={{ xs: 1, md: 2 }} gap="md" className="mt-6">
        {/* Total Props Card */}
        <ResponsiveCard className="border border-primary-black-200 dark:border-primary-black-700 shadow-sm overflow-hidden">
          <ResponsiveCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-black-500 dark:text-primary-black-400">Total Props</p>
                <h3 className="text-3xl font-bold text-primary-black-900 dark:text-primary-black-100 mt-1">
                  {summaryStats.totalProps}
                </h3>
                <p className="text-xs text-primary-black-500 dark:text-primary-black-400 mt-1">
                  {filters.stat !== 'all' ? `Filtered by ${filters.stat}` : 'All prop types'}
                </p>
              </div>
              <div className="h-12 w-12 bg-primary-blue-100 dark:bg-primary-blue-900/30 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary-blue-500 dark:text-primary-blue-400" />
              </div>
            </div>
          </ResponsiveCardContent>
        </ResponsiveCard>
        
        {/* Strong Trends Card */}
        <ResponsiveCard className="border border-primary-black-200 dark:border-primary-black-700 shadow-sm overflow-hidden">
          <ResponsiveCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-black-500 dark:text-primary-black-400">Strong Trends</p>
                <h3 className="text-3xl font-bold text-primary-black-900 dark:text-primary-black-100 mt-1">
                  {summaryStats.strongTrends}
                </h3>
                <p className="text-xs text-primary-black-500 dark:text-primary-black-400 mt-1">
                  {Math.round((summaryStats.strongTrends / summaryStats.totalProps) * 100) || 0}% of total props
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-semantic-success dark:text-green-400" />
              </div>
            </div>
          </ResponsiveCardContent>
        </ResponsiveCard>
      </ResponsiveGrid>

      <ResponsiveCard elevated className="p-0 mt-8 overflow-hidden border border-primary-black-200 dark:border-primary-black-700 shadow-sm">
        <DynamicTrendsTable 
          data={filteredData} 
          isLoading={isLoading && playerOdds.length > 0}
          hasMore={hasMore}
          onLoadMore={loadNextPage}
          availableTeams={fixtures}
          availableFixtures={fixtures}
          filters={filters}
          setFilters={(newFilters) => {
            // Update each filter individually
            Object.entries(newFilters).forEach(([key, value]) => {
              setFilter(key as 'stat' | 'team' | 'fixture', value)
            })
          }}
        />
      </ResponsiveCard>

      {/* Pagination controls */}
      <div className="mt-6 mb-8 flex items-center justify-between bg-white dark:bg-primary-black-800 p-4 rounded-lg border border-primary-black-200 dark:border-primary-black-700 shadow-sm">
        <Button
          onClick={loadPrevPage}
          disabled={pagination.page <= 1 || isLoading}
          variant="outline"
          size="sm"
          className={cn(
            "transition-all duration-200",
            pagination.page <= 1 && "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        
        <span className="text-sm text-center py-2 font-medium text-primary-black-700 dark:text-primary-black-300">
          Page {pagination.page} of {pagination.totalPages || 1} 
          <span className="hidden sm:inline"> ({pagination.total} total players)</span>
        </span>
        
        <Button
          onClick={loadNextPage}
          disabled={!hasMore || isLoading}
          variant="outline"
          size="sm"
          className={cn(
            "transition-all duration-200",
            !hasMore && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      {/* Add padding at the bottom for mobile navigation */}
      <div className="h-16 md:h-0"></div>
    </ResponsiveContainer>
  )
} 