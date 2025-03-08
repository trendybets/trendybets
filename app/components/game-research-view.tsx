'use client'

import { useState, useEffect } from 'react'
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
import { fetchFixtureOdds } from '../lib/api'

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

// Define types for line movement data
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

export default function GameResearchView({
  isOpen,
  onClose,
  game,
  lineMovementData
}: GameResearchProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // State for selected sportsbook
  const [selectedSportsbook, setSelectedSportsbook] = useState<string>("all");

  // Available sportsbooks
  const availableSportsbooks = [
    { value: "all", label: "All Sportsbooks" },
    { value: "draftkings", label: "DraftKings" },
    { value: "betmgm", label: "BetMGM" },
    { value: "caesars", label: "Caesars" },
    { value: "bet365", label: "Bet365" },
    { value: "fanduel", label: "FanDuel" },
    { value: "espn_bet", label: "ESPN Bet" }
  ];
  
  // Define tabs
  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'odds', name: 'Game Odds' },
    { id: 'props', name: 'Player Props' },
    { id: 'stats', name: 'Team Statistics' }
  ];

  // Format date for display
  const formattedDate = new Date(game.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  // Get filtered line movement data based on the selected timeframe
  const getFilteredLineMovementData = () => {
    if (!lineMovementData || !lineMovementData[game.id]) {
      return null;
    }
    
    // If no filtering needed, return all data
    return lineMovementData[game.id];
  };
  
  // Get filtered line movement data
  const filteredLineMovementData = getFilteredLineMovementData();
  
  // Get the latest timestamp from the line movement data
  const getLatestTimestamp = () => {
    if (!filteredLineMovementData) return null;
    
    const timestamps: number[] = [];
    
    if (filteredLineMovementData.spread && filteredLineMovementData.spread.length > 0) {
      timestamps.push(...filteredLineMovementData.spread.map((item: { timestamp: number }) => item.timestamp));
    }
    if (filteredLineMovementData.total && filteredLineMovementData.total.length > 0) {
      timestamps.push(...filteredLineMovementData.total.map((item: { timestamp: number }) => item.timestamp));
    }
    if (filteredLineMovementData.moneyline && filteredLineMovementData.moneyline.length > 0) {
      timestamps.push(...filteredLineMovementData.moneyline.map((item: { timestamp: number }) => item.timestamp));
    }
    
    return timestamps.length > 0 ? Math.max(...timestamps) : null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Game Research</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Game header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-end w-2/5">
              <div className="text-right mr-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{game.awayTeam.name}</h3>
                <div className="flex items-center justify-end mt-1">
                  <span className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-medium px-2 py-0.5 rounded">
                    Away
                  </span>
                </div>
              </div>
              <div className="w-20 h-20 relative">
                <Image
                  src={game.awayTeam.logo || '/team-logos/default.png'}
                  alt={game.awayTeam.name}
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center mx-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">VS</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formattedDate}</div>
            </div>

            <div className="flex items-center w-2/5">
              <div className="w-20 h-20 relative">
                <Image
                  src={game.homeTeam.logo || '/team-logos/default.png'}
                  alt={game.homeTeam.name}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="text-left ml-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{game.homeTeam.name}</h3>
                <div className="flex items-center mt-1">
                  <span className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-medium px-2 py-0.5 rounded">
                    Home
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Last Updated Timestamp */}
        <div className="px-4 pt-2 text-xs text-gray-500">
          {filteredLineMovementData && getLatestTimestamp() ? (
            <span>Last updated: {getLatestTimestamp()}</span>
          ) : null}
        </div>

        {/* Tabs */}
        <div className="p-4">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div className="mt-4">
            {activeTab === 'overview' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Game Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">Date & Time</p>
                          <p className="font-medium text-gray-900 dark:text-white">{formattedDate}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">Location</p>
                          <p className="font-medium text-gray-900 dark:text-white">{game.homeTeam.name} Arena</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">Game ID</p>
                          <p className="font-medium text-gray-900 dark:text-white">{game.id}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">Matchup</p>
                          <p className="font-medium text-gray-900 dark:text-white">{game.awayTeam.name} @ {game.homeTeam.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'odds' && (
              <div>
                {/* Sportsbook Selector */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-semibold">Line Movement</div>
                  <div className="flex items-center">
                    <label htmlFor="sportsbook-select" className="mr-2 text-sm text-gray-600">
                      Sportsbook:
                    </label>
                    <select
                      id="sportsbook-select"
                      value={selectedSportsbook}
                      onChange={(e) => setSelectedSportsbook(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      {availableSportsbooks.map((book) => (
                        <option key={book.value} value={book.value}>
                          {book.label}
                        </option>
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
                                  return new Date(filteredLineMovementData.spread[tooltipItems[0].dataIndex].timestamp).toLocaleString();
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
                        <>
                          <p>No spread line movement data available</p>
                        </>
                      ) : (
                        <>
                          <p>No spread line movement data available</p>
                        </>
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
                            .map((item) => new Date(item.timestamp)),
                          datasets: [
                            {
                              label: 'Total Points',
                              data: filteredLineMovementData.total
                                .sort((a: TotalMovement, b: TotalMovement) => a.timestamp - b.timestamp)
                                .map((item) => item.points),
                              borderColor: '#82ca9d',
                              backgroundColor: 'rgba(130, 202, 157, 0.2)',
                              pointRadius: 4,
                              pointHoverRadius: 8,
                              stepped: true,
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            x: {
                              title: {
                                display: true,
                                text: 'Time'
                              },
                              ticks: {
                                callback: function(value, index, values) {
                                  const date = new Date(this.getLabelForValue(index as number));
                                  return date.toLocaleTimeString();
                                }
                              }
                            },
                            y: {
                              title: {
                                display: true,
                                text: 'Total Points'
                              }
                            }
                          },
                          plugins: {
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  return `Total Points: ${context.parsed.y}`;
                                },
                                title: function(tooltipItems) {
                                  return new Date(tooltipItems[0].parsed.x).toLocaleString();
                                }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 border border-gray-200 rounded-lg">
                      {selectedSportsbook !== 'all' ? (
                        <>
                          <p>No total points line movement data available</p>
                        </>
                      ) : (
                        <>
                          <p>No total points line movement data available</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Moneyline Movement Chart */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Moneyline Movement</h3>
                  {filteredLineMovementData && filteredLineMovementData.moneyline && filteredLineMovementData.moneyline.length > 0 ? (
                    <div className="h-64">
                      <Line
                        data={{
                          labels: filteredLineMovementData.moneyline
                            .sort((a: MoneylineMovement, b: MoneylineMovement) => a.timestamp - b.timestamp)
                            .map((item) => new Date(item.timestamp)),
                          datasets: [
                            {
                              label: game.homeTeam.name,
                              data: filteredLineMovementData.moneyline
                                .sort((a: MoneylineMovement, b: MoneylineMovement) => a.timestamp - b.timestamp)
                                .map((item) => item.homeTeamPrice),
                              borderColor: '#8884d8',
                              backgroundColor: 'rgba(136, 132, 216, 0.2)',
                              pointRadius: 4,
                              pointHoverRadius: 8,
                              stepped: true,
                            },
                            {
                              label: game.awayTeam.name,
                              data: filteredLineMovementData.moneyline
                                .sort((a: MoneylineMovement, b: MoneylineMovement) => a.timestamp - b.timestamp)
                                .map((item) => item.awayTeamPrice),
                              borderColor: '#82ca9d',
                              backgroundColor: 'rgba(130, 202, 157, 0.2)',
                              pointRadius: 4,
                              pointHoverRadius: 8,
                              stepped: true,
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            x: {
                              title: {
                                display: true,
                                text: 'Time'
                              },
                              ticks: {
                                callback: function(value, index, values) {
                                  const date = new Date(this.getLabelForValue(index as number));
                                  return date.toLocaleTimeString();
                                }
                              }
                            },
                            y: {
                              title: {
                                display: true,
                                text: 'Moneyline'
                              }
                            }
                          },
                          plugins: {
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  const datasetLabel = context.dataset.label || '';
                                  return `${datasetLabel}: ${context.parsed.y}`;
                                },
                                title: function(tooltipItems) {
                                  return new Date(tooltipItems[0].parsed.x).toLocaleString();
                                }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 border border-gray-200 rounded-lg">
                      {selectedSportsbook !== 'all' ? (
                        <>
                          <p>No moneyline movement data available</p>
                        </>
                      ) : (
                        <>
                          <p>No moneyline movement data available</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'props' && (
              <div>
                <h3>Player Props Content</h3>
                <p>Player props would go here</p>
              </div>
            )}

            {activeTab === 'stats' && (
              <div>
                <h3>Team Statistics Content</h3>
                <p>Team statistics would go here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 