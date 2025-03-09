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

export default function GameResearchView({
  isOpen,
  onClose,
  game
}: GameResearchProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [oddsData, setOddsData] = useState<OddsData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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

  // Get best odds for a market and team
  const getBestOdds = (market: string, teamId: string) => {
    const odds = getFilteredOddsData()
      .filter(odd => odd.market_id === market && odd.team_id === teamId)
      .sort((a, b) => {
        // For moneyline and point spread, higher price is better
        if (market === 'moneyline' || market === 'point_spread') {
          return b.price - a.price;
        }
        // For total points, it depends on the selection line
        return 0;
      });
    
    return odds.length > 0 ? odds[0] : null;
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
                  <div className="text-lg font-semibold">Odds Comparison</div>
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
              </div>
            )}

            {activeTab === 'props' && (
              <div>
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
              </div>
            )}

            {activeTab === 'stats' && (
              <div>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 