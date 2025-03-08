'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
)

// Define Team interface
interface Team {
  id: string;
  name: string;
  logo: string;
}

// Define Game interface
interface Game {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  startDate: string;
  odds: {
    spread?: any[];
    total?: any[];
    moneyline?: any[];
  };
}

// Define movement interfaces
interface SpreadMovement {
  timestamp: number;
  sportsbook: string;
  homeTeamSpread: number;
  homeTeamPrice: number;
  awayTeamSpread: number;
  awayTeamPrice: number;
}

interface TotalMovement {
  timestamp: number;
  sportsbook: string;
  points: number;
  overPrice: number;
  underPrice: number;
}

interface MoneylineMovement {
  timestamp: number;
  sportsbook: string;
  homeTeamPrice: number;
  awayTeamPrice: number;
}

interface LineMovementData {
  [gameId: string]: {
    spread: SpreadMovement[];
    total: TotalMovement[];
    moneyline: MoneylineMovement[];
  };
}

export interface GameResearchProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game;
  lineMovementData?: LineMovementData;
}

export default function GameResearchViewOptimized({
  isOpen,
  onClose,
  game,
  lineMovementData
}: GameResearchProps) {
  const [selectedTab, setSelectedTab] = useState('odds')
  const [selectedSportsbook, setSelectedSportsbook] = useState('all')
  
  // Get filtered line movement data based on selected sportsbook
  const filteredLineMovementData = lineMovementData && lineMovementData[game.id] 
    ? {
        spread: selectedSportsbook === 'all' 
          ? lineMovementData[game.id].spread 
          : lineMovementData[game.id].spread.filter(item => item.sportsbook === selectedSportsbook),
        total: selectedSportsbook === 'all' 
          ? lineMovementData[game.id].total 
          : lineMovementData[game.id].total.filter(item => item.sportsbook === selectedSportsbook),
        moneyline: selectedSportsbook === 'all' 
          ? lineMovementData[game.id].moneyline 
          : lineMovementData[game.id].moneyline.filter(item => item.sportsbook === selectedSportsbook)
      }
    : null
  
  // Get unique sportsbooks from line movement data
  const uniqueSportsbooks = lineMovementData && lineMovementData[game.id]
    ? Array.from(new Set([
        ...lineMovementData[game.id].spread.map(item => item.sportsbook),
        ...lineMovementData[game.id].total.map(item => item.sportsbook),
        ...lineMovementData[game.id].moneyline.map(item => item.sportsbook)
      ]))
    : []
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-xl font-bold">
          Game Research: {game.awayTeam.name} @ {game.homeTeam.name}
        </DialogTitle>
        <DialogDescription>
          {new Date(game.startDate).toLocaleString()}
        </DialogDescription>
        
        <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="odds">Odds & Line Movement</TabsTrigger>
            <TabsTrigger value="stats">Team Stats</TabsTrigger>
          </TabsList>
          
          <TabsContent value="odds" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative w-12 h-12">
                  <Image 
                    src={game.awayTeam.logo || '/placeholder.png'} 
                    alt={game.awayTeam.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-lg font-semibold">{game.awayTeam.name}</span>
                <span className="text-lg">@</span>
                <div className="relative w-12 h-12">
                  <Image 
                    src={game.homeTeam.logo || '/placeholder.png'} 
                    alt={game.homeTeam.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-lg font-semibold">{game.homeTeam.name}</span>
              </div>
              
              <div>
                <label htmlFor="sportsbook-filter" className="mr-2 text-sm font-medium">
                  Sportsbook:
                </label>
                <select 
                  id="sportsbook-filter"
                  value={selectedSportsbook}
                  onChange={(e) => setSelectedSportsbook(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="all">All</option>
                  {uniqueSportsbooks.map(book => (
                    <option key={book} value={book}>{book}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Spread Line Movement Chart */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Spread Line Movement</h3>
              {filteredLineMovementData && filteredLineMovementData.spread && filteredLineMovementData.spread.length > 0 ? (
                <div className="h-64">
                  <Line
                    data={{
                      labels: filteredLineMovementData.spread
                        .sort((a: SpreadMovement, b: SpreadMovement) => a.timestamp - b.timestamp)
                        .map((item: SpreadMovement) => new Date(item.timestamp).toLocaleTimeString()),
                      datasets: [
                        {
                          label: `${game.homeTeam.name} Spread`,
                          data: filteredLineMovementData.spread
                            .sort((a: SpreadMovement, b: SpreadMovement) => a.timestamp - b.timestamp)
                            .map((item: SpreadMovement) => item.homeTeamSpread),
                          borderColor: '#8884d8',
                          backgroundColor: 'rgba(136, 132, 216, 0.5)',
                          pointRadius: 4,
                          pointHoverRadius: 8,
                          tension: 0.1
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.dataset.label}: ${context.parsed.y}`;
                            },
                            title: function(tooltipItems) {
                              const index = tooltipItems[0].dataIndex;
                              const sortedData = filteredLineMovementData.spread
                                .sort((a: SpreadMovement, b: SpreadMovement) => a.timestamp - b.timestamp);
                              return new Date(sortedData[index].timestamp).toLocaleString();
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          title: {
                            display: true,
                            text: 'Spread'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Time'
                          }
                        }
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 border border-gray-200 rounded-lg">
                  {selectedSportsbook !== 'all' ? (
                    <p className="text-gray-500">No spread data available for {selectedSportsbook}</p>
                  ) : (
                    <p className="text-gray-500">No spread data available</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Total Points Line Movement Chart */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Total Points Line Movement</h3>
              {filteredLineMovementData && filteredLineMovementData.total && filteredLineMovementData.total.length > 0 ? (
                <div className="h-64">
                  <Line
                    data={{
                      labels: filteredLineMovementData.total
                        .sort((a: TotalMovement, b: TotalMovement) => a.timestamp - b.timestamp)
                        .map((item: TotalMovement) => new Date(item.timestamp).toLocaleTimeString()),
                      datasets: [
                        {
                          label: 'Total Points',
                          data: filteredLineMovementData.total
                            .sort((a: TotalMovement, b: TotalMovement) => a.timestamp - b.timestamp)
                            .map((item: TotalMovement) => item.points),
                          borderColor: '#82ca9d',
                          backgroundColor: 'rgba(130, 202, 157, 0.5)',
                          pointRadius: 4,
                          pointHoverRadius: 8,
                          tension: 0.1
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.dataset.label}: ${context.parsed.y}`;
                            },
                            title: function(tooltipItems) {
                              const index = tooltipItems[0].dataIndex;
                              const sortedData = filteredLineMovementData.total
                                .sort((a: TotalMovement, b: TotalMovement) => a.timestamp - b.timestamp);
                              return new Date(sortedData[index].timestamp).toLocaleString();
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          title: {
                            display: true,
                            text: 'Total Points'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Time'
                          }
                        }
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 border border-gray-200 rounded-lg">
                  {selectedSportsbook !== 'all' ? (
                    <p className="text-gray-500">No total points data available for {selectedSportsbook}</p>
                  ) : (
                    <p className="text-gray-500">No total points data available</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="stats">
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">{game.awayTeam.name} Stats</h3>
                <p className="text-gray-500">Team stats will be displayed here</p>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">{game.homeTeam.name} Stats</h3>
                <p className="text-gray-500">Team stats will be displayed here</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 