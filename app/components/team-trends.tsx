"use client"

import { useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"
import { STAT_TYPES, CHART_CONFIG } from "@/lib/constants"

interface TeamTrend {
  stat_name: StatName
  avg_value: number
  last_5_values: number[]
}

interface TeamTrendsProps {
  teamName: string
}

// Add more specific error typing
type ApiError = {
  error: string;
  status?: number;
}

// Add more specific stat type
type StatName = 'Points' | 'Assists' | 'Rebounds' | 'Steals' | 'Blocks';

const statColors: Record<StatName, string> = {
  Points: "bg-blue-500",
  Assists: "bg-green-500",
  Rebounds: "bg-purple-500",
  Steals: "bg-amber-500",
  Blocks: "bg-rose-500"
} as const;

export function TeamTrends({ teamName }: TeamTrendsProps) {
  const [trends, setTrends] = useState<TeamTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStat, setSelectedStat] = useState<StatName | null>(null)

  useEffect(() => {
    async function fetchTrends() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/team-trends?team=${encodeURIComponent(teamName)}&games=5`)
        const data = await response.json()
        
        if (!Array.isArray(data)) {
          console.error('Unexpected data format:', data)
          if (data.error) {
            setError(data.error)
          } else {
            setError('Unexpected data format received from server')
          }
          return
        }

        setTrends(data)
      } catch (error) {
        console.error('Error fetching trends:', error)
        setError('Failed to fetch team trends')
      } finally {
        setLoading(false)
      }
    }

    fetchTrends()
  }, [teamName])

  // Memoize filter callback
  const filterTrends = useCallback((trend: TeamTrend) => 
    !selectedStat || trend.stat_name === selectedStat
  , [selectedStat]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div 
          className="text-white/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Loading team trends...
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div 
          className="text-red-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {error}
        </motion.div>
      </div>
    )
  }

  if (!trends.length) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div 
          className="text-white/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          No trend data available
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stat Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedStat(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
            ${!selectedStat 
              ? 'bg-white/20 text-white' 
              : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
        >
          All Stats
        </button>
        {trends.map((trend) => (
          <button
            key={trend.stat_name}
            onClick={() => setSelectedStat(trend.stat_name)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${selectedStat === trend.stat_name 
                ? 'bg-white/20 text-white' 
                : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
          >
            {trend.stat_name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trends
          .filter(filterTrends)
          .map((trend) => {
            // Calculate statistics inside the map function
            const maxValue = Math.max(...trend.last_5_values)
            
            return (
              <motion.div
                key={trend.stat_name}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: CHART_CONFIG.ANIMATION_DURATION }}
              >
                <Card className="p-4 bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">{trend.stat_name}</h3>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-white">
                        {trend.avg_value}
                      </div>
                      <div className="text-sm text-gray-400">
                        avg last 5
                      </div>
                    </div>
                    
                    {/* Last 5 games trend */}
                    <div className="flex items-end gap-1 h-chart mt-2 pt-2">
                      {trend.last_5_values.map((value, index) => {
                        const height = maxValue > 0 ? (value / maxValue) * 100 : 0
                        
                        return (
                          <motion.div
                            key={index}
                            className="relative group flex-1"
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ 
                              duration: CHART_CONFIG.ANIMATION_DURATION, 
                              delay: index * CHART_CONFIG.ANIMATION_DELAY 
                            }}
                          >
                            <div 
                              className={`w-full ${statColors[trend.stat_name]} rounded-t`}
                              style={{ height: '100%' }}
                            />
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs rounded px-2 py-1 pointer-events-none">
                              {value}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Last 5 games
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
      </div>
    </div>
  )
} 