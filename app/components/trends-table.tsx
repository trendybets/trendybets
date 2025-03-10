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
import { Button } from '@/app/components/ui/Button'
import { colors } from '@/app/styles/design-system'

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

  return (
    <div className="w-full overflow-hidden rounded-lg shadow-sm">
      {/* Filters and Search */}
      <div className="p-5 border-b border-primary-black-200 dark:border-primary-black-700 bg-gradient-to-r from-primary-blue-200 via-primary-blue-50 to-primary-blue-200 dark:from-primary-blue-900/40 dark:via-primary-blue-900/20 dark:to-primary-blue-900/40 relative shadow-sm">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
        
        {/* Filter section title */}
        <div className="flex items-center mb-3 text-primary-blue-600 dark:text-primary-blue-400">
          <Filter className="h-4 w-4 mr-2" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">Filter Props</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-primary-blue-500 dark:text-primary-blue-400" />
            </div>
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full rounded-md border border-primary-black-200 dark:border-primary-black-600 bg-white dark:bg-primary-black-700 text-primary-black-800 dark:text-primary-black-100 placeholder-primary-black-400 focus:outline-none focus:ring-2 focus:ring-primary-blue-500 focus:border-transparent transition-all duration-200 hover:border-primary-blue-300 dark:hover:border-primary-blue-600"
            />
          </div>
          
          {/* Timeframe Filter */}
          <div className="relative">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="appearance-none w-full pl-3 pr-8 py-2.5 rounded-md border border-primary-black-200 dark:border-primary-black-600 bg-white dark:bg-primary-black-700 text-primary-black-800 dark:text-primary-black-100 focus:outline-none focus:ring-2 focus:ring-primary-blue-500 focus:border-transparent transition-all duration-200 hover:border-primary-blue-300 dark:hover:border-primary-blue-600"
            >
              <option value="L5">Last 5 Games</option>
              <option value="L10">Last 10 Games</option>
              <option value="L20">Last 20 Games</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="h-4 w-4 text-primary-blue-500 dark:text-primary-blue-400" />
            </div>
          </div>
          
          {/* Stat Type Filter */}
          <div className="relative">
            <select
              value={statType}
              onChange={(e) => setStatType(e.target.value)}
              className="appearance-none w-full pl-3 pr-8 py-2.5 rounded-md border border-primary-black-200 dark:border-primary-black-600 bg-white dark:bg-primary-black-700 text-primary-black-800 dark:text-primary-black-100 focus:outline-none focus:ring-2 focus:ring-primary-blue-500 focus:border-transparent transition-all duration-200 hover:border-primary-blue-300 dark:hover:border-primary-blue-600"
            >
              <option value="All Props">All Props</option>
              <option value="Points">Points</option>
              <option value="Assists">Assists</option>
              <option value="Rebounds">Rebounds</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="h-4 w-4 text-primary-blue-500 dark:text-primary-blue-400" />
            </div>
          </div>
        </div>
        
        {/* Second row of filters */}
        {setFilters && filters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 relative z-10">
            {/* Team Filter */}
            <div className="relative">
              <select
                value={filters.team}
                onChange={(e) => handleFilterChange('team', e.target.value)}
                className="appearance-none w-full pl-3 pr-8 py-2.5 rounded-md border border-primary-black-200 dark:border-primary-black-600 bg-white dark:bg-primary-black-700 text-primary-black-800 dark:text-primary-black-100 focus:outline-none focus:ring-2 focus:ring-primary-blue-500 focus:border-transparent transition-all duration-200 hover:border-primary-blue-300 dark:hover:border-primary-blue-600"
              >
                <option value="all">All Teams</option>
                {availableTeams?.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-primary-blue-500 dark:text-primary-blue-400" />
              </div>
            </div>
            
            {/* Fixture Filter */}
            <div className="relative">
              <select
                value={filters.fixture}
                onChange={(e) => handleFilterChange('fixture', e.target.value)}
                className="appearance-none w-full pl-3 pr-8 py-2.5 rounded-md border border-primary-black-200 dark:border-primary-black-600 bg-white dark:bg-primary-black-700 text-primary-black-800 dark:text-primary-black-100 focus:outline-none focus:ring-2 focus:ring-primary-blue-500 focus:border-transparent transition-all duration-200 hover:border-primary-blue-300 dark:hover:border-primary-blue-600"
              >
                <option value="all">All Games</option>
                {availableFixtures?.map(fixture => (
                  <option key={fixture} value={fixture}>{fixture}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-primary-blue-500 dark:text-primary-blue-400" />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-primary-black-200 dark:divide-primary-black-700">
          <thead className="bg-primary-blue-50 dark:bg-primary-blue-900/20">
            <tr>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-primary-black-600 dark:text-primary-black-300 uppercase tracking-wider">
                Player
              </th>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-primary-black-600 dark:text-primary-black-300 uppercase tracking-wider">
                Prop Line
              </th>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-primary-black-600 dark:text-primary-black-300 uppercase tracking-wider">
                Average
              </th>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-primary-black-600 dark:text-primary-black-300 uppercase tracking-wider">
                Hit Rate
              </th>
              <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-primary-black-600 dark:text-primary-black-300 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-primary-black-900 divide-y divide-primary-black-100 dark:divide-primary-black-700">
            {isLoading && filteredAndSortedData.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4">
                  <TableSkeleton rows={10} columns={5} />
                </td>
              </tr>
            ) : filteredAndSortedData.length > 0 ? (
              filteredAndSortedData.map((player, index) => (
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
                  className={index % 2 === 0 ? "bg-white dark:bg-primary-black-900" : "bg-primary-black-50/50 dark:bg-primary-black-800/50"}
                />
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-primary-black-500 dark:text-primary-black-400">
                  No players found matching your criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Load More Button */}
      {hasMore && !isLoading && (
        <div className="p-5 flex justify-center border-t border-primary-black-100 dark:border-primary-black-700">
          <Button
            onClick={onLoadMore}
            variant="outline"
            className="text-primary-blue-500 border-primary-blue-500 hover:bg-primary-blue-50 transition-colors duration-200"
          >
            Load More
          </Button>
        </div>
      )}
      
      {/* Infinite Scroll Loader */}
      {hasMore && (
        <div 
          ref={loaderRef} 
          className="py-4 flex justify-center items-center"
        >
          {isLoading && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-blue-500"></div>
              <span className="text-sm text-primary-black-500">Loading more...</span>
            </div>
          )}
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