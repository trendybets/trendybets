'use client'

import { useState, useEffect } from 'react'
import { ProjectionsTable } from './projections-table'
import { PlayerData } from '../types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

// Constants
const PAGE_SIZE = 20

export default function TrendyProjectionsView() {
  const [playerOdds, setPlayerOdds] = useState<PlayerData[]>([])
  const [allPlayerOdds, setAllPlayerOdds] = useState<PlayerData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // Load player odds on component mount
  useEffect(() => {
    loadPlayerOdds()
  }, [])

  async function loadPlayerOdds() {
    try {
      setIsLoading(true)
      setError(null)
      
      // Fetch player odds from API
      const response = await fetch('/api/odds')
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      const odds = data.odds
      
      if (!odds || !Array.isArray(odds)) {
        throw new Error('Invalid data format received from API')
      }
      
      // Debug information
      setDebugInfo({
        totalPlayers: odds.length,
        uniqueTeams: new Set(odds.map(o => o.player?.team).filter(Boolean)).size,
        uniqueFixtures: new Set(odds.map(o => 
          o.next_game?.fixture_id || 
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
      
    } catch (err: any) {
      console.error('Error loading player odds:', err)
      setError(err.message || 'Failed to load player data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadMoreData = () => {
    if (isLoading || !hasMore) return
    
    const nextPage = page + 1
    const startIndex = (nextPage - 1) * PAGE_SIZE
    const endIndex = startIndex + PAGE_SIZE
    
    const newData = allPlayerOdds.slice(0, endIndex)
    
    setPlayerOdds(newData)
    setPage(nextPage)
    setHasMore(endIndex < allPlayerOdds.length)
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Trendy Projections</h1>
        <p className="text-muted-foreground">
          Player projections with custom analysis and recommendations
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {debugInfo && process.env.NODE_ENV === 'development' && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>Information about the loaded data</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto p-2 bg-muted rounded-md">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-12 w-full bg-gray-200 animate-pulse rounded"></div>
          <div className="h-96 w-full bg-gray-200 animate-pulse rounded"></div>
        </div>
      ) : (
        <ProjectionsTable 
          data={playerOdds} 
          isLoading={isLoading} 
        />
      )}
    </div>
  )
} 