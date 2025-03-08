import { useState, useEffect, useCallback } from 'react'
import { PlayerData, GameStats } from '@/app/types'

interface UsePlayerAnalysisProps {
  player: PlayerData | null
}

export function usePlayerAnalysis({ player }: UsePlayerAnalysisProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('L10')
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'insights' | 'matchup'>('overview')
  const [processedPlayer, setProcessedPlayer] = useState<PlayerData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Process player data to ensure opponent names are set
  useEffect(() => {
    if (!player) {
      setProcessedPlayer(null)
      return
    }
    
    // Clone the player object to avoid mutating props
    const processedData = { ...player }
    
    // Process games to ensure opponent names are set
    if (processedData.games) {
      processedData.games = processedData.games.map((game, index) => {
        // If game already has opponent name, use it
        if (game.opponent) return game
        
        // Create a more descriptive placeholder based on available data
        let opponentName = ""
        
        // Use date if available
        if (game.date) {
          const dateStr = game.date
          opponentName = `Game on ${dateStr}`
          
          // Add home/away info if available
          if (typeof game.is_away === 'boolean') {
            opponentName = game.is_away ? `Away (${dateStr})` : `Home (${dateStr})`
          }
        } else if (typeof game.is_away === 'boolean') {
          // Use home/away status if available
          opponentName = game.is_away ? `Away Game ${index + 1}` : `Home Game ${index + 1}`
        } else {
          // Fallback
          opponentName = `Game ${index + 1}`
        }
        
        return {
          ...game,
          opponent: opponentName
        }
      })
    }
    
    setProcessedPlayer(processedData)
  }, [player])
  
  // Simulate loading data
  useEffect(() => {
    if (player) {
      setIsLoading(true)
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 800)
      
      return () => clearTimeout(timer)
    }
  }, [player])
  
  // Helper functions
  const getTimeframeKey = useCallback((timeframe: string) => {
    switch (timeframe) {
      case 'L5': return 'last5'
      case 'L10': return 'last10'
      case 'L20': return 'season'
      default: return 'last5'
    }
  }, [])

  const getLineValue = useCallback(() => {
    return processedPlayer?.line || 0
  }, [processedPlayer])

  const getAverageValue = useCallback(() => {
    if (!processedPlayer) return 0
    const timeframeKey = getTimeframeKey(selectedTimeframe)
    return processedPlayer.averages[processedPlayer.stat_type.toLowerCase() as keyof typeof processedPlayer.averages]?.[timeframeKey] || 0
  }, [processedPlayer, selectedTimeframe, getTimeframeKey])

  const getHitRate = useCallback((period: string) => {
    if (!processedPlayer) return 0
    const timeframeKey = getTimeframeKey(period)
    return processedPlayer.hit_rates[processedPlayer.stat_type.toLowerCase() as keyof typeof processedPlayer.hit_rates]?.[timeframeKey] || 0
  }, [processedPlayer, getTimeframeKey])

  // Calculate hit counts for the selected timeframe
  const calculateHitCounts = useCallback(() => {
    if (!processedPlayer?.games || processedPlayer.games.length === 0) return { hits: 0, total: 0 }
    
    const timeframeKey = getTimeframeKey(selectedTimeframe)
    let gameCount = 0
    
    switch (timeframeKey) {
      case 'last5':
        gameCount = Math.min(5, processedPlayer.games.length)
        break
      case 'last10':
        gameCount = Math.min(10, processedPlayer.games.length)
        break
      case 'season':
        gameCount = processedPlayer.games.length
        break
      default:
        gameCount = Math.min(5, processedPlayer.games.length)
    }
    
    const relevantGames = processedPlayer.games.slice(0, gameCount)
    const line = getLineValue()
    let hits = 0
    
    // Determine direction based on recommended bet type
    const isOver = processedPlayer.recommended_bet?.type === 'over'
    
    for (const game of relevantGames) {
      const value = processedPlayer.stat_type.toLowerCase() === 'points' ? game.points : 
                   processedPlayer.stat_type.toLowerCase() === 'assists' ? game.assists : game.total_rebounds
      
      if ((isOver && value > line) || (!isOver && value < line)) {
        hits++
      }
    }
    
    return { hits, total: gameCount }
  }, [processedPlayer, selectedTimeframe, getTimeframeKey, getLineValue])

  // Get current streak
  const getCurrentStreak = useCallback(() => {
    if (!processedPlayer?.games || processedPlayer.games.length === 0) return 0
    
    const line = getLineValue()
    let streak = 0
    let isOver = false
    
    for (let i = 0; i < processedPlayer.games.length; i++) {
      const game = processedPlayer.games[i]
      const value = processedPlayer.stat_type.toLowerCase() === 'points' ? game.points : 
                   processedPlayer.stat_type.toLowerCase() === 'assists' ? game.assists : game.total_rebounds
      
      if (i === 0) {
        isOver = value > line
        streak = 1
      } else if ((isOver && value > line) || (!isOver && value <= line)) {
        streak++
      } else {
        break
      }
    }
    
    return isOver ? streak : -streak // Negative for under streaks
  }, [processedPlayer, getLineValue])

  return {
    // State
    selectedTimeframe,
    activeTab,
    processedPlayer,
    isLoading,
    
    // Actions
    setSelectedTimeframe,
    setActiveTab,
    
    // Helper functions
    getTimeframeKey,
    getLineValue,
    getAverageValue,
    getHitRate,
    calculateHitCounts,
    getCurrentStreak
  }
} 