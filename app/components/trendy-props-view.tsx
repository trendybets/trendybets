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
import { fetchPlayerOdds } from '../lib/api'
import { ProjectionsTable } from './projections-table'
import { TrendsTable } from './trends-table'

export default function TrendyPropsView() {
  const [filters, setFilters] = useState({
    stat: 'all',
    team: 'all',
  })
  const [playerOdds, setPlayerOdds] = useState<PlayerData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [fixtureLimit, setFixtureLimit] = useState(2) // Start with 2 fixtures

  useEffect(() => {
    async function loadPlayerOdds() {
      try {
        setIsLoading(true)
        setError(null)
        setErrorDetails(null)
        const odds = await fetchPlayerOdds(fixtureLimit)
        console.log('Fetched odds:', odds) // Debug log
        setPlayerOdds(odds || [])
        // If we got data back, assume there might be more
        setHasMore(odds && odds.length > 0)
      } catch (err) {
        console.error('Error loading player odds:', err)
        setError(err instanceof Error ? err.message : 'Failed to load player odds')
        setErrorDetails(err instanceof Error && err.stack ? err.stack : null)
        setPlayerOdds([])
        setHasMore(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadPlayerOdds()
  }, [fixtureLimit])

  // Function to load more fixtures
  const loadMore = () => {
    setFixtureLimit(prev => prev + 2) // Increase by 2 fixtures each time
  }

  // Get filtered data
  const filteredData = useMemo(() => {
    console.log('Filtering data from playerOdds:', playerOdds) // Debug log with full data
    let filtered = [...(playerOdds || [])]

    // Filter out any items with invalid data
    filtered = filtered.filter(item => {
      const isValid = item && 
        item.player && 
        item.stat_type && 
        typeof item.line === 'number' &&
        item.averages &&
        typeof (item.averages as any).last5 === 'number' &&
        typeof (item.averages as any).last10 === 'number' &&
        typeof (item.averages as any).season === 'number' &&
        item.hit_rates &&
        typeof (item.hit_rates as any).last5 === 'number' &&
        typeof (item.hit_rates as any).last10 === 'number' &&
        typeof (item.hit_rates as any).season === 'number';
      
      if (!isValid) {
        console.log('Invalid item:', item);
      }
      return isValid;
    });

    // Apply stat type filter
    if (filters.stat !== 'all') {
      filtered = filtered.filter(item => 
        item.stat_type.toLowerCase() === filters.stat.toLowerCase()
      );
    }

    // Apply team filter
    if (filters.team !== 'all') {
      filtered = filtered.filter(item => 
        item.player.team.toLowerCase() === filters.team.toLowerCase()
      );
    }

    return filtered;
  }, [playerOdds, filters]);

  // Update the teams list for the dropdown
  const availableTeams = useMemo(() => {
    const teams = new Set(playerOdds.map(odd => odd.player.team));
    return Array.from(teams).sort();
  }, [playerOdds]);

  // Update the stats list for the dropdown
  const availableStats = useMemo(() => {
    const stats = new Set(playerOdds.map(odd => odd.stat_type));
    return Array.from(stats).sort();
  }, [playerOdds]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="p-8 text-center text-gray-600">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2" />
          <div>Loading player odds...</div>
        </div>
      </div>
    )
  }

  if (playerOdds.length === 0) {
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
    <div className="container mx-auto p-4 space-y-6 bg-white min-h-screen">
      {/* Enhanced Header with Gradient Background */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-md mb-8">
        <div className="flex items-center p-6">
          <div className="flex items-center">
            <svg className="h-10 w-10 text-white mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Trendy Props</h1>
              <p className="text-blue-100 mt-1">Track player performance and betting trends</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Removed Filters Section */}

        {/* Trends Table First */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <TrendsTable data={filteredData} />
        </div>

        {/* Projections Table Second */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <ProjectionsTable data={filteredData} />
        </div>
      </div>

      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Trendy Props</h1>
          <div className="flex gap-4">
            <Select
              value={filters.stat}
              onValueChange={(value) => setFilters({ ...filters, stat: value })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stat Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stats</SelectItem>
                <SelectItem value="Points">Points</SelectItem>
                <SelectItem value="Rebounds">Rebounds</SelectItem>
                <SelectItem value="Assists">Assists</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.team}
              onValueChange={(value) => setFilters({ ...filters, team: value })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {Array.from(new Set(playerOdds.map(prop => prop.player.team))).sort().map(team => (
                  <SelectItem key={team} value={team}>{team}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error loading player props</p>
            <p>{error}</p>
            {errorDetails && (
              <details className="mt-2">
                <summary className="cursor-pointer">Error Details</summary>
                <pre className="mt-2 text-xs overflow-auto">{errorDetails}</pre>
              </details>
            )}
          </div>
        )}

        {isLoading && playerOdds.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Trending Props</h2>
                <TrendsTable data={filteredData} />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-4">Projections</h2>
                <ProjectionsTable data={filteredData} />
              </div>
            </div>
            
            {/* Load More Button */}
            {hasMore && !isLoading && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={loadMore}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Load More Fixtures'}
                </button>
              </div>
            )}
            
            {isLoading && playerOdds.length > 0 && (
              <div className="mt-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
} 