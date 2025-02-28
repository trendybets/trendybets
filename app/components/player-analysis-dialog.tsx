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
} from 'chart.js'
import { cn } from "@/lib/utils"

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white border-gray-200 p-0">
        <DialogTitle className="sr-only">
          {processedPlayer.player.name} - {processedPlayer.stat_type} Analysis
        </DialogTitle>
        <DialogDescription className="sr-only">
          Detailed performance analysis for {processedPlayer.player.name}'s {processedPlayer.stat_type} statistics
        </DialogDescription>
        {/* Fixed header with tabs */}
        <div className="border-b border-gray-100">
          {/* Player header */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
            <img 
              src={processedPlayer.player.image_url} 
              alt={processedPlayer.player.name}
                className="h-16 w-16 rounded-full border-2 border-gray-100 shadow-sm"
            />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{processedPlayer.player.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium text-gray-600">{processedPlayer.player.team}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm font-medium text-gray-600">{processedPlayer.player.position}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm font-medium text-gray-900">{processedPlayer.stat_type} {getLineValue()}</span>
                </div>
              </div>
            </div>
            
            {processedPlayer.next_game && (
              <div className="bg-gray-50 py-2 px-4 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Next Game</div>
                <div className="text-sm font-medium">
                  {processedPlayer.next_game.home_team === processedPlayer.player.team 
                    ? `vs ${processedPlayer.next_game.away_team}` 
                    : `@ ${processedPlayer.next_game.home_team}`}
                </div>
                <div className="text-xs text-gray-500 mt-1">{processedPlayer.next_game.date}</div>
              </div>
            )}
          </div>

          {/* Tab navigation */}
          <div className="px-6 flex border-t border-gray-100">
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
                  "py-3 px-4 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Scrollable content area */}
        <div className="max-h-[70vh] overflow-y-auto">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-6">
              {/* Key Stats Highlights */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Line</div>
                  <div className="text-2xl font-bold text-gray-900">{getLineValue()}</div>
                  <div className="text-xs text-gray-500 mt-1">{processedPlayer.stat_type}</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Average ({selectedTimeframe})</div>
                  <div className="text-2xl font-bold text-gray-900">{getAverageValue().toFixed(1)}</div>
                  <div className="text-xs text-gray-500 mt-1">{processedPlayer.stat_type}</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Hit Rate ({selectedTimeframe})</div>
                  <div className={cn(
                    "text-2xl font-bold",
                    getHitRate(selectedTimeframe) >= 0.7 ? "text-green-600" : 
                    getHitRate(selectedTimeframe) >= 0.5 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {(getHitRate(selectedTimeframe) * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{processedPlayer.stat_type}</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Current Streak</div>
                  <div className="text-2xl font-bold text-gray-900">{Math.abs(getCurrentStreak())}</div>
                  <div className={cn(
                    "text-xs font-medium mt-1",
                    getCurrentStreak() > 0 ? "text-green-600" : 
                    getCurrentStreak() < 0 ? "text-red-600" : "text-gray-500"
                  )}>
                    {getStreakText()}
                  </div>
                </div>
              </div>

              {/* Statistics Section - Timeframes */}
              <div className="mb-6">
                <h3 className="text-base font-medium text-gray-900 mb-3">{processedPlayer.stat_type} Hit Rate</h3>
                <div className="grid grid-cols-6 gap-3">
                  {['H2H', 'L5', 'L10', 'L20', '2024', '2023'].map((period) => (
                    <div key={period} className="text-center bg-gray-50 py-3 px-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">{period}</div>
                      <div className={cn(
                        "text-base font-semibold",
                        (getHitRate(period) > 0.5 ? "text-green-600" : "text-red-600")
                      )}>
                        {period === 'H2H' ? '100%' : `${(getHitRate(period) * 100).toFixed(0)}%`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart Section */}
              <div className="bg-white rounded-lg border border-gray-200 mb-6">
                {/* Chart Header with Trend Info */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="text-base font-medium text-gray-900">
                    {processedPlayer.stat_type} Performance History
                  </h3>
                  <div className="flex gap-2">
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
                >
                  {time}
                </button>
              ))}
                  </div>
            </div>

                {/* Chart */}
                <div className="p-4">
                  <div className="h-[300px]">
                    <Bar 
                      options={options} 
                      data={chartData as any} 
                    />
                  </div>
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
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Game</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">{processedPlayer.stat_type}</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Result</th>
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

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="p-6">
              {/* Performance Trend */}
              <div className="mb-6">
                <h3 className="text-base font-medium text-gray-900 mb-3">Performance Trend</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "text-2xl font-bold",
                      getTrendIndicator().color
                    )}>
                      {getTrendIndicator().icon} {getTrendIndicator().text}
                    </div>
                    <div className="text-sm text-gray-600">
                      Last 5 games analysis
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Last 3 Games Avg</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-gray-900">{getLastXGamesStats(3).avg}</span>
                        <span className="text-sm text-gray-600">
                          {getLastXGamesStats(3).avg > getLineValue() ? 'Above' : 'Below'} line
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Standard Deviation</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-gray-900">±{getStandardDeviation()}</span>
                        <span className="text-sm text-gray-600">
                          {parseFloat(getStandardDeviation()) < 2 ? 'Low' : parseFloat(getStandardDeviation()) < 4 ? 'Medium' : 'High'} variance
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Performance Distribution */}
              <div className="mb-6">
                <h3 className="text-base font-medium text-gray-900 mb-3">Performance Distribution</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="mb-2 text-sm text-gray-600">
                    How {processedPlayer.player.name}'s {processedPlayer.stat_type.toLowerCase()} performances are distributed
                  </div>
                  <div className="h-[200px] mb-4">
                    <Bar 
                      options={{
                        responsive: true,
                        plugins: {
                          legend: {
                            display: false,
                          },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'Frequency',
                              color: '#666'
                            }
                          },
                          x: {
                            title: {
                              display: true,
                              text: `${processedPlayer.stat_type} Range`,
                              color: '#666'
                            }
                          }
                        }
                      }}
                      data={distChartData as any}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Min</div>
                      <div className="text-lg font-bold text-gray-900">
                        {Math.min(...processedPlayer.games?.slice(0, parseInt(selectedTimeframe.slice(1))).map(game => {
                          return processedPlayer.stat_type.toLowerCase() === 'points' ? game.points : 
                                 processedPlayer.stat_type.toLowerCase() === 'assists' ? game.assists : game.total_rebounds;
                        }) || [0])}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Avg</div>
                      <div className="text-lg font-bold text-gray-900">{getAverageValue().toFixed(1)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Max</div>
                      <div className="text-lg font-bold text-gray-900">
                        {Math.max(...processedPlayer.games?.slice(0, parseInt(selectedTimeframe.slice(1))).map(game => {
                          return processedPlayer.stat_type.toLowerCase() === 'points' ? game.points : 
                                 processedPlayer.stat_type.toLowerCase() === 'assists' ? game.assists : game.total_rebounds;
                        }) || [0])}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Home vs Away Performance */}
              <div>
                <h3 className="text-base font-medium text-gray-900 mb-3">Home vs Away Performance</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                      <div className="text-sm text-gray-500 mb-2">Home Games</div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">{getHomeAwayStats().home}</div>
                      <div className={cn(
                        "text-sm font-medium",
                        getHomeAwayStats().homeHitRate > 0.5 ? "text-green-600" : "text-red-600"
                      )}>
                        {(getHomeAwayStats().homeHitRate * 100).toFixed(0)}% hit rate
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                      <div className="text-sm text-gray-500 mb-2">Away Games</div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">{getHomeAwayStats().away}</div>
                      <div className={cn(
                        "text-sm font-medium",
                        getHomeAwayStats().awayHitRate > 0.5 ? "text-green-600" : "text-red-600"
                      )}>
                        {(getHomeAwayStats().awayHitRate * 100).toFixed(0)}% hit rate
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-600">
                    {getHomeAwayStats().home > getHomeAwayStats().away ? 
                      `${processedPlayer.player.name} performs better at home (+${(getHomeAwayStats().home - getHomeAwayStats().away).toFixed(1)})` : 
                      getHomeAwayStats().away > getHomeAwayStats().home ?
                      `${processedPlayer.player.name} performs better on the road (+${(getHomeAwayStats().away - getHomeAwayStats().home).toFixed(1)})` :
                      `${processedPlayer.player.name} performs equally at home and on the road`
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="p-6">
              {/* Betting Value Insight */}
              <div className="mb-6">
                <h3 className="text-base font-medium text-gray-900 mb-3">Betting Value Insight</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-1">Line Value Assessment</div>
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden w-full">
                      {/* Value indicator bar - position based on average vs line */}
                      <div 
                        className="absolute top-0 left-0 h-full bg-blue-600"
                        style={{ 
                          width: `${Math.min(100, Math.max(0, (getAverageValue() / getLineValue()) * 100))}%` 
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low Value</span>
                      <span>Fair</span>
                      <span>High Value</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Avg vs Line</div>
                      <div className="text-lg font-bold text-gray-900">
                        {getAverageValue() > getLineValue() ? '+' : ''}{(getAverageValue() - getLineValue()).toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.abs(getAverageValue() - getLineValue()) < 0.5 ? "Fair line" : 
                         getAverageValue() > getLineValue() ? "Favors OVER" : "Favors UNDER"}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Margin of Safety</div>
                      <div className={cn(
                        "text-lg font-bold",
                        Math.abs(getAverageValue() - getLineValue()) > parseFloat(getStandardDeviation()) ? 
                          "text-green-600" : "text-yellow-600"
                      )}>
                        {((Math.abs(getAverageValue() - getLineValue()) / parseFloat(getStandardDeviation())) * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.abs(getAverageValue() - getLineValue()) > parseFloat(getStandardDeviation()) ? 
                          "Strong signal" : "Moderate signal"}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100">
                    <div className="font-medium mb-1">Betting Insight</div>
                    {getAverageValue() > getLineValue() + parseFloat(getStandardDeviation()) ? 
                      `Strong OVER value: ${processedPlayer.player.name}'s average ${processedPlayer.stat_type.toLowerCase()} exceeds the line by more than one standard deviation.` :
                      getAverageValue() < getLineValue() - parseFloat(getStandardDeviation()) ?
                      `Strong UNDER value: ${processedPlayer.player.name}'s average ${processedPlayer.stat_type.toLowerCase()} is below the line by more than one standard deviation.` :
                      `Moderate ${getAverageValue() > getLineValue() ? 'OVER' : 'UNDER'} value: The difference between the average and line is within one standard deviation.`
                    }
                  </div>
                </div>
              </div>
              
              {/* Key Factors */}
              <div>
                <h3 className="text-base font-medium text-gray-900 mb-3">Key Factors</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <div className="border-b border-gray-200">
                    <div className="py-3 px-4 bg-gray-100 text-sm font-medium text-gray-700">
                      Factors Affecting Performance
                    </div>
                  </div>
                  <div className="p-0">
                    <div className="divide-y divide-gray-200">
                      <div className="flex items-center py-3 px-4">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center mr-3",
                          getTrendDirection() === 1 ? "bg-green-100 text-green-600" : 
                          getTrendDirection() === -1 ? "bg-red-100 text-red-600" : 
                          "bg-yellow-100 text-yellow-600"
                        )}>
                          {getTrendDirection() === 1 ? "↗" : getTrendDirection() === -1 ? "↘" : "→"}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">Recent Form</div>
                          <div className="text-xs text-gray-600">
                            {getTrendDirection() === 1 ? 
                              `${processedPlayer.player.name} is trending upward in recent games` : 
                              getTrendDirection() === -1 ? 
                              `${processedPlayer.player.name} is trending downward in recent games` : 
                              `${processedPlayer.player.name}'s performance has been stable recently`
                            }
                          </div>
                        </div>
                        <div className={cn(
                          "text-sm font-medium",
                          getTrendDirection() === 1 ? "text-green-600" : 
                          getTrendDirection() === -1 ? "text-red-600" : 
                          "text-yellow-600"
                        )}>
                          {getTrendDirection() === 1 ? "Positive" : getTrendDirection() === -1 ? "Negative" : "Neutral"}
                        </div>
                      </div>
                      
                      <div className="flex items-center py-3 px-4">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center mr-3",
                          processedPlayer.next_game?.home_team === processedPlayer.player.team ? 
                            (getHomeAwayStats().homeHitRate > 0.5 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600") :
                            (getHomeAwayStats().awayHitRate > 0.5 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")
                        )}>
                          {processedPlayer.next_game?.home_team === processedPlayer.player.team ? "H" : "A"}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">Home/Away Impact</div>
                          <div className="text-xs text-gray-600">
                            {processedPlayer.next_game?.home_team === processedPlayer.player.team ? 
                              `Next game is at home (${(getHomeAwayStats().homeHitRate * 100).toFixed(0)}% hit rate)` : 
                              `Next game is away (${(getHomeAwayStats().awayHitRate * 100).toFixed(0)}% hit rate)`
                            }
                          </div>
                        </div>
                        <div className={cn(
                          "text-sm font-medium",
                          processedPlayer.next_game?.home_team === processedPlayer.player.team ? 
                            (getHomeAwayStats().homeHitRate > 0.5 ? "text-green-600" : "text-red-600") :
                            (getHomeAwayStats().awayHitRate > 0.5 ? "text-green-600" : "text-red-600")
                        )}>
                          {processedPlayer.next_game?.home_team === processedPlayer.player.team ? 
                            (getHomeAwayStats().homeHitRate > 0.5 ? "Positive" : "Negative") :
                            (getHomeAwayStats().awayHitRate > 0.5 ? "Positive" : "Negative")
                          }
                        </div>
                      </div>
                      
                      <div className="flex items-center py-3 px-4">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center mr-3",
                          "bg-blue-100 text-blue-600"
                        )}>
                          SD
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">Performance Consistency</div>
                          <div className="text-xs text-gray-600">
                            {parseFloat(getStandardDeviation()) < 2 ? 
                              `Very consistent performer (±${getStandardDeviation()})` : 
                              parseFloat(getStandardDeviation()) < 4 ? 
                              `Moderately consistent performer (±${getStandardDeviation()})` : 
                              `Highly variable performer (±${getStandardDeviation()})`
                            }
                          </div>
                        </div>
                        <div className={cn(
                          "text-sm font-medium",
                          parseFloat(getStandardDeviation()) < 2 ? "text-green-600" : 
                          parseFloat(getStandardDeviation()) < 4 ? "text-yellow-600" : 
                          "text-red-600"
                        )}>
                          {parseFloat(getStandardDeviation()) < 2 ? "High" : parseFloat(getStandardDeviation()) < 4 ? "Medium" : "Low"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Matchup Tab */}
          {activeTab === 'matchup' && (
            <div className="p-6">
              {/* Next Game Matchup */}
              <div className="mb-6">
                <h3 className="text-base font-medium text-gray-900 mb-3">Next Game Matchup</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {processedPlayer.next_game ? (
                    <>
                      <div className="flex items-center justify-center gap-8 mb-4">
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900 mb-1">{processedPlayer.player.team}</div>
                          <img 
                            src={processedPlayer.player.image_url} 
                            alt={processedPlayer.player.team}
                            className="h-12 w-12 mx-auto rounded-full border border-gray-200"
                          />
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">vs</div>
                          <div className="text-xl font-bold text-gray-900">
                            {processedPlayer.next_game.date}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {processedPlayer.next_game.home_team === processedPlayer.player.team ? 
                              processedPlayer.next_game.away_team : processedPlayer.next_game.home_team}
                          </div>
                          <div className="h-12 w-12 mx-auto rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs text-gray-500">Logo</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                          <div className="text-xs text-gray-500 mb-1">Against Opponent</div>
                          <div className="text-lg font-bold text-gray-900">
                            {getLastXGamesStats(3).avg}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Average {processedPlayer.stat_type}
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                          <div className="text-xs text-gray-500 mb-1">Game Location</div>
                          <div className="text-lg font-bold text-gray-900">
                            {processedPlayer.next_game.home_team === processedPlayer.player.team ? "Home" : "Away"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {processedPlayer.next_game.home_team === processedPlayer.player.team ? 
                              `${(getHomeAwayStats().homeHitRate * 100).toFixed(0)}% hit rate` : 
                              `${(getHomeAwayStats().awayHitRate * 100).toFixed(0)}% hit rate`}
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                          <div className="text-xs text-gray-500 mb-1">Matchup Rating</div>
                          <div className={cn(
                            "text-lg font-bold",
                            getLastXGamesStats(3).avg > getLineValue() ? "text-green-600" : "text-red-600"
                          )}>
                            {getLastXGamesStats(3).avg > getLineValue() ? "Favorable" : "Challenging"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            For Over {getLineValue()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100 p-3">
                        <div className="font-medium mb-1">Matchup Insight</div>
                        {getLastXGamesStats(3).avg > getLineValue() ? 
                          `${processedPlayer.player.name} has been performing above the line in recent games with an average of ${getLastXGamesStats(3).avg} ${processedPlayer.stat_type.toLowerCase()}.` :
                          `${processedPlayer.player.name} has been performing below the line in recent games with an average of ${getLastXGamesStats(3).avg} ${processedPlayer.stat_type.toLowerCase()}.`
                        }
                        {processedPlayer.next_game.home_team === processedPlayer.player.team ? 
                          ` Playing at home where they have a ${(getHomeAwayStats().homeHitRate * 100).toFixed(0)}% hit rate.` :
                          ` Playing away where they have a ${(getHomeAwayStats().awayHitRate * 100).toFixed(0)}% hit rate.`
                        }
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No upcoming game information available
                    </div>
                  )}
                </div>
              </div>
              
              {/* Historical Matchups */}
              <div>
                <h3 className="text-base font-medium text-gray-900 mb-3">Historical Performance</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-sm font-medium text-gray-900">vs Opponent</div>
                          <div className={cn(
                            "text-xs font-medium px-2 py-1 rounded-full",
                            getHitRate('H2H') > 0.5 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          )}>
                            {(getHitRate('H2H') * 100).toFixed(0)}% hit rate
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {getLastXGamesStats(3).avg}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Average {processedPlayer.stat_type}
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-sm font-medium text-gray-900">Current Form</div>
                          <div className={cn(
                            "text-xs font-medium px-2 py-1 rounded-full",
                            getTrendDirection() === 1 ? "bg-green-100 text-green-800" : 
                            getTrendDirection() === -1 ? "bg-red-100 text-red-800" : 
                            "bg-yellow-100 text-yellow-800"
                          )}>
                            {getTrendDirection() === 1 ? "Improving" : getTrendDirection() === -1 ? "Declining" : "Stable"}
                          </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-gray-900">{getCurrentStreak() !== 0 ? Math.abs(getCurrentStreak()) : 'No'}</span>
                          <span className="text-sm text-gray-600">
                            game {getCurrentStreak() > 0 ? 'OVER' : getCurrentStreak() < 0 ? 'UNDER' : ''} streak
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Last hit: {processedPlayer.games && processedPlayer.games.length > 0 ? 
                            (processedPlayer.stat_type.toLowerCase() === 'points' ? processedPlayer.games[0].points : 
                             processedPlayer.stat_type.toLowerCase() === 'assists' ? processedPlayer.games[0].assists : 
                             processedPlayer.games[0].total_rebounds) : 'N/A'
                          }
                        </div>
            </div>
          </div>

                    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                      <div className="py-2 px-3 bg-gray-100 text-xs font-medium text-gray-700">
                        Recent Games Against Similar Opponents
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Date</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Opponent</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">{processedPlayer.stat_type}</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Result</th>
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
                                <td className="py-2 px-3 text-gray-700 text-xs">{game.date}</td>
                                <td className="py-2 px-3 text-gray-700">{game.is_away ? '@' : 'vs'} {opponentName}</td>
                                <td className="py-2 px-3 text-right font-medium text-gray-900">{statValue}</td>
                                <td className={cn(
                                  "py-2 px-3 text-right font-medium text-xs",
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
            </div>
          )}
          
        </div>
      </DialogContent>
    </Dialog>
  )
} 