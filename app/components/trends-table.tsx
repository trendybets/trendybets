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
    <div className="w-full">
      {/* Filters and Search */}
      <div className="p-4 border-b border-primary-black-100 dark:border-primary-black-700 bg-white dark:bg-primary-black-800">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-primary-black-400" />
            </div>
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-md border border-primary-black-200 dark:border-primary-black-600 bg-white dark:bg-primary-black-700 text-primary-black-800 dark:text-primary-black-100 placeholder-primary-black-400 focus:outline-none focus:ring-2 focus:ring-primary-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Timeframe Filter */}
            <div className="relative inline-block">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-md border border-primary-black-200 dark:border-primary-black-600 bg-white dark:bg-primary-black-700 text-primary-black-800 dark:text-primary-black-100 focus:outline-none focus:ring-2 focus:ring-primary-blue-500 focus:border-transparent"
              >
                <option value="L5">Last 5 Games</option>
                <option value="L10">Last 10 Games</option>
                <option value="L20">Last 20 Games</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-primary-black-400" />
              </div>
            </div>
            
            {/* Stat Type Filter */}
            <div className="relative inline-block">
              <select
                value={statType}
                onChange={(e) => setStatType(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-md border border-primary-black-200 dark:border-primary-black-600 bg-white dark:bg-primary-black-700 text-primary-black-800 dark:text-primary-black-100 focus:outline-none focus:ring-2 focus:ring-primary-blue-500 focus:border-transparent"
              >
                <option value="All Props">All Props</option>
                <option value="Points">Points</option>
                <option value="Assists">Assists</option>
                <option value="Rebounds">Rebounds</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-primary-black-400" />
              </div>
            </div>
            
            {/* Team Filter */}
            {setFilters && filters && (
              <>
                <div className="relative inline-block">
                  <select
                    value={filters.team}
                    onChange={(e) => handleFilterChange('team', e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2 rounded-md border border-primary-black-200 dark:border-primary-black-600 bg-white dark:bg-primary-black-700 text-primary-black-800 dark:text-primary-black-100 focus:outline-none focus:ring-2 focus:ring-primary-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Teams</option>
                    {availableTeams?.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-primary-black-400" />
                  </div>
                </div>
                
                {/* Fixture Filter */}
                <div className="relative inline-block">
                  <select
                    value={filters.fixture}
                    onChange={(e) => handleFilterChange('fixture', e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2 rounded-md border border-primary-black-200 dark:border-primary-black-600 bg-white dark:bg-primary-black-700 text-primary-black-800 dark:text-primary-black-100 focus:outline-none focus:ring-2 focus:ring-primary-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Games</option>
                    {availableFixtures?.map(fixture => (
                      <option key={fixture} value={fixture}>{fixture}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-primary-black-400" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-primary-black-100 dark:divide-primary-black-700">
          <thead className="bg-primary-black-50 dark:bg-primary-black-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-black-500 dark:text-primary-black-300 uppercase tracking-wider">
                Player
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-black-500 dark:text-primary-black-300 uppercase tracking-wider">
                Prop Line
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-black-500 dark:text-primary-black-300 uppercase tracking-wider">
                Average
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-black-500 dark:text-primary-black-300 uppercase tracking-wider">
                Hit Rate
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-primary-black-500 dark:text-primary-black-300 uppercase tracking-wider">
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
              filteredAndSortedData.map((player) => (
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
        <div className="p-4 flex justify-center">
          <Button
            onClick={onLoadMore}
            variant="outline"
            className="text-primary-blue-500 border-primary-blue-500 hover:bg-primary-blue-50"
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