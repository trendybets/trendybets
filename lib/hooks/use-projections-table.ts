import { useState, useEffect, useCallback, useMemo } from 'react'
import { PlayerData } from '@/app/types'
import { getAllCustomProjections } from '@/app/lib/projections'

interface CustomProjection {
  player_name: string
  stat_type: string
  projected_value: number
  confidence: number
  recommendation: string
  edge: number
}

type SortDirection = 'asc' | 'desc' | null

interface UseProjectionsTableProps {
  data: PlayerData[]
  isLoading?: boolean
}

export function useProjectionsTable({ data, isLoading = false }: UseProjectionsTableProps) {
  const [customProjections, setCustomProjections] = useState<CustomProjection[]>([])
  const [loading, setLoading] = useState(true)
  const [sportsbookLogo, setSportsbookLogo] = useState<string | null>(null)
  const [edgeSortDirection, setEdgeSortDirection] = useState<SortDirection>(null)
  const [selectedStatType, setSelectedStatType] = useState<string | null>(null)
  
  // Fetch custom projections on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const projections = await getAllCustomProjections()
        setCustomProjections(projections)
      } catch (error) {
        console.error('Error fetching custom projections:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])
  
  // Helper function to normalize stat type
  const normalizeStatType = useCallback((statType: string): string => {
    const statMap: Record<string, string> = {
      'pts': 'Points',
      'points': 'Points',
      'ast': 'Assists',
      'assists': 'Assists',
      'reb': 'Rebounds',
      'rebounds': 'Rebounds',
      'total_rebounds': 'Rebounds'
    }
    
    return statMap[statType.toLowerCase()] || statType
  }, [])
  
  // Toggle edge sort direction
  const toggleEdgeSort = useCallback(() => {
    if (edgeSortDirection === null) {
      setEdgeSortDirection('desc')
    } else if (edgeSortDirection === 'desc') {
      setEdgeSortDirection('asc')
    } else {
      setEdgeSortDirection(null)
    }
  }, [edgeSortDirection])
  
  // Helper function to safely get average value
  const getAverageValue = useCallback((player: PlayerData): number => {
    const statType = player.stat_type.toLowerCase()
    let avg = 0
    
    // Type-safe way to access nested properties
    if (statType === 'points' && player.averages?.points?.last10 !== undefined) {
      avg = player.averages.points.last10
    } else if (statType === 'assists' && player.averages?.assists?.last10 !== undefined) {
      avg = player.averages.assists.last10
    } else if ((statType === 'rebounds' || statType === 'total_rebounds') && 
               player.averages?.rebounds?.last10 !== undefined) {
      avg = player.averages.rebounds.last10
    }
    
    return avg
  }, [])
  
  // Filter and sort projections
  const filteredProjections = useMemo(() => {
    // Start with the data
    let filtered = [...data]
    
    // Filter by stat type if selected
    if (selectedStatType) {
      filtered = filtered.filter(item => 
        normalizeStatType(item.stat_type) === selectedStatType
      )
    }
    
    // Sort by edge if direction is set
    if (edgeSortDirection) {
      filtered.sort((a, b) => {
        // Use a type-safe approach to calculate edge
        const aAvg = getAverageValue(a)
        const bAvg = getAverageValue(b)
        
        // Calculate edges
        const aLine = a.line || 0
        const bLine = b.line || 0
        const edgeA = Math.abs(aAvg - aLine)
        const edgeB = Math.abs(bAvg - bLine)
        
        return edgeSortDirection === 'desc' ? edgeB - edgeA : edgeA - edgeB
      })
    }
    
    return filtered
  }, [data, selectedStatType, edgeSortDirection, normalizeStatType, getAverageValue])
  
  // Get unique stat types
  const statTypes = useMemo(() => {
    const types = new Set<string>()
    data.forEach(item => {
      types.add(normalizeStatType(item.stat_type))
    })
    return Array.from(types).sort()
  }, [data, normalizeStatType])
  
  return {
    // State
    customProjections,
    loading: loading || isLoading,
    sportsbookLogo,
    edgeSortDirection,
    selectedStatType,
    
    // Derived state
    filteredProjections,
    statTypes,
    
    // Actions
    setSportsbookLogo,
    setSelectedStatType,
    toggleEdgeSort,
    
    // Helper functions
    normalizeStatType,
    getAverageValue
  }
} 