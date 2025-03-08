'use client'

import { useEffect, useState } from 'react'
import { Search, Filter, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlayerData } from '../types'
import { PlayerRow } from './player-row'
import { TableSkeleton } from '@/components/ui/skeleton'
import { DynamicPlayerAnalysisDialog } from './dynamic-player-analysis-dialog'
import { useTrendsTable } from '@/lib/hooks/use-trends-table'
import { Dispatch, SetStateAction } from 'react'

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

  // Setup intersection observer for infinite scrolling
  useEffect(() => {
    return setupObserver()
  }, [setupObserver])

  // Render the table with optimized components
  return (
    <div className="w-full" role="region" aria-label="Player trends and statistics">
      {/* Filters and Search Bar */}
      <div className="bg-gray-800 rounded-t-lg">
        <div className="p-4 border-b border-gray-700">
          {/* Search and Filter Row */}
          <div className="flex items-center justify-between gap-2">
            {/* Search Bar */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                placeholder="Search player or team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Search players or teams"
              />
            </div>
            
            {/* Mobile Filter Toggle */}
            <button 
              className="md:hidden flex items-center justify-center p-2 bg-blue-600 text-white rounded-md"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              aria-expanded={showMobileFilters}
              aria-controls="mobile-filters"
            >
              <Filter className="h-4 w-4 mr-1" />
              <span>Filters</span>
              <ChevronDown className={cn(
                "h-4 w-4 ml-1 transition-transform",
                showMobileFilters ? "rotate-180" : ""
              )} />
            </button>
          </div>
        </div>
        
        {/* Filters Row - Desktop */}
        <div className="hidden md:flex px-4 pb-4 flex-wrap items-center gap-3 md:gap-6" role="group" aria-label="Filter options">
          {/* Timeframe Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="timeframe-filter" className="text-xs md:text-sm text-white">Timeframe:</label>
            <div className="relative">
              <select
                id="timeframe-filter"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md py-1 md:py-2 pl-2 pr-8 md:pl-3 md:pr-10 text-xs md:text-sm leading-5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Select timeframe"
              >
                <option value="L5">Last 5 Games</option>
                <option value="L10">Last 10 Games</option>
                <option value="L20">Last 20 Games</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700" aria-hidden="true">
                <svg className="h-3 w-3 md:h-4 md:w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Stat Type Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="stat-type-filter" className="text-xs md:text-sm text-white">Prop type:</label>
            <div className="relative">
              <select
                id="stat-type-filter"
                value={statType}
                onChange={(e) => setStatType(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md py-1 md:py-2 pl-2 pr-8 md:pl-3 md:pr-10 text-xs md:text-sm leading-5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Select prop type"
              >
                <option value="All Props">All Props</option>
                <option value="Points">Points</option>
                <option value="Assists">Assists</option>
                <option value="Rebounds">Rebounds</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700" aria-hidden="true">
                <svg className="h-3 w-3 md:h-4 md:w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Team Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="team-filter" className="text-xs md:text-sm text-white">Team:</label>
            <div className="relative">
              <select
                id="team-filter"
                value={filters?.team || 'all'}
                onChange={(e) => setFilters?.({ ...filters!, team: e.target.value })}
                className="appearance-none bg-white border border-gray-300 rounded-md py-1 md:py-2 pl-2 pr-8 md:pl-3 md:pr-10 text-xs md:text-sm leading-5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Select team"
              >
                <option value="all">All Teams</option>
                {teams.map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700" aria-hidden="true">
                <svg className="h-3 w-3 md:h-4 md:w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Fixture Filter Dropdown - Only show if props are provided */}
          {filters && setFilters && availableFixtures && (
            <div className="flex items-center gap-2">
              <label htmlFor="fixture-filter" className="text-xs md:text-sm text-white">Game:</label>
              <div className="relative">
                <select
                  id="fixture-filter"
                  value={filters.fixture}
                  onChange={(e) => setFilters(prev => ({ ...prev, fixture: e.target.value }))}
                  className="appearance-none bg-white border border-gray-300 rounded-md py-1 md:py-2 pl-2 pr-8 md:pl-3 md:pr-10 text-xs md:text-sm leading-5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Select game"
                >
                  <option value="all">All Games</option>
                  {availableFixtures.map(fixture => (
                    <option key={fixture} value={fixture}>{fixture}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700" aria-hidden="true">
                  <svg className="h-3 w-3 md:h-4 md:w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Mobile Filters - Collapsible */}
        <div 
          id="mobile-filters"
          className={cn(
            "md:hidden px-4 pb-4 flex flex-col gap-3 transition-all duration-300 overflow-hidden",
            showMobileFilters ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          {/* Timeframe Filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="mobile-timeframe-filter" className="text-xs text-white">Timeframe:</label>
            <select
              id="mobile-timeframe-filter"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="L5">Last 5 Games</option>
              <option value="L10">Last 10 Games</option>
              <option value="L20">Last 20 Games</option>
            </select>
          </div>
          
          {/* Stat Type Filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="mobile-stat-type-filter" className="text-xs text-white">Prop type:</label>
            <select
              id="mobile-stat-type-filter"
              value={statType}
              onChange={(e) => setStatType(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="All Props">All Props</option>
              <option value="Points">Points</option>
              <option value="Assists">Assists</option>
              <option value="Rebounds">Rebounds</option>
            </select>
          </div>
          
          {/* Team Filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="mobile-team-filter" className="text-xs text-white">Team:</label>
            <select
              id="mobile-team-filter"
              value={filters?.team || 'all'}
              onChange={(e) => setFilters?.({ ...filters!, team: e.target.value })}
              className="w-full appearance-none bg-white border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Teams</option>
              {teams.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
          
          {/* Fixture Filter */}
          {filters && setFilters && availableFixtures && (
            <div className="flex flex-col gap-1">
              <label htmlFor="mobile-fixture-filter" className="text-xs text-white">Game:</label>
              <select
                id="mobile-fixture-filter"
                value={filters.fixture}
                onChange={(e) => setFilters(prev => ({ ...prev, fixture: e.target.value }))}
                className="w-full appearance-none bg-white border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Games</option>
                {availableFixtures.map(fixture => (
                  <option key={fixture} value={fixture}>{fixture}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Table Content */}
      {isLoading && filteredAndSortedData.length === 0 ? (
        <div className="p-4" aria-live="polite" aria-busy="true">
          <TableSkeleton rows={10} columns={7} />
          <div className="sr-only">Loading player data...</div>
        </div>
      ) : filteredAndSortedData.length > 0 ? (
        <div className="max-h-[600px] overflow-y-auto">
          <div>
            <table className="w-full" aria-label="Player trends table">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th className="bg-gray-50 px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" scope="col">
                    Player
                  </th>
                  <th className="hidden md:table-cell bg-gray-50 px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" scope="col">
                    Hit Rate
                  </th>
                  <th className="hidden md:table-cell bg-gray-50 px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" scope="col">
                    Line
                  </th>
                  <th className="hidden md:table-cell bg-gray-50 px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" scope="col">
                    Average
                  </th>
                  <th className="hidden md:table-cell bg-gray-50 px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" scope="col">
                    Hits
                  </th>
                  <th className="hidden md:table-cell bg-gray-50 px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" scope="col">
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
                aria-live="polite"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2" aria-busy="true">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" aria-hidden="true"></div>
                    <span className="text-sm text-gray-500">Loading more...</span>
                  </div>
                ) : (
                  <button
                    onClick={onLoadMore}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="Load more players"
                  >
                    Load More
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500" aria-live="polite">
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