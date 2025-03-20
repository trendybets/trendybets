"use client"

import { TrendingUp, TrendingDown } from "lucide-react"
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts"
import { GameStats } from "../types"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useMemo } from "react"

interface PlayerPerformanceBarChartProps {
  games: GameStats[]
  statType: string
  line: number
  title?: string
  showTrend?: boolean
  className?: string
}

export function PlayerPerformanceBarChart({
  games,
  statType,
  line,
  title = "Player Performance",
  showTrend = true,
  className
}: PlayerPerformanceBarChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  // Get the correct stat value based on stat type
  const getStatValue = (game: GameStats, type: string): number => {
    switch(type.toLowerCase()) {
      case 'points':
        return game.points
      case 'assists':
        return game.assists
      case 'rebounds':
        return game.total_rebounds
      default:
        return 0
    }
  }

  // Process data for chart display - most recent games first
  const chartData = useMemo(() => {
    // Clone and reverse to show most recent games on the right
    const processedGames = [...games].slice(0, 10).reverse()
    
    return processedGames.map((game, index) => {
      const value = getStatValue(game, statType)
      const isOver = value > line
      
      // Format date for display
      let gameLabel = `Game ${index + 1}`
      if (game.opponent) {
        gameLabel = game.opponent
      } else if (game.date) {
        try {
          const date = new Date(game.date)
          gameLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        } catch (e) {
          // Use default label if date parsing fails
        }
      }
      
      return {
        game: gameLabel,
        value,
        overValue: isOver ? value : 0,
        underValue: !isOver ? value : 0,
      }
    })
  }, [games, statType, line])

  // Calculate trend data
  const trendData = useMemo(() => {
    if (games.length < 2) return { trend: 0, message: "Not enough data" }
    
    // Use last 5 games to calculate trend
    const recentGames = games.slice(0, Math.min(5, games.length))
    let overCount = 0
    
    recentGames.forEach(game => {
      const value = getStatValue(game, statType)
      if (value > line) overCount++
    })
    
    const hitRate = overCount / recentGames.length
    
    // Check if trend is strong in either direction
    if (hitRate >= 0.8) {
      return { 
        trend: 1, 
        message: `Trending over: ${overCount}/${recentGames.length} recent games over the line` 
      }
    } else if (hitRate <= 0.2) {
      return { 
        trend: -1, 
        message: `Trending under: ${recentGames.length - overCount}/${recentGames.length} recent games under the line` 
      }
    } else {
      return { 
        trend: 0, 
        message: `Mixed trend: ${overCount}/${recentGames.length} recent games over the line` 
      }
    }
  }, [games, statType, line])

  // Empty state handling
  if (!games || games.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No performance data available</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground">No game data to display</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Recent Performance Analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
            onMouseMove={(e) => {
              if (e.activeTooltipIndex !== undefined) {
                setHoverIndex(e.activeTooltipIndex)
              }
            }}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="game"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number) => [value, statType]}
              labelFormatter={(label) => `Game: ${label}`}
            />
            <Legend />
            <ReferenceLine y={line} stroke="#8884d8" strokeDasharray="3 3" label={`Line: ${line}`} />
            <Bar 
              name="Over Line" 
              dataKey="overValue" 
              fill="rgba(34, 197, 94, 0.8)" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              name="Under Line" 
              dataKey="underValue" 
              fill="rgba(239, 68, 68, 0.8)" 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
      {showTrend && (
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            {trendData.trend > 0 ? (
              <>
                <span className="text-green-600">Trending over the line</span>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </>
            ) : trendData.trend < 0 ? (
              <>
                <span className="text-red-600">Trending under the line</span>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </>
            ) : (
              <span className="text-yellow-600">Mixed performance trend</span>
            )}
          </div>
          <div className="leading-none text-muted-foreground">{trendData.message}</div>
        </CardFooter>
      )}
    </Card>
  )
} 