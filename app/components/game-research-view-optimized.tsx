'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchFixtureOdds } from '../lib/api'

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

// Define types for odds data
interface OddsData {
  market_id: string;
  sportsbook: string;
  team_id: string;
  price: number;
  points?: number;
  selection_line?: string;
  is_main: boolean;
}

export interface GameResearchProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game;
}

export default function GameResearchViewOptimized({
  isOpen,
  onClose,
  game
}: GameResearchProps) {
  const [selectedTab, setSelectedTab] = useState('odds')
  const [selectedSportsbook, setSelectedSportsbook] = useState('all')
  const [oddsData, setOddsData] = useState<OddsData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch odds data when the component mounts or game changes
  useEffect(() => {
    const fetchOdds = async () => {
      if (game && game.id) {
        setIsLoading(true);
        try {
          const data = await fetchFixtureOdds(game.id);
          setOddsData(data);
        } catch (error) {
          console.error('Error fetching odds data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchOdds();
  }, [game]);

  // Filter odds data by sportsbook
  const getFilteredOddsData = () => {
    if (selectedSportsbook === 'all') {
      return oddsData;
    }
    return oddsData.filter(odd => odd.sportsbook.toLowerCase() === selectedSportsbook.toLowerCase());
  };

  // Get moneyline odds
  const getMoneylineOdds = () => {
    return getFilteredOddsData().filter(odd => odd.market_id === 'moneyline');
  };

  // Get spread odds
  const getSpreadOdds = () => {
    return getFilteredOddsData().filter(odd => odd.market_id === 'point_spread');
  };

  // Get total points odds
  const getTotalOdds = () => {
    return getFilteredOddsData().filter(odd => odd.market_id === 'total_points');
  };

  // Format odds price
  const formatOddsPrice = (price: number) => {
    if (price >= 0) {
      return `+${price}`;
    }
    return price.toString();
  };

  // Get unique sportsbooks from odds data
  const uniqueSportsbooks = Array.from(new Set(oddsData.map(odd => odd.sportsbook)));
  
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
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="odds">Game Odds</TabsTrigger>
            <TabsTrigger value="props">Player Props</TabsTrigger>
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

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {/* Moneyline Odds */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Moneyline Odds</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Sportsbook
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {game.awayTeam.name}
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {game.homeTeam.name}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {getMoneylineOdds().length > 0 ? (
                          getMoneylineOdds()
                            .reduce((acc, odd) => {
                              const existingIndex = acc.findIndex(item => item.sportsbook === odd.sportsbook);
                              if (existingIndex === -1) {
                                acc.push({
                                  sportsbook: odd.sportsbook,
                                  awayOdds: odd.team_id === game.awayTeam.id ? odd.price : null,
                                  homeOdds: odd.team_id === game.homeTeam.id ? odd.price : null
                                });
                              } else {
                                if (odd.team_id === game.awayTeam.id) {
                                  acc[existingIndex].awayOdds = odd.price;
                                } else if (odd.team_id === game.homeTeam.id) {
                                  acc[existingIndex].homeOdds = odd.price;
                                }
                              }
                              return acc;
                            }, [] as { sportsbook: string; awayOdds: number | null; homeOdds: number | null }[])
                            .map((item, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {item.sportsbook}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  {item.awayOdds !== null ? formatOddsPrice(item.awayOdds) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  {item.homeOdds !== null ? formatOddsPrice(item.homeOdds) : '-'}
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center">
                              No moneyline odds available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Spread Odds */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Spread Odds</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Sportsbook
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {game.awayTeam.name}
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {game.homeTeam.name}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {getSpreadOdds().length > 0 ? (
                          getSpreadOdds()
                            .reduce((acc, odd) => {
                              const existingIndex = acc.findIndex(item => item.sportsbook === odd.sportsbook);
                              if (existingIndex === -1) {
                                acc.push({
                                  sportsbook: odd.sportsbook,
                                  awaySpread: odd.team_id === game.awayTeam.id ? { points: odd.points, price: odd.price } : null,
                                  homeSpread: odd.team_id === game.homeTeam.id ? { points: odd.points, price: odd.price } : null
                                });
                              } else {
                                if (odd.team_id === game.awayTeam.id) {
                                  acc[existingIndex].awaySpread = { points: odd.points, price: odd.price };
                                } else if (odd.team_id === game.homeTeam.id) {
                                  acc[existingIndex].homeSpread = { points: odd.points, price: odd.price };
                                }
                              }
                              return acc;
                            }, [] as { sportsbook: string; awaySpread: { points?: number; price: number } | null; homeSpread: { points?: number; price: number } | null }[])
                            .map((item, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {item.sportsbook}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  {item.awaySpread !== null ? `${item.awaySpread.points !== undefined && item.awaySpread.points > 0 ? '+' : ''}${item.awaySpread.points || 0} (${formatOddsPrice(item.awaySpread.price)})` : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  {item.homeSpread !== null ? `${item.homeSpread.points !== undefined && item.homeSpread.points > 0 ? '+' : ''}${item.homeSpread.points || 0} (${formatOddsPrice(item.homeSpread.price)})` : '-'}
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center">
                              No spread odds available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total Points Odds */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Total Points Odds</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Sportsbook
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Total
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Over
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Under
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {getTotalOdds().length > 0 ? (
                          getTotalOdds()
                            .reduce((acc, odd) => {
                              const existingIndex = acc.findIndex(item => item.sportsbook === odd.sportsbook);
                              const isOver = odd.selection_line === 'over';
                              
                              if (existingIndex === -1) {
                                acc.push({
                                  sportsbook: odd.sportsbook,
                                  total: odd.points,
                                  overPrice: isOver ? odd.price : null,
                                  underPrice: !isOver ? odd.price : null
                                });
                              } else {
                                if (isOver) {
                                  acc[existingIndex].overPrice = odd.price;
                                } else {
                                  acc[existingIndex].underPrice = odd.price;
                                }
                                // Update total points if not already set
                                if (!acc[existingIndex].total && odd.points) {
                                  acc[existingIndex].total = odd.points;
                                }
                              }
                              return acc;
                            }, [] as { sportsbook: string; total?: number; overPrice: number | null; underPrice: number | null }[])
                            .map((item, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {item.sportsbook}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  {item.total || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  {item.overPrice !== null ? formatOddsPrice(item.overPrice) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  {item.underPrice !== null ? formatOddsPrice(item.underPrice) : '-'}
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center">
                              No total points odds available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="props">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">Player Props</div>
              <div className="flex items-center space-x-2">
                <select
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                  defaultValue="all"
                >
                  <option value="all">All Players</option>
                  <option value={`${game.homeTeam.id}`}>{game.homeTeam.name} Players</option>
                  <option value={`${game.awayTeam.id}`}>{game.awayTeam.name} Players</option>
                </select>
                <select
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                  defaultValue="all"
                >
                  <option value="all">All Prop Types</option>
                  <option value="points">Points</option>
                  <option value="rebounds">Rebounds</option>
                  <option value="assists">Assists</option>
                  <option value="threes">Three Pointers</option>
                </select>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
              <p className="text-gray-500 dark:text-gray-300">Player props data will be implemented in the next phase.</p>
              <p className="text-gray-500 dark:text-gray-300 mt-2">This section will display player props for both teams with odds comparison across sportsbooks.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">{game.awayTeam.name} Statistics</h3>
                <div className="space-y-3">
                  <p className="text-gray-500 dark:text-gray-300">Team statistics will be implemented in the next phase.</p>
                  <p className="text-gray-500 dark:text-gray-300">This section will display team statistics, recent form, and head-to-head records.</p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">{game.homeTeam.name} Statistics</h3>
                <div className="space-y-3">
                  <p className="text-gray-500 dark:text-gray-300">Team statistics will be implemented in the next phase.</p>
                  <p className="text-gray-500 dark:text-gray-300">This section will display team statistics, recent form, and head-to-head records.</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 