'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchPlayerOdds } from '../lib/api'
import { PlayerData } from '../types'

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
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  const [playerProps, setPlayerProps] = useState<PlayerData[]>([]);
  const [isLoadingProps, setIsLoadingProps] = useState(false);
  const [selectedStatType, setSelectedStatType] = useState('points');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Define tabs
  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'odds', name: 'Odds' },
    { id: 'stats', name: 'Team Stats' },
    { id: 'props', name: 'Player Props' }
  ];

  // Format date for display
  const formattedDate = new Date(game.startDate).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  // Process odds data from game prop
  useEffect(() => {
    console.log('Game odds data received:', game.odds);
    
    // Convert the odds data from the game prop to the format expected by the component
    const processedOdds: OddsData[] = [];
    
    // Process moneyline odds
    if (game.odds?.moneyline && game.odds.moneyline.length > 0) {
      game.odds.moneyline.forEach(odd => {
        processedOdds.push({
          market_id: 'moneyline',
          sportsbook: odd.sportsbook,
          team_id: odd.team_id,
          price: odd.price,
          is_main: true
        });
      });
    }
    
    // Process spread odds
    if (game.odds?.spread && game.odds.spread.length > 0) {
      game.odds.spread.forEach(odd => {
        processedOdds.push({
          market_id: 'point_spread',
          sportsbook: odd.sportsbook,
          team_id: odd.team_id,
          price: odd.price,
          points: odd.points,
          is_main: true
        });
      });
    }
    
    // Process total odds
    if (game.odds?.total && game.odds.total.length > 0) {
      game.odds.total.forEach(odd => {
        processedOdds.push({
          market_id: 'total_points',
          sportsbook: odd.sportsbook,
          team_id: '', // Total points don't have a team ID
          price: odd.price,
          points: odd.points,
          selection_line: odd.selection_line,
          is_main: true
        });
      });
    }
    
    console.log('Processed odds data:', processedOdds);
    setOddsData(processedOdds);
  }, [game.odds]);

  // Fetch player props when the component mounts or game changes
  useEffect(() => {
    const fetchProps = async () => {
      if (game && game.id) {
        setIsLoadingProps(true);
        try {
          // Fetch player props for this specific game
          const response = await fetchPlayerOdds(0); // Fetch all fixtures
          
          // Filter props for this specific game
          const gameProps = response.data.filter(prop => 
            prop.next_game && 
            prop.next_game.fixture_id === game.id
          );
          
          console.log(`Found ${gameProps.length} player props for game ${game.id}`);
          setPlayerProps(gameProps);
        } catch (error) {
          console.error('Error fetching player props:', error);
        } finally {
          setIsLoadingProps(false);
        }
      }
    };

    if (activeTab === 'props') {
      fetchProps();
    }
  }, [game.id, activeTab]);

  // Log odds data when it changes
  useEffect(() => {
    console.log('Current odds data state:', oddsData);
    console.log('Moneyline odds:', getMoneylineOdds());
    console.log('Spread odds:', getSpreadOdds());
    console.log('Total odds:', getTotalOdds());
  }, [oddsData]);

  // Filter odds data by sportsbook
  const getFilteredOddsData = () => {
    return oddsData;
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

  // Find best moneyline odds for each team
  const getBestMoneylineOdds = () => {
    const awayBest = getBestOdds('moneyline', game.awayTeam.id);
    const homeBest = getBestOdds('moneyline', game.homeTeam.id);
    
    return {
      away: awayBest ? awayBest.price : null,
      home: homeBest ? homeBest.price : null
    };
  };

  // Find best spread odds for each team
  const getBestSpreadOdds = () => {
    const awayBest = getBestOdds('point_spread', game.awayTeam.id);
    const homeBest = getBestOdds('point_spread', game.homeTeam.id);
    
    return {
      away: awayBest ? { points: awayBest.points, price: awayBest.price } : null,
      home: homeBest ? { points: homeBest.points, price: homeBest.price } : null
    };
  };

  // Find best total odds
  const getBestTotalOdds = () => {
    const overOdds = getFilteredOddsData()
      .filter(odd => odd.market_id === 'total_points' && odd.selection_line === 'over')
      .sort((a, b) => b.price - a.price);
    
    const underOdds = getFilteredOddsData()
      .filter(odd => odd.market_id === 'total_points' && odd.selection_line === 'under')
      .sort((a, b) => b.price - a.price);
    
    return {
      over: overOdds.length > 0 ? overOdds[0].price : null,
      under: underOdds.length > 0 ? underOdds[0].price : null
    };
  };

  // Sort function for odds tables
  const sortData = <T extends Record<string, any>>(data: T[], key: string): T[] => {
    if (!sortConfig || sortConfig.key !== key) return data;
    
    return [...data].sort((a, b) => {
      if (a[key] === null) return 1;
      if (b[key] === null) return -1;
      
      if (a[key] < b[key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  // Request sort for a specific column
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Get sort direction for a column
  const getSortDirection = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction;
  };

  // Sort indicator component
  const SortIndicator = ({ column }: { column: string }) => {
    const direction = getSortDirection(column);
    if (!direction) return <span className="ml-1">↕</span>;
    return <span className="ml-1">{direction === 'ascending' ? '↑' : '↓'}</span>;
  };

  // Handle tab click with smooth scrolling
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    
    // Scroll to the section
    const section = document.getElementById(`section-${tabId}`);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle scroll events to show/hide back to top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Clean up
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
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
        <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
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
        </div>

        {/* Tab content */}
        <div className="p-4">
          {/* Overview Section */}
          <div id="section-overview" className="mb-12 pb-8 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white border-b pb-2">Overview</h2>
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
          </div>

          {/* Odds Section */}
          <div id="section-odds" className="mb-12 pb-8 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white border-b pb-2">Odds Comparison</h2>
            <div>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <>
                  {getMoneylineOdds().length === 0 && getSpreadOdds().length === 0 && getTotalOdds().length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-700 p-8 rounded-lg text-center">
                      <p className="text-gray-500 dark:text-gray-300 mb-2">No odds data available for this game.</p>
                      <p className="text-gray-500 dark:text-gray-300 text-sm">
                        We're currently working on integrating odds from BetMGM, Caesars, DraftKings, and Bet365.
                      </p>
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
                                <th 
                                  scope="col" 
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort('sportsbook')}
                                >
                                  Sportsbook <SortIndicator column="sportsbook" />
                                </th>
                                <th 
                                  scope="col" 
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort('awayOdds')}
                                >
                                  {game.awayTeam.name} <SortIndicator column="awayOdds" />
                                </th>
                                <th 
                                  scope="col" 
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort('homeOdds')}
                                >
                                  {game.homeTeam.name} <SortIndicator column="homeOdds" />
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {getMoneylineOdds().length > 0 ? (
                                sortData(
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
                                    }, [] as { sportsbook: string; awayOdds: number | null; homeOdds: number | null }[]),
                                  sortConfig?.key || 'sportsbook'
                                )
                                  .map((item, index) => (
                                    <tr key={index}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {item.sportsbook}
                                      </td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                                        getBestMoneylineOdds() && item.awayOdds === getBestMoneylineOdds()?.away 
                                          ? 'font-bold text-green-600 dark:text-green-400' 
                                          : 'text-gray-500 dark:text-gray-300'
                                      }`}>
                                        {item.awayOdds !== null ? formatOddsPrice(item.awayOdds) : '-'}
                                      </td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                                        getBestMoneylineOdds() && item.homeOdds === getBestMoneylineOdds()?.home 
                                          ? 'font-bold text-green-600 dark:text-green-400' 
                                          : 'text-gray-500 dark:text-gray-300'
                                      }`}>
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
                                <th 
                                  scope="col" 
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort('sportsbook')}
                                >
                                  Sportsbook <SortIndicator column="sportsbook" />
                                </th>
                                <th 
                                  scope="col" 
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort('awaySpread')}
                                >
                                  {game.awayTeam.name} <SortIndicator column="awaySpread" />
                                </th>
                                <th 
                                  scope="col" 
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort('homeSpread')}
                                >
                                  {game.homeTeam.name} <SortIndicator column="homeSpread" />
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {getSpreadOdds().length > 0 ? (
                                sortData(
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
                                    }, [] as { sportsbook: string; awaySpread: { points?: number; price: number } | null; homeSpread: { points?: number; price: number } | null }[]),
                                  sortConfig?.key || 'sportsbook'
                                )
                                  .map((item, index) => (
                                    <tr key={index}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {item.sportsbook}
                                      </td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                                        getBestSpreadOdds() && 
                                        item.awaySpread && 
                                        getBestSpreadOdds()?.away && 
                                        item.awaySpread.price === getBestSpreadOdds()?.away?.price && 
                                        item.awaySpread.points === getBestSpreadOdds()?.away?.points
                                          ? 'font-bold text-green-600 dark:text-green-400' 
                                          : 'text-gray-500 dark:text-gray-300'
                                      }`}>
                                        {item.awaySpread !== null ? `${item.awaySpread.points !== undefined && item.awaySpread.points > 0 ? '+' : ''}${item.awaySpread.points || 0} (${formatOddsPrice(item.awaySpread.price)})` : '-'}
                                      </td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                                        getBestSpreadOdds() && 
                                        item.homeSpread && 
                                        getBestSpreadOdds()?.home && 
                                        item.homeSpread.price === getBestSpreadOdds()?.home?.price && 
                                        item.homeSpread.points === getBestSpreadOdds()?.home?.points
                                          ? 'font-bold text-green-600 dark:text-green-400' 
                                          : 'text-gray-500 dark:text-gray-300'
                                      }`}>
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
                                <th 
                                  scope="col" 
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort('sportsbook')}
                                >
                                  Sportsbook <SortIndicator column="sportsbook" />
                                </th>
                                <th 
                                  scope="col" 
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                >
                                  Total
                                </th>
                                <th 
                                  scope="col" 
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort('overPrice')}
                                >
                                  Over <SortIndicator column="overPrice" />
                                </th>
                                <th 
                                  scope="col" 
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort('underPrice')}
                                >
                                  Under <SortIndicator column="underPrice" />
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {getTotalOdds().length > 0 ? (
                                sortData(
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
                                    }, [] as { sportsbook: string; total?: number; overPrice: number | null; underPrice: number | null }[]),
                                  sortConfig?.key || 'sportsbook'
                                )
                                  .map((item, index) => (
                                    <tr key={index}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {item.sportsbook}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        {item.total || '-'}
                                      </td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                                        getBestTotalOdds() && item.overPrice === getBestTotalOdds()?.over
                                          ? 'font-bold text-green-600 dark:text-green-400' 
                                          : 'text-gray-500 dark:text-gray-300'
                                      }`}>
                                        {item.overPrice !== null ? formatOddsPrice(item.overPrice) : '-'}
                                      </td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                                        getBestTotalOdds() && item.underPrice === getBestTotalOdds()?.under
                                          ? 'font-bold text-green-600 dark:text-green-400' 
                                          : 'text-gray-500 dark:text-gray-300'
                                      }`}>
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
                </>
              )}
            </div>
          </div>

          {/* Team Stats Section */}
          <div id="section-stats" className="mb-12 pb-8 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white border-b pb-2">Team Statistics</h2>
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">{game.awayTeam.name} Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Points Per Game</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Rebounds Per Game</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Assists Per Game</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Field Goal %</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">3-Point %</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Recent Form</span>
                      <span className="font-medium">--</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">{game.homeTeam.name} Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Points Per Game</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Rebounds Per Game</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Assists Per Game</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Field Goal %</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">3-Point %</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Recent Form</span>
                      <span className="font-medium">--</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Head-to-Head Record</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Last 5 Games</span>
                    <div className="flex space-x-2">
                      <span className="font-medium">{game.awayTeam.name}: --</span>
                      <span className="font-medium">{game.homeTeam.name}: --</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">This Season</span>
                    <div className="flex space-x-2">
                      <span className="font-medium">{game.awayTeam.name}: --</span>
                      <span className="font-medium">{game.homeTeam.name}: --</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Average Score</span>
                    <div className="flex space-x-2">
                      <span className="font-medium">{game.awayTeam.name}: --</span>
                      <span className="font-medium">{game.homeTeam.name}: --</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Note: Team statistics will be implemented in the next phase. This section will display actual team statistics, recent form, and head-to-head records.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Player Props Section */}
          <div id="section-props" className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Player Props</h2>
              <div className="flex items-center space-x-2">
                <select
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                  value={selectedStatType}
                  onChange={(e) => setSelectedStatType(e.target.value)}
                >
                  <option value="points">Points</option>
                  <option value="assists">Assists</option>
                  <option value="rebounds">Rebounds</option>
                </select>
                <select
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                >
                  <option value="all">All Teams</option>
                  <option value={game.homeTeam.id}>{game.homeTeam.name}</option>
                  <option value={game.awayTeam.id}>{game.awayTeam.name}</option>
                </select>
              </div>
            </div>
            <div className="border-b pb-2 mb-4"></div>
            <div>
              {isLoadingProps ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <>
                  {playerProps.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-700 p-8 rounded-lg text-center">
                      <p className="text-gray-500 dark:text-gray-300 mb-2">No player props available for this game.</p>
                      <p className="text-gray-500 dark:text-gray-300 text-sm">
                        We're currently working on integrating player props data.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {playerProps
                        .filter(prop => 
                          (selectedStatType === 'all' || prop.stat_type === selectedStatType) &&
                          (selectedTeam === 'all' || prop.player.team === selectedTeam)
                        )
                        .map((prop, index) => (
                          <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center mb-3">
                              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mr-3">
                                {prop.player.image_url ? (
                                  <Image
                                    src={prop.player.image_url}
                                    alt={prop.player.name}
                                    width={40}
                                    height={40}
                                    className="rounded-full"
                                  />
                                ) : (
                                  <span className="text-lg font-bold text-gray-500">{prop.player.name.charAt(0)}</span>
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">{prop.player.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{prop.player.team} • {prop.player.position}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Line</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{prop.line} {prop.stat_type}</p>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Hit Rate (Last 5)</p>
                                <p className={`font-semibold ${
                                  prop.hit_rates[prop.stat_type as keyof typeof prop.hit_rates]?.last5 > 0.6 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                  {Math.round(prop.hit_rates[prop.stat_type as keyof typeof prop.hit_rates]?.last5 * 100)}%
                                </p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Last 5</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {prop.averages[prop.stat_type as keyof typeof prop.averages]?.last5.toFixed(1)}
                                </p>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Last 10</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {prop.averages[prop.stat_type as keyof typeof prop.averages]?.last10.toFixed(1)}
                                </p>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Season</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {prop.averages[prop.stat_type as keyof typeof prop.averages]?.season.toFixed(1)}
                                </p>
                              </div>
                            </div>
                            
                            {prop.recommended_bet && (
                              <div className={`mt-3 p-2 rounded text-sm ${
                                prop.recommended_bet.type === 'over' 
                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                              }`}>
                                <span className="font-semibold">
                                  {prop.recommended_bet.type === 'over' ? 'Over' : 'Under'} {prop.line}
                                </span> • 
                                <span className="ml-1">
                                  {prop.recommended_bet.confidence} confidence
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-all z-50"
          aria-label="Back to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
} 