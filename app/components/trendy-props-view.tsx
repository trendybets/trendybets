'use client'

import { useEffect, useMemo } from 'react'
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
import { TrendsTable } from './trends-table'
import { CardSkeleton, StatsCardSkeleton } from "@/components/ui/skeleton"
import { usePlayerOdds, useFilters } from '@/lib/context/app-state'
import { fetchPlayerOddsData } from '@/lib/services/data-service'

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
      setPage(pagination.page + 1)
    }
  }
  
  // Function to load the previous page of data
  const loadPrevPage = () => {
    if (pagination.page > 1) {
      setPage(pagination.page - 1)
    }
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

  if (isLoading && playerOdds.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-4">
          <h1 className="text-3xl font-bold text-black sports-heading">Trendy Props</h1>
          <p className="text-gray-700 font-medium sports-subheading">
            Player trends and statistics for upcoming games
          </p>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
        
        <div className="mt-8 sports-card sports-card-elevated">
          <div className="p-4 border-b border-gray-200">
            <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded-md"></div>
          </div>
          <div className="p-4">
            <CardSkeleton className="mb-4" />
            <CardSkeleton className="mb-4" />
            <CardSkeleton className="mb-4" />
            <CardSkeleton className="mb-4" />
            <CardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (playerOdds.length === 0 && !isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="p-8 text-center text-gray-600">
          <div className="text-xl font-medium mb-2">No player odds available</div>
          <div className="text-sm">Please try again later</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold text-black sports-heading">Trendy Props</h1>
        <p className="text-gray-700 font-medium sports-subheading">
          Player trends and statistics for upcoming games
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6 sports-alert sports-alert-error">
          <h3 className="text-lg font-semibold">Error Loading Data</h3>
          <p>{error}</p>
        </div>
      )}

      <div className="sports-card sports-card-elevated">
        <TrendsTable 
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
      </div>

      {/* Pagination controls */}
      <div className="flex justify-between items-center mt-6 mb-4">
        <button
          onClick={loadPrevPage}
          disabled={pagination.page <= 1}
          className={cn(
            "px-4 py-2 rounded-md",
            pagination.page <= 1 
              ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
              : "bg-blue-500 text-white hover:bg-blue-600"
          )}
        >
          Previous
        </button>
        
        <span className="text-sm">
          Page {pagination.page} of {pagination.totalPages || 1} 
          ({pagination.total} total players)
        </span>
        
        <button
          onClick={loadNextPage}
          disabled={!hasMore}
          className={cn(
            "px-4 py-2 rounded-md",
            !hasMore 
              ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
              : "bg-blue-500 text-white hover:bg-blue-600"
          )}
        >
          Next
        </button>
      </div>
    </div>
  )
} 