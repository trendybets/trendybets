"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import Image from "next/image"
import { getPlayerHistory, calculateAverage } from "@/lib/database"

interface PlayerPropCardProps {
  playerName: string
  playerId: string
  propType: string
  line: number
  price: number
  playerLogo?: string | null
  timeframe?: '5' | '10' | '20'
}

export function PlayerPropCard({
  playerName,
  playerId,
  propType,
  line,
  price,
  playerLogo,
  timeframe = '10'
}: PlayerPropCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [playerHistory, setPlayerHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState('L10')

  useEffect(() => {
    async function loadPlayerHistory() {
      try {
        setIsLoading(true)
        const limit = parseInt(selectedTimeframe.replace('L', ''))
        console.log('Fetching history for player:', playerId, 'limit:', limit)
        const history = await getPlayerHistory(playerId, limit)
        console.log('Received player history:', history)
        setPlayerHistory(history)
      } catch (error) {
        console.error('Error loading player history:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (playerId) {
      loadPlayerHistory()
    }
  }, [playerId, selectedTimeframe])

  const average = calculateAverage(playerHistory)

  function calculateScale(points: number[]) {
    const maxPoints = Math.max(...points)
    const minPoints = Math.min(...points)
    const buffer = Math.ceil((maxPoints - minPoints) * 0.2) // 20% buffer
    
    const max = Math.ceil((maxPoints + buffer) / 10) * 10 // Round up to nearest 10
    const steps = [0, max/4, max/2, (3*max)/4, max]
    
    return { max, steps }
  }

  const pointValues = playerHistory.map(game => game.points)
  const scale = calculateScale(pointValues.length ? pointValues : [0, 40])

  function formatDateLabel(date: string, totalBars: number) {
    const d = new Date(date)
    
    if (totalBars > 10) {
      return `${d.getMonth() + 1}/${d.getDate()}`
    }
    
    return new Date(date).toLocaleDateString(undefined, { 
      month: 'numeric',
      day: 'numeric'
    })
  }

  function getLastNGames(history: any[], n: number) {
    return history.slice(-n)
  }

  function calculateAverageForTimeframe(history: any[], n: number) {
    const games = getLastNGames(history, n)
    return calculateAverage(games)
  }

  return (
    <div className="bg-black/20 rounded-lg overflow-hidden border border-white/5">
      {/* Header with player photo and name */}
      <div className="p-4 flex items-center justify-between">
        {/* Left side: Player photo and name */}
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-black/20 border border-white/10">
            <Image
              src={playerLogo || '/placeholder-player.png'}
              alt={playerName}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <span className="text-lg font-semibold text-white">{playerName}</span>
        </div>

        {/* Right side: Prop type */}
        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
          <span className="text-sm text-white/60">Prop</span>
          <span className="text-lg font-medium text-white">{propType}</span>
        </div>
      </div>

      {/* Over/Under pills */}
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        <div className="relative group">
          <div className="absolute inset-0 bg-green-500/5 rounded-lg" />
          <div className="relative p-4 rounded-lg border border-green-500/20 hover:border-green-500/40 transition-colors">
            <div className="flex items-center justify-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-green-400" />
              <span className="text-2xl font-medium text-green-400">
                Over {line}
              </span>
            </div>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute inset-0 bg-red-500/5 rounded-lg" />
          <div className="relative p-4 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors">
            <div className="flex items-center justify-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-red-400" />
              <span className="text-2xl font-medium text-red-400">
                Under {line}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats section */}
      <div className="px-4 py-3 bg-black/40 border-t border-white/5">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-sm text-white/60">L5 Average</div>
            <div className="text-base font-medium text-white">
              {isLoading ? '...' : calculateAverageForTimeframe(playerHistory, 5)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-white/60">L10 Average</div>
            <div className="text-base font-medium text-white">
              {isLoading ? '...' : calculateAverageForTimeframe(playerHistory, 10)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-white/60">L20 Average</div>
            <div className="text-base font-medium text-white">
              {isLoading ? '...' : calculateAverageForTimeframe(playerHistory, 20)}
            </div>
          </div>
        </div>
      </div>

      {/* Show More Details button */}
      <Button
        onClick={() => setShowDetails(!showDetails)}
        variant="ghost"
        className="w-full py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-none border-t border-white/5"
      >
        Show More Details
        {showDetails ? (
          <ChevronUp className="ml-2 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-2 h-4 w-4" />
        )}
      </Button>

      {/* Expanded details section */}
      {showDetails && (
        <div className="mt-4 border-t border-white/10">
          <Tabs 
            defaultValue="L10" 
            value={selectedTimeframe}
            onValueChange={setSelectedTimeframe}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 bg-black/20">
              <TabsTrigger value="L5">L5</TabsTrigger>
              <TabsTrigger value="L10">L10</TabsTrigger>
              <TabsTrigger value="L20">L20</TabsTrigger>
            </TabsList>

            <div className="p-4">
              {/* Game Results Bar Chart */}
              <div className="relative h-[300px] bg-[#0f172a]/50 rounded-xl p-4 backdrop-blur-sm">
                {/* Points scale on the left */}
                <div className="absolute left-2 top-4 bottom-16 w-8 flex flex-col justify-between text-[10px] text-white/40">
                  {scale.steps.reverse().map((value, i) => (
                    <span key={i}>{value}</span>
                  ))}
                </div>

                {/* Chart area */}
                <div className="absolute left-12 right-4 top-4 bottom-16 border-b border-white/10">
                  {/* Grid lines */}
                  {scale.steps.map((value, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-white/5"
                      style={{
                        bottom: `${(value / scale.max) * 100}%`
                      }}
                    />
                  ))}

                  {/* Over/Under line */}
                  <div 
                    className="absolute left-0 right-0 border-t-2 border-[#F0B90B] z-10"
                    style={{ 
                      bottom: `${(line / scale.max) * 100}%`
                    }}
                  />

                  {/* Bars container */}
                  <div className="absolute inset-0 flex items-end gap-1.5">
                    {playerHistory.length > 0 ? (
                      playerHistory.map((game, i) => {
                        const isOver = game.points > line
                        const heightPercentage = (game.points / scale.max) * 100

                        return (
                          <div
                            key={i}
                            className="flex-1 relative flex flex-col justify-end h-full group"
                          >
                            {/* Bar */}
                            <div
                              className={`w-full ${
                                isOver 
                                  ? 'bg-green-500/70 hover:bg-green-500/80' 
                                  : 'bg-red-500/70 hover:bg-red-500/80'
                              } transition-colors relative rounded-sm`}
                              style={{ 
                                height: `${heightPercentage}%`,
                                minHeight: '2px'
                              }}
                            >
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 
                                opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <div className="bg-black/90 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                                  {game.points} pts
                                </div>
                              </div>
                            </div>

                            {/* Date label */}
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/40 
                              transform rotate-90 origin-left whitespace-nowrap translate-y-4 translate-x-2">
                              {formatDateLabel(game.start_date, playerHistory.length)}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="w-full text-center text-white/60">No data available</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  )
} 