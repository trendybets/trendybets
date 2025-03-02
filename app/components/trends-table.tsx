'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { PlayerData as BasePlayerData, NextGame, Player } from '../types'
import { cn } from '@/lib/utils'
import { PlayerAnalysisDialog } from './player-analysis-dialog'
import { PlayerData } from '../types'
import { ChevronDown, ChevronUp, Filter, Search, TrendingUp, AlertCircle } from 'lucide-react'
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
}

type TimeframeKey = 'last5' | 'last10' | 'last20'
type SortDirection = 'asc' | 'desc'

// Helper function for opponent team
const getOpponentTeam = (player: Player, nextGame: NextGame | undefined) => {
  if (!nextGame) return null;
  if (!nextGame.opponent) return null;
  
  if (nextGame.opponent === player.team) {
    return nextGame.home_team === player.team ? nextGame.away_team : nextGame.home_team;
  }
  return nextGame.opponent;
}

export function TrendsTable({ data, isLoading = false }: Omit<TrendsTableProps, 'hasMore' | 'onLoadMore'>) {
  // Default to Last 5 Games for initial load
  const [timeframe, setTimeframe] = useState('L5')
  const [statType, setStatType] = useState('All Props')
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null)
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  
  // Log the data we're receiving
  useEffect(() => {
    if (data && data.length > 0) {
      console.log(`TrendsTable received ${data.length} players`);
      console.log(`Sample player games count: ${data[0].games?.length || 0}`);
    }
  }, [data]);
  
  // Helper function to get timeframe number
  const getTimeframeNumber = (tf: string) => {
    if (tf === 'L5') return 5;
    if (tf === 'L10') return 10;
    if (tf === 'L20') return 20;
    return 20; // Default to 20 if unknown
  }

  // Helper function to get the correct stat value
  const getStatValue = (game: GameStats, statType: string) => {
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
  }

  // Helper function to calculate actual hits
  const calculateHits = (row: PlayerData, timeframeNumber: number) => {
    if (!row.games || row.games.length === 0) {
      return {
        hits: 0,
        total: 0,
        percentage: 0,
        direction: 'MORE',
        isStrong: false
      }
    }
    
    const games = row.games.slice(0, timeframeNumber)
    
    // Calculate hits for both OVER and UNDER
    const overHits = games.filter(game => {
      const statValue = getStatValue(game, row.stat_type)
      return statValue > row.line
    }).length

    const underHits = games.filter(game => {
      const statValue = getStatValue(game, row.stat_type)
      return statValue < row.line
    }).length

    // Determine which direction has more hits
    const useOver = overHits >= underHits
    const hitCount = useOver ? overHits : underHits
    const hitPercentage = games.length > 0 ? hitCount / games.length : 0
    
    // Determine if this is a strong trend (over 70%)
    const isStrong = hitPercentage >= 0.7

    return {
      hits: hitCount,
      total: games.length,
      percentage: hitPercentage,
      direction: useOver ? 'MORE' : 'LESS',
      isStrong
    }
  }
  
  // Get average stat value for a player
  const getAverageValue = (row: PlayerData, timeframeNumber: number) => {
    if (!row.games || row.games.length === 0) return 0
    
    const games = row.games.slice(0, timeframeNumber)
    const statValues = games.map(game => getStatValue(game, row.stat_type))
    return statValues.length ? 
      parseFloat((statValues.reduce((a, b) => a + b, 0) / statValues.length).toFixed(1)) : 
      0
  }

  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data]
    const timeframeNumber = getTimeframeNumber(timeframe)
    
    // Filter by stat type
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
      const aStats = calculateHits(a, timeframeNumber)
      const bStats = calculateHits(b, timeframeNumber)
      return bStats.percentage - aStats.percentage
    })
  }, [data, statType, timeframe, searchQuery])

  const columnHelper = createColumnHelper<PlayerData>()

  const columns = [
    // Player Column with Stats Narrative
    columnHelper.accessor('player', {
      header: 'TREND',
      cell: (info) => {
        const row = info.row.original
        const timeframeNumber = getTimeframeNumber(timeframe)
        const stats = calculateHits(row, timeframeNumber)
        
        // Get relevant game info
        const recentGames = row.games?.slice(0, timeframeNumber) || []
        const avgValue = getAverageValue(row, timeframeNumber)
        
        // Get line value differential
        const getLineDiff = () => {
          const diff = avgValue - row.line;
          const sign = diff > 0 ? '+' : '';
          return `${sign}${diff.toFixed(1)}`;
        }

        // Check if we're on a mobile device
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

        // Debug log to check what data we have
        console.log(`Player: ${info.getValue().name}, Timeframe: ${timeframe}, Games available: ${row.games?.length || 0}, Showing: ${recentGames.length}`);

        return (
          <div className="flex flex-col md:flex-row md:items-center w-full">
            {/* Top row for mobile - Player info and hit rate */}
            <div className="flex justify-between items-center w-full md:w-auto md:min-w-[280px] md:mr-4">
              {/* Player Image and Info */}
              <div className="flex items-center w-full">
                {/* Player Image */}
                <div className="relative mr-2 md:mr-3">
                  <img 
                    src={info.getValue().image_url}
                    alt={info.getValue().name}
                    className="h-8 w-8 md:h-10 md:w-10 rounded-full border border-gray-200 bg-gray-100"
                  />
                  {stats.isStrong && (
                    <div className={cn(
                      "absolute -top-1 -right-1 flex h-3 w-3 md:h-4 md:w-4 items-center justify-center rounded-full text-white",
                      stats.direction === 'MORE' ? "bg-green-500" : "bg-red-500"
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
                    <span className="font-medium text-sm md:text-base text-gray-900 truncate max-w-[180px] md:max-w-full">{info.getValue().name}</span>
                    <span className="text-xs text-gray-500 truncate max-w-[180px] md:max-w-full">{info.getValue().position} • {info.getValue().team}</span>
                  </div>
                </div>
              </div>

              {/* Hit Rate - Moved to top right on mobile */}
              <div className="md:hidden">
                <div className={cn(
                  "flex min-w-[2.5rem] h-6 px-2 items-center justify-center rounded-md text-xs font-semibold",
                  stats.percentage >= 0.9 ? "bg-green-500 text-white" : 
                  stats.percentage >= 0.7 ? "bg-green-500 text-white" : 
                  stats.percentage >= 0.6 ? "bg-green-400 text-white" : 
                  stats.percentage >= 0.5 ? "bg-yellow-400 text-gray-800" : 
                  "bg-red-500 text-white"
                )}>
                  {stats.total ? `${(stats.percentage * 100).toFixed(0)}%` : 'N/A'}
                </div>
              </div>
            </div>

            {/* Bottom row for mobile - Stats narrative */}
            <div className="mt-1 md:mt-0 md:flex md:items-center md:justify-between w-full">
              {/* Stats Narrative */}
              <div className="text-xs md:text-sm font-medium md:mr-3">
                <span className="text-black">Has gone</span> <span className={cn("font-bold", stats.direction === 'MORE' ? "text-green-600" : "text-red-600")}>{stats.direction === 'MORE' ? 'OVER' : 'UNDER'}</span> <span className="font-bold text-black">{row.line}</span> <span className="text-black">{row.stat_type} in</span> <span className="font-bold text-green-600">{stats.hits}</span> <span className="text-black">of</span> <span className="font-bold text-black">{stats.total}</span> <span className="text-black">games</span>
              </div>

              {/* Average Value - Stacked on mobile */}
              <div className="mt-1 md:mt-0 md:mr-3">
                <div className="bg-gray-50 px-2 py-0.5 md:px-3 rounded-md inline-flex text-xs md:text-sm">
                  <span className="font-medium text-gray-700">Avg: {avgValue}</span>
                  <span className={cn("ml-1 font-medium", 
                    avgValue > row.line ? "text-green-600" : "text-red-600"
                  )}>
                    ({getLineDiff()})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1 md:mt-0">
                {/* Performance Indicators - Smaller circles with dynamic count */}
                <div className="flex items-center flex-wrap gap-1 max-w-[150px] md:max-w-[450px] md:mr-6">
                  {recentGames.map((game, i) => {
                    const value = getStatValue(game, row.stat_type)
                    const isHit = stats.direction === 'MORE' ? value > row.line : value < row.line
                    
                    return (
                      <div 
                        key={i}
                        className={cn(
                          "h-3 w-3 md:h-4 md:w-4 rounded-full",
                          isHit 
                            ? "bg-green-500" 
                            : "bg-red-500"
                        )}
                      />
                    )
                  })}
                </div>

                {/* Hit Rate - Hidden on mobile (shown at top) */}
                <div className="hidden md:block">
                  <div className={cn(
                    "flex min-w-[3.5rem] h-7 px-2 items-center justify-center rounded-md text-sm font-semibold",
                    stats.percentage >= 0.9 ? "bg-green-500 text-white" : 
                    stats.percentage >= 0.7 ? "bg-green-500 text-white" : 
                    stats.percentage >= 0.6 ? "bg-green-400 text-white" : 
                    stats.percentage >= 0.5 ? "bg-yellow-400 text-gray-800" : 
                    "bg-red-500 text-white"
                  )}>
                    {stats.total ? `${(stats.percentage * 100).toFixed(0)}%` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    })
  ]

  const table = useReactTable({
    data: filteredAndSortedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
  
  // Render loading state
  if (isLoading && data.length === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"></div>
        <p className="mt-4 text-lg font-medium text-gray-600">Loading trends data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Header with Title and Filters */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-lg shadow-md">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center p-4 gap-3">
            <div className="flex items-center">
              <svg className="h-6 w-6 md:h-8 md:w-8 text-white mr-2 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">Trendy Bets Trends</h2>
                <p className="text-xs text-blue-100 mt-0.5">Historical performance insights</p>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative w-full md:max-w-xs">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
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
          </div>
        </div>

        {/* Table Content */}
        {filteredAndSortedData.length > 0 ? (
          <div className="max-h-[600px] overflow-y-auto">
            <div>
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr>
                    {table.getFlatHeaders().map(header => (
                      <th 
                        key={header.id}
                        className="bg-gray-50 px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {table.getRowModel().rows.map(row => (
                    <tr 
                      key={row.id}
                      className="border-t border-gray-100 transition-colors cursor-pointer hover:bg-blue-50"
                      onClick={() => setSelectedPlayer(row.original)}
                      onMouseEnter={() => setHoveredRowId(row.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-3 md:px-4 py-2 md:py-3">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-gray-400" />
            <h3 className="mt-3 text-base md:text-lg font-medium text-gray-900">No trends found</h3>
            <p className="mt-1 max-w-md text-xs md:text-sm text-gray-500">
              {searchQuery ? 
                `No players match your search criteria. Try adjusting your filters or search query.` : 
                `There are no available trends for the selected filters. Try changing the timeframe or stat type.`
              }
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-4 rounded-md border border-gray-300 bg-white px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      <PlayerAnalysisDialog 
        player={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </>
  )
} 