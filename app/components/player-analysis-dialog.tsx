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

export function PlayerAnalysisDialog({ player, isOpen, onClose }: PlayerAnalysisDialogProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('L10')
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [processedPlayer, setProcessedPlayer] = useState<PlayerData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Process player data to ensure opponent names are set
  useEffect(() => {
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
          if (typeof game.is_away === 'boolean') {
            opponentName = game.is_away ? `Away (${dateStr})` : `Home (${dateStr})`;
          }
        } else if (typeof game.is_away === 'boolean') {
          // Use home/away status if available
          opponentName = game.is_away ? `Away Game ${index + 1}` : `Home Game ${index + 1}`;
        } else {
          // Fallback
          opponentName = `Game ${index + 1}`;
        }
        
        return {
          ...game,
          opponent: opponentName
        };
      });
    }
    
    setProcessedPlayer(processedData);
  }, [player]);
  
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

  // Calculate distribution buckets for histogram
  const getDistributionData = () => {
    if (!processedPlayer.games || processedPlayer.games.length === 0) {
      return { labels: [], data: [] };
    }
    
    const values = processedPlayer.games.slice(0, parseInt(selectedTimeframe.slice(1))).map(game => {
      return processedPlayer.stat_type.toLowerCase() === 'points' ? game.points : 
             processedPlayer.stat_type.toLowerCase() === 'assists' ? game.assists : game.total_rebounds;
    });
    
    // Create buckets for distribution
    const min = Math.min(...values);
    const max = Math.max(...values);
    const bucketSize = Math.max(1, Math.ceil((max - min) / 5)); // 5 buckets
    
    const buckets = Array(Math.ceil((max - min + 1) / bucketSize)).fill(0);
    
    values.forEach(val => {
      const bucketIndex = Math.floor((val - min) / bucketSize);
      buckets[bucketIndex]++;
    });
    
    return {
      labels: Array.from({ length: buckets.length }, (_, i) => 
        `${min + i * bucketSize}-${min + (i + 1) * bucketSize - 1}`
      ),
      data: buckets
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

  const chartData = {
    labels: processedPlayer.games?.slice(0, parseInt(selectedTimeframe.slice(1))).map(game => {
      const isAway = game.is_away;
      const opponentName = game.opponent || "Unknown";
      return `${isAway ? '@' : 'vs'} ${opponentName}`;
    }).reverse() || [],
    datasets: [
      {
        label: processedPlayer.stat_type,
        data: processedPlayer.games?.slice(0, parseInt(selectedTimeframe.slice(1))).map(game => {
          switch (processedPlayer.stat_type.toLowerCase()) {
            case 'points': return game.points;
            case 'assists': return game.assists;
            case 'rebounds': return game.total_rebounds;
            default: return 0;
          }
        }).reverse() || [],
        backgroundColor: (context: any) => {
          const value = context.raw;
          const lineValue = getLineValue();
          return value > lineValue ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
        },
        borderRadius: 6,
        barThickness: 20,
      },
      {
        label: 'Line',
        data: Array(processedPlayer.games?.length || 0).fill(getLineValue()),
        type: 'line' as const,
        borderColor: 'rgba(0, 0, 0, 0.5)',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
      }
    ]
  }

  // Distribution chart data
  const distributionData = getDistributionData();
  const distChartData = {
    labels: distributionData.labels,
    datasets: [
      {
        label: 'Frequency',
        data: distributionData.data,
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: 'rgb(79, 70, 229)',
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          title: function(context: any) {
            return chartData.labels[context[0].dataIndex];
          },
          label: function(context: any) {
            const value = context.raw;
            if (context.dataset.type !== 'line') {
              return `${processedPlayer.stat_type}: ${value} ${value > getLineValue() ? '(OVER)' : '(UNDER)'} ${getLineValue()}`;
            }
            return undefined;
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#666',
          font: {
            size: 12
          }
        }
      },
      x: {
        type: 'category' as const,
        grid: {
          display: false,
        },
        ticks: {
          color: '#666',
          font: {
            size: 11
          }
        }
      }
    }
  }

  // Format confidence level
  const getConfidenceLabel = () => {
    if (!processedPlayer.recommended_bet) return "N/A";
    
    const confidenceMap = {
      'very-high': 'Very High',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };
    
    return confidenceMap[processedPlayer.recommended_bet.confidence] || processedPlayer.recommended_bet.confidence;
  }
  
  // Get confidence color
  const getConfidenceColor = () => {
    if (!processedPlayer.recommended_bet) return "text-gray-500";
    
    const confidenceColorMap = {
      'very-high': 'text-green-600',
      'high': 'text-green-500',
      'medium': 'text-yellow-500',
      'low': 'text-orange-500'
    };
    
    return confidenceColorMap[processedPlayer.recommended_bet.confidence] || "text-gray-500";
  }

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {!player ? null : (
          <>
            {/* Dialog Header */}
            <div className="flex items-center justify-between mb-4">
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
                      <h2 className="text-xl font-bold text-gray-900">{processedPlayer.player.name}</h2>
                      <div className="text-sm text-gray-500">{processedPlayer.player.team} • {processedPlayer.player.position}</div>
                    </>
                  )}
                </div>
              </div>
              
              {processedPlayer.next_game && (
                <div className="game-info-card" aria-label="Next game information">
                  <div className="text-xs text-gray-500 mb-1">Next Game</div>
                  <div className="text-sm font-medium matchup-display">
                    {processedPlayer.next_game.home_team === processedPlayer.player.team 
                      ? `vs ${processedPlayer.next_game.away_team}` 
                      : `@ ${processedPlayer.next_game.home_team}`}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 game-time">{processedPlayer.next_game.date}</div>
                </div>
              )}
            </div>
            
            {/* Tab Navigation */}
            <div className="px-6 flex border-t border-gray-100" role="tablist" aria-label="Player analysis tabs">
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
                      ? "espn-tab-active" 
                      : "espn-tab-inactive"
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
            <div className="mt-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {isLoading ? (
                        <>
                          <StatsCardSkeleton aria-hidden="true" />
                          <StatsCardSkeleton aria-hidden="true" />
                          <StatsCardSkeleton aria-hidden="true" />
                        </>
                      ) : (
                        <>
                          <div className="stat-card" aria-label="Line value">
                            <div className="text-sm text-gray-500 mb-1">Line</div>
                            <div className="text-2xl font-bold text-gray-900">{getLineValue()}</div>
                            <div className="text-xs text-gray-500 mt-1">{processedPlayer.stat_type}</div>
                          </div>
                          
                          <div className="stat-card" aria-label={`Average ${processedPlayer.stat_type} in ${selectedTimeframe}`}>
                            <div className="text-sm text-gray-500 mb-1">Average ({selectedTimeframe})</div>
                            <div className="text-2xl font-bold text-gray-900">{getAverageValue().toFixed(1)}</div>
                            <div className="text-xs text-gray-500 mt-1">{processedPlayer.stat_type}</div>
                          </div>
                          
                          <div className="stat-card" aria-label={`Hit rate ${(getHitRate(selectedTimeframe) * 100).toFixed(0)}% in ${selectedTimeframe}`}>
                            <div className="text-sm text-gray-500 mb-1">Hit Rate ({selectedTimeframe})</div>
                            <div className={cn(
                              "text-2xl font-bold",
                              getHitRate(selectedTimeframe) >= 0.7 ? "text-green-600" : 
                              getHitRate(selectedTimeframe) >= 0.5 ? "text-yellow-600" : 
                              "text-red-600"
                            )}>
                              {(getHitRate(selectedTimeframe) * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {calculateHitCounts().hits} of {calculateHitCounts().total} games
                            </div>
                          </div>
                          
                          <div className="stat-card" aria-label={`Current streak: ${Math.abs(getCurrentStreak())} ${getCurrentStreak() > 0 ? "consecutive hits" : getCurrentStreak() < 0 ? "consecutive misses" : "no streak"}`}>
                            <div className="text-sm text-gray-500 mb-1">Current Streak</div>
                            <div className="text-2xl font-bold text-gray-900">{Math.abs(getCurrentStreak())}</div>
                            <div className={cn(
                              "text-xs font-medium mt-1",
                              getCurrentStreak() > 0 ? "text-green-600" : 
                              getCurrentStreak() < 0 ? "text-red-600" : 
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
                      <h3 className="text-base font-medium text-gray-900 mb-3">{processedPlayer.stat_type} Hit Rate</h3>
                      <div className="grid grid-cols-6 gap-3">
                        {isLoading ? (
                          Array(6).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-lg" aria-hidden="true" />
                          ))
                        ) : (
                          ['H2H', 'L5', 'L10', 'L20', '2024', '2023'].map((period) => (
                            <div 
                              key={period} 
                              className="text-center bg-gray-50 py-3 px-3 rounded-lg"
                              aria-label={`${period} hit rate: ${period === 'H2H' ? '100' : (getHitRate(period) * 100).toFixed(0)}%`}
                            >
                              <div className="text-xs text-gray-500 mb-1">{period}</div>
                              <div className={cn(
                                "text-base font-semibold",
                                getHitRate(period) > 0.5 ? "text-green-600" : "text-red-600"
                              )}>
                                {period === 'H2H' ? '100%' : `${(getHitRate(period) * 100).toFixed(0)}%`}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    
                    {/* Chart Section */}
                    <div className="bg-white rounded-lg border border-gray-200 mb-6">
                      {/* Chart Header with Trend Info */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="text-base font-medium text-gray-900">
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
                                ? "bg-gray-900 text-white" 
                                : "text-gray-600 hover:bg-gray-100"
                              )}
                              aria-pressed={selectedTimeframe === time}
                              aria-label={`Show last ${time.slice(1)} games`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Chart */}
                      <div className="p-4">
                        {isLoading ? (
                          <Skeleton className="h-64 w-full" aria-hidden="true" />
                        ) : (
                          <div className="h-64" aria-label={`${processedPlayer.stat_type} performance chart for the last ${selectedTimeframe.slice(1)} games`}>
                            <Bar 
                              options={options} 
                              data={chartData as any} 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Enhanced Supporting Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Betting Info */}
                      <div>
                        <h3 className="text-base font-medium text-gray-900 mb-3">Betting Information</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <div className="text-sm font-medium text-gray-700">
                              {processedPlayer.recommended_bet?.type === 'over' ? 'Over' : 'Under'} {getLineValue()}
                            </div>
                            <div className="text-sm font-semibold text-gray-900">-130</div>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <div className="text-sm text-gray-600">Confidence:</div>
                            <div className={cn("text-sm font-medium", getConfidenceColor())}>
                              {getConfidenceLabel()}
                            </div>
                          </div>

                          {processedPlayer.recommended_bet?.reason && (
                            <div className="text-sm text-gray-600 mt-2 p-2 bg-white rounded border border-gray-100">
                              {processedPlayer.recommended_bet.reason}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Recent Game Log */}
                      <div>
                        <h3 className="text-base font-medium text-gray-900 mb-3">Recent Games</h3>
                        <div className="bg-gray-50 rounded-lg overflow-hidden">
                          <table className="w-full text-sm" aria-label="Recent games log">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500" scope="col">Game</th>
                                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500" scope="col">{processedPlayer.stat_type}</th>
                                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500" scope="col">Result</th>
                              </tr>
                            </thead>
                            <tbody>
                              {processedPlayer.games?.slice(0, 5).map((game, idx) => {
                                const statValue = processedPlayer.stat_type.toLowerCase() === 'points' ? game.points : 
                                                  processedPlayer.stat_type.toLowerCase() === 'assists' ? game.assists : 
                                                  game.total_rebounds;
                                const isOver = statValue > getLineValue();
                                const opponentName = game.opponent || "Unknown";
                                
                                return (
                                  <tr key={idx} className="border-t border-gray-200">
                                    <td className="py-2 px-3 text-gray-700">{game.is_away ? '@' : 'vs'} {opponentName}</td>
                                    <td className="py-2 px-3 text-right font-medium text-gray-900">{statValue}</td>
                                    <td className={cn(
                                      "py-2 px-3 text-right font-medium",
                                      isOver ? "text-green-600" : "text-red-600"
                                    )}>
                                      {isOver ? "OVER" : "UNDER"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
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
                  <div className="p-6">
                    {/* Performance tab content would go here */}
                    <p>Performance analysis content</p>
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