import { useState, useCallback, useMemo, useRef } from 'react'
import { PlayerData, GameStats } from '@/app/types'
import { useFilters } from '@/lib/context/app-state'

interface UseTrendsTableProps {
  data: PlayerData[]
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

export function useTrendsTable({ 
  data, 
  isLoading = false, 
  hasMore = false, 
  onLoadMore 
}: UseTrendsTableProps) {
  // Local state
  const [timeframe, setTimeframe] = useState('L5')
  const [statType, setStatType] = useState('All Props')
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null)
  const loaderRef = useRef<HTMLDivElement>(null)
  
  // Get additional state from context
  const { teams } = useFilters()
  
  // Memoize helper functions to prevent recreating them on each render
  const getTimeframeNumber = useCallback((tf: string) => {
    if (tf === 'L5') return 5
    if (tf === 'L10') return 10
    if (tf === 'L20') return 20
    return 20 // Default to 20 if unknown
  }, [])

  // Helper function to get the correct stat value
  const getStatValue = useCallback((game: GameStats, statType: string) => {
    switch (statType.toLowerCase()) {
      case 'points':
        return game.points
      case 'assists':
        return game.assists
      case 'rebounds':
        return game.total_rebounds
      default:
        return 0
    }
  }, [])

  // Calculate average value for a player based on timeframe
  const getAverageValue = useCallback((row: PlayerData, timeframeNumber: number) => {
    if (!row.games || row.games.length === 0) return 0
    
    const relevantGames = row.games.slice(0, timeframeNumber)
    const sum = relevantGames.reduce((acc, game) => {
      return acc + getStatValue(game, row.stat_type)
    }, 0)
    
    return sum / relevantGames.length
  }, [getStatValue])

  // Calculate hit rate and other stats
  const calculateHits = useCallback((row: PlayerData, timeframeNumber: number) => {
    if (!row.games || row.games.length === 0) {
      return { hits: 0, total: 0, percentage: 0, direction: 'NONE', isStrong: false }
    }
    
    const relevantGames = row.games.slice(0, Math.min(timeframeNumber, row.games.length))
    const line = row.line || 0
    
    let hits = 0
    relevantGames.forEach(game => {
      const value = getStatValue(game, row.stat_type)
      if (value > line) hits++
    })
    
    const percentage = hits / relevantGames.length
    const direction = percentage >= 0.5 ? 'MORE' : 'LESS'
    const isStrong = percentage >= 0.7 || percentage <= 0.3
    
    return {
      hits,
      total: relevantGames.length,
      percentage,
      direction,
      isStrong
    }
  }, [getStatValue])

  // Handle row hover state
  const handleRowHover = useCallback((rowId: string, isHovered: boolean) => {
    setHoveredRowId(isHovered ? rowId : null)
  }, [])

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    return data.filter(player => {
      // Filter by stat type if not "All Props"
      if (statType !== 'All Props' && player.stat_type !== statType) {
        return false
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          player.player.name.toLowerCase().includes(query) ||
          player.player.team.toLowerCase().includes(query)
        )
      }
      
      return true
    }).sort((a, b) => {
      // Sort by hit rate
      const aStats = calculateHits(a, getTimeframeNumber(timeframe))
      const bStats = calculateHits(b, getTimeframeNumber(timeframe))
      
      return bStats.percentage - aStats.percentage
    })
  }, [data, statType, searchQuery, calculateHits, getTimeframeNumber, timeframe])

  // Setup intersection observer for infinite scrolling
  const setupObserver = useCallback(() => {
    if (!loaderRef.current || !hasMore || isLoading) return
    
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isLoading && onLoadMore) {
        onLoadMore()
      }
    }, { threshold: 0.5 })
    
    observer.observe(loaderRef.current)
    
    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current)
      }
    }
  }, [hasMore, isLoading, onLoadMore])

  return {
    // State
    timeframe,
    statType,
    selectedPlayer,
    searchQuery,
    hoveredRowId,
    loaderRef,
    teams,
    
    // Derived state
    filteredAndSortedData,
    
    // Actions
    setTimeframe,
    setStatType,
    setSelectedPlayer,
    setSearchQuery,
    handleRowHover,
    setupObserver,
    
    // Helper functions
    getTimeframeNumber,
    getAverageValue,
    calculateHits
  }
} 