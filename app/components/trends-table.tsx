'use client'

import { useMemo, useState, useRef, useEffect, Dispatch, SetStateAction, useCallback } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { PlayerData as BasePlayerData, NextGame, Player } from '../types'
import { cn } from '@/lib/utils'
import { DynamicPlayerAnalysisDialog } from './dynamic-player-analysis-dialog'
import { PlayerData } from '../types'
import { ChevronDown, ChevronUp, Filter, Search, TrendingUp, AlertCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TableSkeleton } from "@/components/ui/skeleton"
import { useFilters } from '@/lib/context/app-state'
import { PlayerRow } from './player-row'

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

// Helper function for opponent team - memoize with useCallback
const getOpponentTeam = (player: Player, nextGame: NextGame | undefined) => {
  if (!nextGame) return null;
  if (!nextGame.opponent) return null;
  
  if (nextGame.opponent === player.team) {
    return nextGame.home_team === player.team ? nextGame.away_team : nextGame.home_team;
  }
  return nextGame.opponent;
}

export function TrendsTable({ data, isLoading = false, hasMore = false, onLoadMore, availableTeams, availableFixtures, filters, setFilters }: TrendsTableProps) {
  // Default to Last 5 Games for initial load
  const [timeframe, setTimeframe] = useState('L5')
  const [statType, setStatType] = useState('All Props')
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null)
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  
  // Get additional state from context
  const { teams } = useFilters()
  
  // Memoize helper functions to prevent recreating them on each render
  const getTimeframeNumber = useCallback((tf: string) => {
    if (tf === 'L5') return 5;
    if (tf === 'L10') return 10;
    if (tf === 'L20') return 20;
    return 20; // Default to 20 if unknown
  }, []);

  // Helper function to get the correct stat value
  const getStatValue = useCallback((game: GameStats, statType: string) => {
    switch (statType.toLowerCase()) {
      case 'points':
        return game.points
      case 'assists':
        return game.assists
      case 'rebounds':
      case 'total_rebounds':
        return game.total_rebounds
      default:
        return 0
    }
  }, []);

  // Helper function to calculate actual hits
  const calculateHits = useCallback((row: PlayerData, timeframeNumber: number) => {
    if (!row.games || row.games.length === 0) {
      return {
        hits: 0,
        total: 0,
        percentage: 0,
        direction: 'MORE',
        isStrong: false
      }
    }
    
    // Get the relevant games based on timeframe
    const relevantGames = row.games.slice(0, timeframeNumber)
    
    // Count how many times the player went over their line
    let hits = 0
    relevantGames.forEach(game => {
      const statValue = row.stat_type.toLowerCase() === 'points' ? game.points : 
                        row.stat_type.toLowerCase() === 'assists' ? game.assists : 
                        game.total_rebounds
      
      if (statValue > row.line) {
        hits++
      }
    })
    
    const percentage = relevantGames.length > 0 ? hits / relevantGames.length : 0
    
    // Determine if this is a strong trend (>70% or <30%)
    const isStrong = percentage >= 0.7 || percentage <= 0.3
    
    // Determine direction of recommendation
    const direction = percentage >= 0.5 ? 'MORE' : 'LESS'
    
    return {
      hits,
      total: relevantGames.length,
      percentage,
      direction,
      isStrong
    }
  }, []);

  // Calculate average value for a player
  const getAverageValue = useCallback((row: PlayerData, timeframeNumber: number) => {
    if (!row.games || row.games.length === 0) return 0
    
    // Get the relevant games based on timeframe
    const relevantGames = row.games.slice(0, timeframeNumber)
    
    // Calculate the average
    let sum = 0
    relevantGames.forEach(game => {
      const statValue = row.stat_type.toLowerCase() === 'points' ? game.points : 
                        row.stat_type.toLowerCase() === 'assists' ? game.assists : 
                        game.total_rebounds
      
      sum += statValue
    })
    
    return relevantGames.length > 0 ? sum / relevantGames.length : 0
  }, []);

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (!hasMore || !onLoadMore || isLoading) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.5 }
    );
    
    const currentLoaderRef = loaderRef.current;
    if (currentLoaderRef) {
      observer.observe(currentLoaderRef);
    }
    
    return () => {
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef);
      }
    };
  }, [hasMore, onLoadMore, isLoading]);

  // Filter and sort data - memoized to prevent recalculation on every render
  const filteredAndSortedData = useMemo(() => {
    // Make a copy of the data to avoid mutating the original
    let filtered = [...data]
    
    // Apply stat type filter
    if (statType !== 'All Props') {
      filtered = filtered.filter(item => {
        // Handle both 'rebounds' and 'total_rebounds'
        if (statType.toLowerCase() === 'rebounds') {
          return item.stat_type.toLowerCase() === 'rebounds' || 
                 item.stat_type.toLowerCase() === 'total_rebounds';
        }
        return item.stat_type.toLowerCase() === statType.toLowerCase();
      });
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(item => 
        item.player.name.toLowerCase().includes(query) || 
        item.player.team.toLowerCase().includes(query) ||
        item.player.position.toLowerCase().includes(query)
      )
    }
    
    // Always sort by hit rate descending
    return filtered.sort((a, b) => {
      const aStats = calculateHits(a, getTimeframeNumber(timeframe))
      const bStats = calculateHits(b, getTimeframeNumber(timeframe))
      return bStats.percentage - aStats.percentage
    })
  }, [data, statType, timeframe, searchQuery, calculateHits, getTimeframeNumber]);

  // Memoize the handleRowHover function to prevent recreating it on each render
  const handleRowHover = useCallback((rowId: string, isHovered: boolean) => {
    setHoveredRowId(isHovered ? rowId : null);
  }, []);

  // Render the table with optimized components
  return (
    <div className="w-full">
      {/* Filters and Search Bar */}
      <div className="bg-gray-800 rounded-t-lg">
        <div className="p-4 border-b border-gray-700">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search player or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {/* Filters Row */}
        <div className="px-4 pb-4 flex flex-wrap items-center gap-3 md:gap-6">
          {/* Timeframe Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm text-white">Timeframe:</span>
            <div className="relative">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md py-1 md:py-2 pl-2 pr-8 md:pl-3 md:pr-10 text-xs md:text-sm leading-5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="L5">Last 5 Games</option>
                <option value="L10">Last 10 Games</option>
                <option value="L20">Last 20 Games</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-3 w-3 md:h-4 md:w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Stat Type Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm text-white">Prop type:</span>
            <div className="relative">
              <select
                value={statType}
                onChange={(e) => setStatType(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md py-1 md:py-2 pl-2 pr-8 md:pl-3 md:pr-10 text-xs md:text-sm leading-5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="All Props">All Props</option>
                <option value="Points">Points</option>
                <option value="Assists">Assists</option>
                <option value="Rebounds">Rebounds</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-3 w-3 md:h-4 md:w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Team Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm text-white">Team:</span>
            <div className="relative">
              <select
                value={filters?.team || 'all'}
                onChange={(e) => setFilters?.({ ...filters!, team: e.target.value })}
                className="appearance-none bg-white border border-gray-300 rounded-md py-1 md:py-2 pl-2 pr-8 md:pl-3 md:pr-10 text-xs md:text-sm leading-5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Teams</option>
                {teams.map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-3 w-3 md:h-4 md:w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Fixture Filter Dropdown - Only show if props are provided */}
          {filters && setFilters && availableFixtures && (
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm text-white">Game:</span>
              <div className="relative">
                <select
                  value={filters.fixture}
                  onChange={(e) => setFilters(prev => ({ ...prev, fixture: e.target.value }))}
                  className="appearance-none bg-white border border-gray-300 rounded-md py-1 md:py-2 pl-2 pr-8 md:pl-3 md:pr-10 text-xs md:text-sm leading-5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Games</option>
                  {availableFixtures.map(fixture => (
                    <option key={fixture} value={fixture}>{fixture}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="h-3 w-3 md:h-4 md:w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Content */}
      {isLoading && filteredAndSortedData.length === 0 ? (
        <div className="p-4">
          <TableSkeleton rows={10} columns={7} />
        </div>
      ) : filteredAndSortedData.length > 0 ? (
        <div className="max-h-[600px] overflow-y-auto">
          <div>
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th className="bg-gray-50 px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="hidden md:table-cell bg-gray-50 px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hit Rate
                  </th>
                  <th className="hidden md:table-cell bg-gray-50 px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Line
                  </th>
                  <th className="hidden md:table-cell bg-gray-50 px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average
                  </th>
                  <th className="hidden md:table-cell bg-gray-50 px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hits
                  </th>
                  <th className="hidden md:table-cell bg-gray-50 px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prop
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredAndSortedData.map((player) => (
                  <PlayerRow
                    key={`${player.player.id}-${player.stat_type}`}
                    player={player}
                    timeframe={timeframe}
                    onSelect={setSelectedPlayer}
                    isHovered={hoveredRowId === `${player.player.id}-${player.stat_type}`}
                    onHover={(isHovered) => handleRowHover(`${player.player.id}-${player.stat_type}`, isHovered)}
                    calculateHits={calculateHits}
                    getTimeframeNumber={getTimeframeNumber}
                    getAverageValue={getAverageValue}
                  />
                ))}
              </tbody>
            </table>
            
            {/* Infinite Scroll Loader */}
            {hasMore && (
              <div 
                ref={loaderRef} 
                className="py-4 flex justify-center items-center"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-sm text-gray-500">Loading more...</span>
                  </div>
                ) : (
                  <button
                    onClick={onLoadMore}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Load More
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500">
          <p className="text-lg">No results found</p>
          <p className="text-sm mt-2">Try adjusting your filters</p>
        </div>
      )}

      {/* Player Analysis Dialog */}
      <DynamicPlayerAnalysisDialog
        player={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  )
} 