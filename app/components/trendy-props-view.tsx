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
    fixture: 'all',
  })
  const [playerOdds, setPlayerOdds] = useState<PlayerData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [fixtures, setFixtures] = useState<string[]>([])
  
  useEffect(() => {
    async function loadPlayerOdds() {
      try {
        setIsLoading(true)
        setError(null)
        setErrorDetails(null)
        
        // Fetch all available fixtures by setting limit to 0 (no limit)
        const odds = await fetchPlayerOdds(0) // Load all available fixtures
        console.log('Fetched odds:', odds.length, 'player entries') // Debug log
        
        // Check if we have games data and how many games per player
        if (odds && odds.length > 0) {
          const gamesCounts = odds.map(player => player.games?.length || 0);
          console.log('Games per player:', gamesCounts);
          // Add safety check before using spread operator
          if (gamesCounts.length > 0) {
            console.log('Max games available:', Math.max(...gamesCounts));
          } else {
            console.log('No games data available');
          }
          
          // Extract unique fixtures
          const fixtureSet = new Set<string>();
          odds.forEach(player => {
            if (player.next_game && player.next_game.opponent) {
              fixtureSet.add(`${player.player.team} vs ${player.next_game.opponent}`);
            }
          });
          
          const fixtureList = Array.from(fixtureSet);
          console.log('Available fixtures:', fixtureList);
          
          // Count players per fixture
          const fixturePlayerCounts: Record<string, number> = {};
          odds.forEach(player => {
            if (player.next_game && player.next_game.opponent) {
              const fixtureString = `${player.player.team} vs ${player.next_game.opponent}`;
              fixturePlayerCounts[fixtureString] = (fixturePlayerCounts[fixtureString] || 0) + 1;
            }
          });
          console.log('Players per fixture:', fixturePlayerCounts);
          
          setFixtures(fixtureList);
          
          // If there are multiple fixtures, set the default to "all" to show all players
          if (fixtureList.length > 1) {
            setFilters(prev => ({...prev, fixture: 'all'}));
          }
        }
        
        setPlayerOdds(odds || [])
      } catch (err) {
        console.error('Error loading player odds:', err)
        setError(err instanceof Error ? err.message : 'Failed to load player odds')
        setErrorDetails(err instanceof Error && err.stack ? err.stack : null)
        setPlayerOdds([])
      } finally {
        setIsLoading(false)
      }
    }

    loadPlayerOdds()
  }, []) // Only run on component mount

  // Get filtered data
  const filteredData = useMemo(() => {
    console.log('Filtering data from playerOdds:', playerOdds) // Debug log with full data
    // Ensure playerOdds is an array before using spread operator
    let filtered = Array.isArray(playerOdds) ? [...playerOdds] : [];

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
    
    // Apply fixture filter
    if (filters.fixture !== 'all') {
      filtered = filtered.filter(item => {
        if (!item.next_game || !item.next_game.opponent) return false;
        const fixtureString = `${item.player.team} vs ${item.next_game.opponent}`;
        return fixtureString === filters.fixture;
      });
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

  if (isLoading && playerOdds.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <div className="p-8 text-center text-gray-600">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2" />
          <div>Loading player odds...</div>
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
      
      {/* Debug Information */}
      <div className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-3 rounded mb-4">
        <details>
          <summary className="cursor-pointer font-medium">Debug Information</summary>
          <div className="mt-2 text-xs">
            <p><strong>Total Players:</strong> {playerOdds.length}</p>
            <p><strong>Available Fixtures:</strong> {fixtures.length}</p>
            <p><strong>Fixture Names:</strong> {fixtures.join(', ')}</p>
            <p><strong>Filtered Players:</strong> {filteredData.length}</p>
            <p><strong>Current Filters:</strong> Stat: {filters.stat}, Team: {filters.team}, Fixture: {filters.fixture}</p>
          </div>
        </details>
      </div>
      
      {/* Filters Section */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Fixture Filter */}
        {fixtures.length > 0 && (
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Fixture</label>
            <Select
              value={filters.fixture}
              onValueChange={(value) => setFilters({...filters, fixture: value})}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Fixtures" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fixtures</SelectItem>
                {fixtures.map((fixture) => (
                  <SelectItem key={fixture} value={fixture}>
                    {fixture}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Team Filter */}
        {availableTeams.length > 0 && (
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
            <Select
              value={filters.team}
              onValueChange={(value) => setFilters({...filters, team: value})}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {availableTeams.map((team) => (
                  <SelectItem key={team} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Stat Type Filter */}
        {availableStats.length > 0 && (
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Stat Type</label>
            <Select
              value={filters.stat}
              onValueChange={(value) => setFilters({...filters, stat: value})}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Props" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Props</SelectItem>
                {availableStats.map((stat) => (
                  <SelectItem key={stat} value={stat}>
                    {stat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-8">
        {/* Trends Table First */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <TrendsTable 
            data={filteredData} 
            isLoading={isLoading && playerOdds.length > 0} 
          />
        </div>

        {/* Projections Table Second */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <ProjectionsTable 
            data={filteredData} 
            isLoading={isLoading && playerOdds.length > 0}
          />
        </div>
      </div>
    </div>
  )
} 