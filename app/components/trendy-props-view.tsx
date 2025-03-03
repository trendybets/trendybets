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
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [allPlayerOdds, setAllPlayerOdds] = useState<PlayerData[]>([])
  const PAGE_SIZE = 20 // Number of players to show per page
  
  useEffect(() => {
    async function loadPlayerOdds() {
      try {
        setIsLoading(true)
        setError(null)
        setErrorDetails(null)
        
        // Fetch all available fixtures by setting limit to 0 (no limit)
        const odds = await fetchPlayerOdds(0) // Load all available fixtures
        
        console.log('Fetched player odds:', {
          totalPlayers: odds?.length || 0,
          uniqueFixtures: new Set(odds?.map(player => 
            player.next_game && player.next_game.opponent ? 
            `${player.player.team} vs ${player.next_game.opponent}` : 
            null
          ).filter(Boolean)).size,
          samplePlayer: odds?.[0] ? {
            name: odds[0].player.name,
            team: odds[0].player.team,
            nextGame: odds[0].next_game,
            gamesCount: odds[0].games?.length || 0
          } : 'No players found'
        });
        
        // Store all player odds for pagination
        setAllPlayerOdds(odds || [])
        
        // Set initial page of data
        setPlayerOdds(odds ? odds.slice(0, PAGE_SIZE) : [])
        setPage(1)
        setHasMore(odds && odds.length > PAGE_SIZE)
        
        // Extract unique fixtures
        const fixtureSet = new Set<string>();
        const fixtureMap = new Map<string, {id: string, display: string}>();
        
        odds.forEach(player => {
          if (player.next_game && player.next_game.home_team && player.next_game.away_team) {
            // Use the actual home and away teams from the fixture data
            const fixtureString = `${player.next_game.home_team} vs ${player.next_game.away_team}`;
            const fixtureId = player.next_game.fixture_id || 'unknown';
            
            // Only add if we haven't seen this fixture ID before
            if (!fixtureMap.has(fixtureId)) {
              fixtureSet.add(fixtureString);
              fixtureMap.set(fixtureId, {
                id: fixtureId,
                display: fixtureString
              });
              console.log(`Adding fixture: ${fixtureString} (ID: ${fixtureId}) for player ${player.player.name}`);
            }
          } else {
            console.warn(`Missing next_game data for player ${player.player.name}:`, player.next_game);
          }
        });
        
        const fixtureList = Array.from(fixtureSet);
        console.log('Extracted fixtures:', {
          fixtureCount: fixtureList.length,
          fixtures: fixtureList,
          fixtureMap: Array.from(fixtureMap.entries())
        });
        
        // Log a sample of players to see their next_game data
        const samplePlayers = odds.slice(0, 5);
        console.log('Sample players next_game data:', samplePlayers.map(player => ({
          name: player.player.name,
          team: player.player.team,
          next_game: player.next_game
        })));
        
        setFixtures(fixtureList);
        
        // If there are multiple fixtures, set the default to "all" to show all players
        if (fixtureList.length > 1) {
          console.log('Multiple fixtures found, setting default to "all"');
          setFilters(prev => ({...prev, fixture: 'all'}));
        } else {
          console.log('Only one fixture found, using it as default');
        }
      } catch (err) {
        console.error('Error loading player odds:', err)
        setError(err instanceof Error ? err.message : 'Failed to load player odds')
        setErrorDetails(err instanceof Error && err.stack ? err.stack : null)
        setPlayerOdds([])
        setAllPlayerOdds([])
        setHasMore(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadPlayerOdds()
  }, []) // Only run on component mount

  // Function to load more data when scrolling
  const loadMoreData = () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    
    // Get the filtered data based on current filters
    const filtered = getFilteredData(allPlayerOdds);
    
    // Calculate next page
    const nextPage = page + 1;
    const start = 0;
    const end = nextPage * PAGE_SIZE;
    
    // Get the next page of data
    const nextPageData = filtered.slice(start, end);
    
    // Update state
    setPlayerOdds(nextPageData);
    setPage(nextPage);
    setHasMore(end < filtered.length);
    setIsLoading(false);
  };

  // Function to get filtered data
  const getFilteredData = (data: PlayerData[]) => {
    // Ensure data is an array before using spread operator
    let filtered = Array.isArray(data) ? [...data] : [];

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
        if (!item.next_game || !item.next_game.home_team || !item.next_game.away_team) return false;
        const fixtureString = `${item.next_game.home_team} vs ${item.next_game.away_team}`;
        return fixtureString === filters.fixture;
      });
    }

    return filtered;
  };

  // Get filtered data
  const filteredData = useMemo(() => {
    const filtered = getFilteredData(playerOdds);
    console.log('Filtered data:', {
      beforeFilter: playerOdds.length,
      afterFilter: filtered.length,
      currentFilters: filters
    });
    return filtered;
  }, [playerOdds, filters]);

  // Update the teams list for the dropdown
  const availableTeams = useMemo(() => {
    const teams = new Set(allPlayerOdds.map(odd => odd.player.team));
    return Array.from(teams).sort();
  }, [allPlayerOdds]);

  // Update the stats list for the dropdown
  const availableStats = useMemo(() => {
    const stats = new Set(allPlayerOdds.map(odd => odd.stat_type));
    return Array.from(stats).sort();
  }, [allPlayerOdds]);

  // Reset pagination when filters change
  useEffect(() => {
    // Get the filtered data based on current filters
    const filtered = getFilteredData(allPlayerOdds);
    
    // Reset to first page
    setPage(1);
    setPlayerOdds(filtered.slice(0, PAGE_SIZE));
    setHasMore(filtered.length > PAGE_SIZE);
  }, [filters]);

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
      
      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Prop Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prop Type</label>
          <Select
            value={filters.stat}
            onValueChange={(value) => setFilters(prev => ({ ...prev, stat: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select prop type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Props</SelectItem>
              {availableStats.map(stat => (
                <SelectItem key={stat} value={stat.toLowerCase()}>{stat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Team Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
          <Select
            value={filters.team}
            onValueChange={(value) => setFilters(prev => ({ ...prev, team: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {availableTeams.map(team => (
                <SelectItem key={team} value={team.toLowerCase()}>{team}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Fixture Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fixture</label>
          <Select
            value={filters.fixture}
            onValueChange={(value) => setFilters(prev => ({ ...prev, fixture: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select fixture" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fixtures</SelectItem>
              {fixtures.map(fixture => (
                <SelectItem key={fixture} value={fixture}>{fixture}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Trends Table First */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <TrendsTable 
            data={filteredData} 
            isLoading={isLoading && playerOdds.length > 0}
            hasMore={hasMore}
            onLoadMore={loadMoreData}
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