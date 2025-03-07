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
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  
  useEffect(() => {
    loadPlayerOdds();
  }, [page]); // Load new data when page changes
  
  // Define loadPlayerOdds as a standalone function so it can be called from the button
  const loadPlayerOdds = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setErrorDetails(null)
      
      // Fetch player odds with pagination
      const response = await fetchPlayerOdds(0, page, pagination.pageSize)
      const odds = response.data
      
      console.log('Fetched player odds:', {
        totalPlayers: odds?.length || 0,
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
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
      
      // Update player odds and pagination state
      setPlayerOdds(odds || [])
      setPagination(response.pagination)
      setHasMore(page < response.pagination.totalPages)
      
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
      
      setFixtures(fixtureList);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading player odds:', err);
      setError('Failed to load player odds data');
      setErrorDetails(err instanceof Error ? err.message : String(err));
      setIsLoading(false);
    }
  };
  
  // Function to load the next page of data
  const loadNextPage = () => {
    if (hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  };
  
  // Function to load the previous page of data
  const loadPrevPage = () => {
    if (page > 1) {
      setPage(prevPage => prevPage - 1);
    }
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
          {errorDetails && <pre className="mt-2 text-xs bg-red-100 p-2 rounded">{errorDetails}</pre>}
        </div>
      )}

      <div className="sports-card sports-card-elevated">
        <TrendsTable 
          data={filteredData} 
          isLoading={isLoading && playerOdds.length > 0}
          hasMore={hasMore}
          onLoadMore={loadNextPage}
          availableTeams={availableTeams}
          availableFixtures={fixtures}
          filters={filters}
          setFilters={setFilters}
        />
      </div>

      {/* Pagination controls */}
      <div className="flex justify-between items-center mt-6 mb-4">
        <button
          onClick={loadPrevPage}
          disabled={page <= 1}
          className={cn(
            "px-4 py-2 rounded-md",
            page <= 1 
              ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
              : "bg-blue-500 text-white hover:bg-blue-600"
          )}
        >
          Previous
        </button>
        
        <span className="text-sm">
          Page {page} of {pagination.totalPages || 1} 
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