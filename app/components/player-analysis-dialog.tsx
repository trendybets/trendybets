'use client'

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { Bar } from "react-chartjs-2"
import { PlayerData } from '../types'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  LineController,
  BarController
} from 'chart.js'
import { cn } from "@/lib/utils"
import { Skeleton, StatsCardSkeleton } from "@/components/ui/skeleton"
import Image from "next/image"
import { getSafeImageUrl } from "@/lib/image-utils"
import { motion } from "framer-motion"
import PerformanceHistoryGraph from "./PerformanceHistoryGraph"
import DistributionGraph from "./DistributionGraph"
import AnimatedProgressBar from "./AnimatedProgressBar"
import { PlayerPerformanceBarChart } from "./PlayerPerformanceBarChart"
import { GameStats } from '../types'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend
)

interface PlayerAnalysisDialogProps {
  player: PlayerData | null
  isOpen: boolean
  onClose: () => void
  onError?: () => void
}

type TimeframeKey = 'last5' | 'last10' | 'season'
type TabType = 'overview' | 'performance' | 'insights' | 'matchup'

interface Competitor {
  id: string;
  name: string;
  numerical_id?: number;
  base_id?: number;
  abbreviation?: string;
  logo?: string;
}

interface Fixture {
  id?: string;
  numerical_id?: number;
  game_id?: string;
  start_date?: string;
  home_competitors: Competitor[];
  away_competitors: Competitor[];
  home_team_display?: string;
  away_team_display?: string;
  status?: string;
  is_live?: boolean;
}

export function PlayerAnalysisDialog({ player, isOpen, onClose, onError }: PlayerAnalysisDialogProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('L10')
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [processedPlayer, setProcessedPlayer] = useState<PlayerData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Process player data to ensure opponent names are set
  useEffect(() => {
    try {
      if (!player) {
        setProcessedPlayer(null);
        return;
      }
      
      // Clone the player object to avoid mutating props
      const processedData = { ...player };
      
      // Process games to ensure opponent names are set
      if (processedData.games) {
        processedData.games = processedData.games.map((game, index) => {
          // If game already has opponent name, use it
          if (game.opponent) return game;
          
          // Create a more descriptive placeholder based on available data
          let opponentName = "";
          
          // Use date if available
          if (game.date) {
            const dateStr = game.date;
            opponentName = `Game on ${dateStr}`;
            
            // Add home/away info if available
            if (typeof game.is_away !== 'undefined') {
              opponentName += game.is_away ? " (Away)" : " (Home)";
            }
          } else {
            // Fallback to generic name
            opponentName = `Game ${index + 1}`;
          }
          
          return {
            ...game,
            opponent: opponentName
          };
        });
      }
      
      setProcessedPlayer(processedData);
    } catch (error) {
      console.error("Error processing player data:", error);
      if (onError) onError();
    }
  }, [player, onError]);
  
  useEffect(() => {
    if (player) {
      setIsLoading(true)
      // Simulate loading data
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 800)
      
      return () => clearTimeout(timer)
    }
  }, [player])
  
  if (!processedPlayer) return null

  // Skip processing if we're in first half mode
  if (selectedTimeframe === '1h') {
    return null
  }

  const getTimeframeKey = (timeframe: string): TimeframeKey => {
    switch (timeframe) {
      case 'L5': return 'last5'
      case 'L10': return 'last10'
      case 'L20': return 'season'
      default: return 'last5'
    }
  }

  const getLineValue = () => {
    return processedPlayer.line || 0;
  }

  const getAverageValue = () => {
    const timeframeKey = getTimeframeKey(selectedTimeframe);
    return processedPlayer.averages[processedPlayer.stat_type.toLowerCase() as keyof typeof processedPlayer.averages]?.[timeframeKey] || 0;
  }

  const getHitRate = (period: string) => {
    const timeframeKey = getTimeframeKey(period);
    return processedPlayer.hit_rates[processedPlayer.stat_type.toLowerCase() as keyof typeof processedPlayer.hit_rates]?.[timeframeKey] || 0;
  }

  // Calculate hit counts for the selected timeframe
  const calculateHitCounts = () => {
    if (!processedPlayer.games || processedPlayer.games.length === 0) return { hits: 0, total: 0 };
    
    const timeframeKey = getTimeframeKey(selectedTimeframe);
    let gameCount = 0;
    
    switch (timeframeKey) {
      case 'last5':
        gameCount = Math.min(5, processedPlayer.games.length);
        break;
      case 'last10':
        gameCount = Math.min(10, processedPlayer.games.length);
        break;
      case 'season':
        gameCount = processedPlayer.games.length;
        break;
      default:
        gameCount = Math.min(5, processedPlayer.games.length);
    }
    
    const relevantGames = processedPlayer.games.slice(0, gameCount);
    const line = getLineValue();
    let hits = 0;
    
    // Determine direction based on recommended bet type
    const isOver = processedPlayer.recommended_bet?.type === 'over';
    
    for (const game of relevantGames) {
      const value = processedPlayer.stat_type.toLowerCase() === 'points' ? game.points : 
                   processedPlayer.stat_type.toLowerCase() === 'assists' ? game.assists : game.total_rebounds;
      
      if ((isOver && value > line) || (!isOver && value < line)) {
        hits++;
      }
    }
    
    return { hits, total: gameCount };
  }

  // Get current streak
  const getCurrentStreak = () => {
    if (!processedPlayer.games || processedPlayer.games.length === 0) return 0;
    
    const line = getLineValue();
    let streak = 0;
    let isOver = false;
    
    for (let i = 0; i < processedPlayer.games.length; i++) {
      const game = processedPlayer.games[i];
      const value = processedPlayer.stat_type.toLowerCase() === 'points' ? game.points : 
                   processedPlayer.stat_type.toLowerCase() === 'assists' ? game.assists : game.total_rebounds;
      
      if (i === 0) {
        isOver = value > line;
        streak = 1;
      } else if ((isOver && value > line) || (!isOver && value <= line)) {
        streak++;
      } else {
        break;
      }
    }
    
    return isOver ? streak : -streak; // Negative for under streaks
  }

  // Calculate standard deviation
  const getStandardDeviation = (): string => {
    if (!processedPlayer.games || processedPlayer.games.length === 0) return "0";
    
    const values = processedPlayer.games.slice(0, parseInt(selectedTimeframe.slice(1))).map(game => {
      return processedPlayer.stat_type.toLowerCase() === 'points' ? game.points : 
             processedPlayer.stat_type.toLowerCase() === 'assists' ? game.assists : game.total_rebounds;
    });
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.sqrt(variance).toFixed(1);
  }

  const calculateMetrics = (games: GameStats[]) => {
    if (!games || games.length === 0) return { avg: 0, hitRate: 0 };
    
    const statValues = games.map(game => {
      switch (processedPlayer.stat_type.toLowerCase()) {
        case 'points': return game.points;
        case 'assists': return game.assists;
        case 'rebounds': return game.total_rebounds;
        default: return 0;
      }
    });
    
    const avg = statValues.reduce((acc, val) => acc + val, 0) / statValues.length;
    const lineValue = getLineValue();
    
    const hitsCount = statValues.filter(val => val > lineValue).length;
    const hitRate = statValues.length > 0 ? hitsCount / statValues.length : 0;
    
    return { avg: parseFloat(avg.toFixed(1)), hitRate };
  }

  // Calculate streak data from games
  const calculateStreak = (games: GameStats[]) => {
    if (!games || games.length === 0) return { streak: 0, type: '' };
    
    const lineValue = getLineValue();
    let currentStreak = 1;
    let statValues = games.map(game => {
      switch (processedPlayer.stat_type.toLowerCase()) {
        case 'points': return game.points;
        case 'assists': return game.assists;
        case 'rebounds': return game.total_rebounds;
        default: return 0;
      }
    });
    
    // Check the first game to determine streak type
    const isOver = statValues[0] > lineValue;
    const streakType = isOver ? 'Overs' : 'Unders';
    
    // Count consecutive games matching the streak type
    for (let i = 1; i < statValues.length; i++) {
      if ((statValues[i] > lineValue) === isOver) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    return { streak: currentStreak, type: streakType };
  }

  // Distribution chart data
  const getDistributionData = () => {
    if (!processedPlayer.games || processedPlayer.games.length === 0) {
      return { labels: [], data: [] };
    }
    
    // Get relevant stat values
    const statValues = processedPlayer.games.slice(0, parseInt(selectedTimeframe.slice(1))).map(game => {
      switch (processedPlayer.stat_type.toLowerCase()) {
        case 'points': return game.points;
        case 'assists': return game.assists;
        case 'rebounds': return game.total_rebounds;
        default: return 0;
      }
    });
    
    // Calculate min and max for buckets
    const min = Math.floor(Math.min(...statValues));
    const max = Math.ceil(Math.max(...statValues));
    const range = max - min;
    const bucketSize = Math.max(1, Math.ceil(range / 8)); // Create about 8 buckets
    
    // Initialize buckets
    const buckets: Record<string, number> = {};
    for (let i = min; i <= max; i += bucketSize) {
      buckets[`${i}-${i + bucketSize - 1}`] = 0;
    }
    
    // Fill buckets
    statValues.forEach(value => {
      const bucketIndex = Math.floor((value - min) / bucketSize);
      const bucketStart = min + bucketIndex * bucketSize;
      const bucketKey = `${bucketStart}-${bucketStart + bucketSize - 1}`;
      if (buckets[bucketKey] !== undefined) {
        buckets[bucketKey]++;
      }
    });
    
    return {
      labels: Object.keys(buckets),
      data: Object.values(buckets)
    };
  }

  // Get trend direction (1 = improving, 0 = stable, -1 = declining)
  const getTrendDirection = () => {
    if (!processedPlayer.games || processedPlayer.games.length < 5) return 0;
    
    const values = processedPlayer.games.slice(0, 5).map(game => {
      return processedPlayer.stat_type.toLowerCase() === 'points' ? game.points : 
             processedPlayer.stat_type.toLowerCase() === 'assists' ? game.assists : game.total_rebounds;
    });
    
    // Simple linear regression slope sign
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < values.length; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    
    const n = values.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    if (Math.abs(slope) < 0.2) return 0; // Stable if slope is small
    return slope > 0 ? 1 : -1;
  }

  // Calculate performance in home vs away games
  const getHomeAwayStats = () => {
    if (!processedPlayer.games || processedPlayer.games.length === 0) return { home: 0, away: 0, homeHitRate: 0, awayHitRate: 0 };
    
    const homeGames = processedPlayer.games.filter(game => !game.is_away);
    const awayGames = processedPlayer.games.filter(game => game.is_away);
    
    const homeValues = homeGames.map(game => {
      return processedPlayer.stat_type.toLowerCase() === 'points' ? game.points : 
             processedPlayer.stat_type.toLowerCase() === 'assists' ? game.assists : game.total_rebounds;
    });
    
    const awayValues = awayGames.map(game => {
      return processedPlayer.stat_type.toLowerCase() === 'points' ? game.points : 
             processedPlayer.stat_type.toLowerCase() === 'assists' ? game.assists : game.total_rebounds;
    });
    
    const homeAvg = homeValues.length ? homeValues.reduce((sum, val) => sum + val, 0) / homeValues.length : 0;
    const awayAvg = awayValues.length ? awayValues.reduce((sum, val) => sum + val, 0) / awayValues.length : 0;
    
    return { 
      home: parseFloat(homeAvg.toFixed(1)), 
      away: parseFloat(awayAvg.toFixed(1)),
      homeHitRate: homeValues.filter(val => val > getLineValue()).length / homeValues.length || 0,
      awayHitRate: awayValues.filter(val => val > getLineValue()).length / awayValues.length || 0
    };
  }

  // Get the last X games performance
  const getLastXGamesStats = (x: number = 3) => {
    if (!processedPlayer.games || processedPlayer.games.length === 0) return { avg: 0, hitRate: 0 };
    
    const recentGames = processedPlayer.games.slice(0, Math.min(x, processedPlayer.games.length));
    
    const values = recentGames.map(game => {
      return processedPlayer.stat_type.toLowerCase() === 'points' ? game.points : 
             processedPlayer.stat_type.toLowerCase() === 'assists' ? game.assists : game.total_rebounds;
    });
    
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const hitRate = values.filter(val => val > getLineValue()).length / values.length;
    
    return { avg: parseFloat(avg.toFixed(1)), hitRate };
  }

  // Format confidence level
  const formatConfidence = (value: number) => {
    if (value >= 0.7) return 'High';
    if (value >= 0.5) return 'Medium';
    return 'Low';
  };

  // Get streak text
  const getStreakText = () => {
    const streak = getCurrentStreak();
    if (streak === 0) return "No current streak";
    
    return `${Math.abs(streak)} game ${streak > 0 ? "OVER" : "UNDER"} streak`;
  }

  // Get trend icon and color
  const getTrendIndicator = () => {
    const trend = getTrendDirection();
    
    if (trend === 1) {
      return {
        icon: "↗",
        color: "text-green-600",
        text: "Trending Up"
      };
    } else if (trend === -1) {
      return {
        icon: "↘",
        color: "text-red-600",
        text: "Trending Down"
      };
    } else {
      return {
        icon: "→",
        color: "text-yellow-500",
        text: "Stable"
      };
    }
  }

  // Example implementation
  const getOpponentFromFixture = (fixture: Fixture, playerTeamId: string): string => {
    // Check if player's team is the home team
    if (fixture.home_competitors[0].id === playerTeamId) {
      return fixture.away_competitors[0].name; // Return away team name as opponent
    } else {
      return fixture.home_competitors[0].name; // Return home team name as opponent
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 bg-white dark:bg-primary-black-900 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-8" aria-hidden="true">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64 w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : (
          <>
            {/* Player Header */}
            <div className="flex items-center justify-between mb-4 p-6">
              <div className="flex items-center">
                {isLoading ? (
                  <Skeleton className="h-12 w-12 rounded-full" aria-hidden="true" />
                ) : (
                  <div className="relative h-12 w-12 mr-3">
                    <Image 
                      src={getSafeImageUrl(processedPlayer.player.image_url)} 
                      alt={`${processedPlayer.player.name}`} 
                      fill
                      sizes="48px"
                      className="rounded-full object-cover"
                      priority={true}
                    />
                  </div>
                )}
                <div>
                  {isLoading ? (
                    <div className="space-y-2" aria-hidden="true">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{processedPlayer.player.name}</h2>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{processedPlayer.player.team} • {processedPlayer.player.position}</div>
                    </>
                  )}
                </div>
              </div>
              
              {processedPlayer.next_game && (
                <div className="game-info-card bg-gray-50 dark:bg-gray-800 p-3 rounded-lg" aria-label="Next game information">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Next Game</div>
                  <div className="text-sm font-medium matchup-display text-gray-900 dark:text-gray-100">
                    {processedPlayer.next_game.home_team === processedPlayer.player.team 
                      ? `vs ${processedPlayer.next_game.away_team}` 
                      : `@ ${processedPlayer.next_game.home_team}`}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 game-time">{processedPlayer.next_game.date}</div>
                </div>
              )}
            </div>
            
            {/* Tab Navigation */}
            <div className="px-6 flex border-t border-gray-100 dark:border-gray-800" role="tablist" aria-label="Player analysis tabs">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'performance', label: 'Performance' },
                { id: 'insights', label: 'Insights' },
                { id: 'matchup', label: 'Matchup' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    "py-3 px-4 text-sm font-medium border-b-2 transition-colors espn-tab",
                    activeTab === tab.id 
                      ? "espn-tab-active border-blue-500 text-blue-600 dark:text-blue-400" 
                      : "espn-tab-inactive border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                      e.preventDefault();
                      const tabs = ['overview', 'performance', 'insights', 'matchup'];
                      const currentIndex = tabs.indexOf(activeTab);
                      const direction = e.key === 'ArrowRight' ? 1 : -1;
                      const newIndex = (currentIndex + direction + tabs.length) % tabs.length;
                      setActiveTab(tabs[newIndex] as TabType);
                    }
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Tab Content */}
            <div className="p-6">
              {/* Overview Tab */}
              <div 
                role="tabpanel" 
                id="panel-overview" 
                aria-labelledby="tab-overview"
                hidden={activeTab !== 'overview'}
              >
                {activeTab === 'overview' && (
                  <div>
                    {/* Key Stats Section */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      {isLoading ? (
                        <>
                          <StatsCardSkeleton aria-hidden="true" />
                          <StatsCardSkeleton aria-hidden="true" />
                          <StatsCardSkeleton aria-hidden="true" />
                          <StatsCardSkeleton aria-hidden="true" />
                        </>
                      ) : (
                        <>
                          <div className="stat-card bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm" aria-label="Line value">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Line</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{getLineValue()}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{processedPlayer.stat_type}</div>
                          </div>
                          
                          <div className="stat-card bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm" aria-label={`Average ${processedPlayer.stat_type} in ${selectedTimeframe}`}>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Average ({selectedTimeframe})</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{getAverageValue().toFixed(1)}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{processedPlayer.stat_type}</div>
                          </div>
                          
                          <div className="stat-card bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm" aria-label={`Hit rate ${(getHitRate(selectedTimeframe) * 100).toFixed(0)}% in ${selectedTimeframe}`}>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Hit Rate ({selectedTimeframe})</div>
                            <div className={cn(
                              "text-2xl font-bold",
                              getHitRate(selectedTimeframe) >= 0.7 ? "text-green-600 dark:text-green-500" : 
                              getHitRate(selectedTimeframe) >= 0.5 ? "text-yellow-600 dark:text-yellow-500" : 
                              "text-red-600 dark:text-red-500"
                            )}>
                              {(getHitRate(selectedTimeframe) * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {processedPlayer.recommended_bet?.type === 'over' 
                                ? `${calculateHitCounts().hits} of ${calculateHitCounts().total} games`
                                : `${calculateHitCounts().total - calculateHitCounts().hits} of ${calculateHitCounts().total} games`}
                            </div>
                          </div>
                          
                          <div className="stat-card bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm" aria-label={`Current streak: ${Math.abs(getCurrentStreak())} ${getCurrentStreak() > 0 ? "consecutive hits" : getCurrentStreak() < 0 ? "consecutive misses" : "no streak"}`}>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Streak</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{Math.abs(getCurrentStreak())}</div>
                            <div className={cn(
                              "text-xs font-medium mt-1",
                              getCurrentStreak() > 0 ? "text-green-600 dark:text-green-500" : 
                              getCurrentStreak() < 0 ? "text-red-600 dark:text-red-500" : 
                              "text-gray-500"
                            )}>
                              {getCurrentStreak() > 0 ? "Consecutive Hits" : 
                               getCurrentStreak() < 0 ? "Consecutive Misses" : 
                               "No Streak"}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Statistics Section - Timeframes */}
                    <div className="mb-6">
                      <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">{processedPlayer.stat_type} Hit Rate</h3>
                      <div className="grid grid-cols-5 gap-3">
                        {isLoading ? (
                          Array(5).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-lg" aria-hidden="true" />
                          ))
                        ) : (
                          ['H2H', 'L5', 'L10', 'L20', '2024'].map((period) => (
                            <div 
                              key={period} 
                              className="text-center bg-gray-50 dark:bg-gray-800 py-4 px-3 rounded-lg shadow-sm"
                              aria-label={`${period} hit rate: ${period === 'H2H' ? '100' : (getHitRate(period) * 100).toFixed(0)}%`}
                            >
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{period}</div>
                              <div className={cn(
                                "text-lg font-semibold",
                                getHitRate(period) > 0.5 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                              )}>
                                {period === 'H2H' ? '100%' : `${(getHitRate(period) * 100).toFixed(0)}%`}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    
                    {/* Chart Section */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 shadow-sm">
                      {/* Chart Header with Trend Info */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                          {processedPlayer.stat_type} Performance History
                        </h3>
                        <div className="flex gap-2" role="group" aria-label="Timeframe selection">
                          {['L5', 'L10', 'L20'].map((time) => (
                            <button
                              key={time}
                              onClick={() => setSelectedTimeframe(time)}
                              className={cn(
                                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                                selectedTimeframe === time 
                                ? "bg-blue-600 dark:bg-blue-700 text-white" 
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                              )}
                              aria-pressed={selectedTimeframe === time}
                              aria-label={`Show last ${time.slice(1)} games`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Performance Chart */}
                      <div className="p-4">
                        {isLoading ? (
                          <Skeleton className="h-64 w-full" aria-hidden="true" />
                        ) : (
                          <div className="min-h-[300px]" aria-label={`${processedPlayer.stat_type} performance chart for the last ${selectedTimeframe.slice(1)} games`}>
                            <PlayerPerformanceBarChart 
                              games={processedPlayer.games?.slice(0, parseInt(selectedTimeframe.slice(1))) || []}
                              statType={processedPlayer.stat_type}
                              line={getLineValue()}
                              title=""
                              className="shadow-none border-none p-0 bg-transparent"
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Limited Data Warning */}
                      {processedPlayer.games && processedPlayer.games.length < parseInt(selectedTimeframe.slice(1)) && (
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex items-start">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-500 dark:text-amber-400 mr-2 flex-shrink-0 mt-0.5">
                              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">Limited Data Available</h4>
                              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                This player has only {processedPlayer.games.length} recent games, but {selectedTimeframe} requires {selectedTimeframe.slice(1)}. 
                                Statistics and hit rates may not be as accurate with limited data.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Distribution Graph Section */}
                    <div className="mb-6">
                      {isLoading ? (
                        <Skeleton className="h-64 w-full" aria-hidden="true" />
                      ) : (
                        <DistributionGraph
                          games={processedPlayer.games?.slice(0, parseInt(selectedTimeframe.slice(1))) || []}
                          statType={processedPlayer.stat_type}
                          line={getLineValue()}
                          title={`${processedPlayer.stat_type} Distribution`}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Performance Tab */}
              <div 
                role="tabpanel" 
                id="panel-performance" 
                aria-labelledby="tab-performance"
                hidden={activeTab !== 'performance'}
              >
                {activeTab === 'performance' && (
                  <div className="space-y-6 mt-6">
                    <div className="bg-white dark:bg-primary-black-900 rounded-lg border border-primary-black-100 dark:border-primary-black-700 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-primary-black-900 dark:text-primary-black-100">
                          {processedPlayer.stat_type} Performance History
                        </h3>
                        <div className="flex gap-2" role="group" aria-label="Timeframe selection">
                          {['L5', 'L10', 'L20'].map((time) => (
                            <button
                              key={time}
                              onClick={() => setSelectedTimeframe(time)}
                              className={cn(
                                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                                selectedTimeframe === time 
                                ? "bg-blue-600 dark:bg-blue-700 text-white" 
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                              )}
                              aria-pressed={selectedTimeframe === time}
                              aria-label={`Show last ${time.slice(1)} games`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>

                      <PlayerPerformanceBarChart 
                        games={processedPlayer.games?.slice(0, parseInt(selectedTimeframe.slice(1))) || []} 
                        statType={processedPlayer.stat_type}
                        line={getLineValue()}
                        title=""
                        className="shadow-none border-none p-0 bg-transparent"
                      />
                    </div>
                    
                    {/* Performance Summary */}
                    {processedPlayer && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-primary-black-50 dark:bg-primary-black-800 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-primary-black-500 dark:text-primary-black-400 mb-1">Average</h4>
                          <p className="text-2xl font-bold text-primary-black-900 dark:text-primary-black-100">
                            {processedPlayer.games && processedPlayer.games.length > 0 
                              ? calculateMetrics(processedPlayer.games.slice(0, parseInt(selectedTimeframe.slice(1)))).avg.toFixed(1) 
                              : 'N/A'}
                          </p>
                        </div>
                        
                        <div className="bg-primary-black-50 dark:bg-primary-black-800 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-primary-black-500 dark:text-primary-black-400 mb-1">Hit Rate</h4>
                          <p className="text-2xl font-bold text-primary-black-900 dark:text-primary-black-100">
                            {processedPlayer.games && processedPlayer.games.length > 0 
                              ? `${(calculateMetrics(processedPlayer.games.slice(0, parseInt(selectedTimeframe.slice(1)))).hitRate * 100).toFixed(0)}%` 
                              : 'N/A'}
                          </p>
                        </div>
                        
                        <div className="bg-primary-black-50 dark:bg-primary-black-800 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-primary-black-500 dark:text-primary-black-400 mb-1">Current Streak</h4>
                          <p className="text-2xl font-bold text-primary-black-900 dark:text-primary-black-100">
                            {processedPlayer.games && processedPlayer.games.length > 0 
                              ? `${calculateStreak(processedPlayer.games.slice(0, parseInt(selectedTimeframe.slice(1)))).streak} ${calculateStreak(processedPlayer.games.slice(0, parseInt(selectedTimeframe.slice(1)))).type}` 
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Insights Tab */}
              <div 
                role="tabpanel" 
                id="panel-insights" 
                aria-labelledby="tab-insights"
                hidden={activeTab !== 'insights'}
              >
                {activeTab === 'insights' && (
                  <div className="p-6">
                    {/* Insights tab content would go here */}
                    <p>Insights content</p>
                  </div>
                )}
              </div>
              
              {/* Matchup Tab */}
              <div 
                role="tabpanel" 
                id="panel-matchup" 
                aria-labelledby="tab-matchup"
                hidden={activeTab !== 'matchup'}
              >
                {activeTab === 'matchup' && (
                  <div className="p-6">
                    {/* Matchup tab content would go here */}
                    <p>Matchup analysis content</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
} 