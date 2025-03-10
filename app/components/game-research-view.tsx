'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchPlayerOdds } from '../lib/api'
import { PlayerData } from '../types'
import { cn } from '@/app/lib/utils'

// Define Team interface
interface Team {
  id: string;
  name: string;
  logo: string;
  record?: string | null;
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

// Add team colors mapping
const teamColors: { [key: string]: { primary: string; secondary: string } } = {
  "Los Angeles Lakers": { primary: "#552583", secondary: "#FDB927" },
  "Los Angeles Clippers": { primary: "#C8102E", secondary: "#1D428A" },
  "Golden State Warriors": { primary: "#1D428A", secondary: "#FFC72C" },
  "Sacramento Kings": { primary: "#5A2D81", secondary: "#63727A" },
  "Phoenix Suns": { primary: "#1D1160", secondary: "#E56020" },
  "Dallas Mavericks": { primary: "#00538C", secondary: "#002B5E" },
  "San Antonio Spurs": { primary: "#C4CED4", secondary: "#000000" },
  "Houston Rockets": { primary: "#CE1141", secondary: "#000000" },
  "Memphis Grizzlies": { primary: "#5D76A9", secondary: "#12173F" },
  "New Orleans Pelicans": { primary: "#0C2340", secondary: "#C8102E" },
  "Minnesota Timberwolves": { primary: "#0C2340", secondary: "#236192" },
  "Denver Nuggets": { primary: "#0E2240", secondary: "#FEC524" },
  "Oklahoma City Thunder": { primary: "#007AC1", secondary: "#EF3B24" },
  "Portland Trail Blazers": { primary: "#E03A3E", secondary: "#000000" },
  "Utah Jazz": { primary: "#002B5C", secondary: "#00471B" },
  "Milwaukee Bucks": { primary: "#00471B", secondary: "#EEE1C6" },
  "Chicago Bulls": { primary: "#CE1141", secondary: "#000000" },
  "Cleveland Cavaliers": { primary: "#860038", secondary: "#041E42" },
  "Detroit Pistons": { primary: "#C8102E", secondary: "#1D42BA" },
  "Indiana Pacers": { primary: "#002D62", secondary: "#FDBB30" },
  "Miami Heat": { primary: "#98002E", secondary: "#F9A01B" },
  "Orlando Magic": { primary: "#0077C0", secondary: "#C4CED4" },
  "Atlanta Hawks": { primary: "#E03A3E", secondary: "#C1D32F" },
  "Charlotte Hornets": { primary: "#1D1160", secondary: "#00788C" },
  "Washington Wizards": { primary: "#002B5C", secondary: "#E31837" },
  "Boston Celtics": { primary: "#007A33", secondary: "#BA9653" },
  "Brooklyn Nets": { primary: "#000000", secondary: "#FFFFFF" },
  "New York Knicks": { primary: "#006BB6", secondary: "#F58426" },
  "Philadelphia 76ers": { primary: "#006BB6", secondary: "#ED174C" },
  "Toronto Raptors": { primary: "#CE1141", secondary: "#000000" },
};

// Helper function to get team colors
const getTeamColors = (teamName: string) => {
  return teamColors[teamName] || { primary: "#333333", secondary: "#999999" };
};

// Define a type for the processed odds data
interface ProcessedOdds {
  sportsbook: string;
  awayOdds: number;
  homeOdds: number;
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
    return sortData(
      getFilteredOddsData()
        .filter(odd => odd.market_id === 'moneyline')
        .reduce((acc, odd) => {
          const existingIndex = acc.findIndex(item => item.sportsbook === odd.sportsbook);
          if (existingIndex === -1) {
            acc.push({
              sportsbook: odd.sportsbook,
              awayOdds: odd.team_id === game.awayTeam.id ? odd.price : 0,
              homeOdds: odd.team_id === game.homeTeam.id ? odd.price : 0
            });
          } else {
            if (odd.team_id === game.awayTeam.id) {
              acc[existingIndex].awayOdds = odd.price;
            } else if (odd.team_id === game.homeTeam.id) {
              acc[existingIndex].homeOdds = odd.price;
            }
          }
          return acc;
        }, [] as ProcessedOdds[]),
      sortConfig?.key || 'sportsbook'
    );
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
    const moneylineOdds = getMoneylineOdds();
    if (moneylineOdds.length === 0) return { away: 0, home: 0 };
    
    let bestAwayOdds = moneylineOdds[0].awayOdds;
    let bestHomeOdds = moneylineOdds[0].homeOdds;
    
    moneylineOdds.forEach(odd => {
      if (odd.awayOdds > bestAwayOdds) {
        bestAwayOdds = odd.awayOdds;
      }
      if (odd.homeOdds > bestHomeOdds) {
        bestHomeOdds = odd.homeOdds;
      }
    });
    
    return { away: bestAwayOdds, home: bestHomeOdds };
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

  // Get team colors
  const homeTeamColors = getTeamColors(game.homeTeam.name);
  const awayTeamColors = getTeamColors(game.awayTeam.name);

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-primary-black-50 dark:bg-primary-black-800">
          <div className="flex items-center">
            <h2 className="text-xl font-bold text-primary-black-900 dark:text-white font-sports">Game Research</h2>
          </div>
          <button
            onClick={onClose}
            className="text-primary-black-500 hover:text-primary-black-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Game header with team colors */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-black-50 to-white dark:from-primary-black-800 dark:to-primary-black-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-end w-2/5">
              <div className="text-right mr-6">
                <h3 className="text-2xl font-bold font-sports" style={{ color: awayTeamColors.primary }}>{game.awayTeam.name}</h3>
                <div className="flex items-center justify-end mt-2">
                  <span 
                    className="text-xs font-medium px-3 py-1 rounded-full font-sports"
                    style={{ 
                      backgroundColor: `${awayTeamColors.primary}20`, 
                      color: awayTeamColors.primary,
                      border: `1px solid ${awayTeamColors.primary}40`
                    }}
                  >
                    Away
                  </span>
                </div>
              </div>
              <div className="w-24 h-24 relative">
                <div 
                  className="absolute inset-0 rounded-full opacity-10"
                  style={{ backgroundColor: awayTeamColors.primary }}
                ></div>
                <Image
                  src={game.awayTeam.logo}
                  alt={game.awayTeam.name}
                  fill
                  className="object-contain p-1"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://cdn.opticodds.com/team-logos/basketball/default.png';
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center mx-6">
              <div className="text-3xl font-bold text-primary-black-900 dark:text-white font-sports">VS</div>
              <div className="text-sm text-primary-black-600 dark:text-gray-400 mt-2 font-sports">{formattedDate}</div>
              <div className="mt-2 px-4 py-1 bg-primary-blue-500 text-white rounded-full text-xs font-medium">
                {new Date(game.startDate) > new Date() ? 'Upcoming' : 'In Progress'}
              </div>
            </div>

            <div className="flex items-center w-2/5">
              <div className="w-24 h-24 relative">
                <div 
                  className="absolute inset-0 rounded-full opacity-10"
                  style={{ backgroundColor: homeTeamColors.primary }}
                ></div>
                <Image
                  src={game.homeTeam.logo}
                  alt={game.homeTeam.name}
                  fill
                  className="object-contain p-1"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://cdn.opticodds.com/team-logos/basketball/default.png';
                  }}
                />
              </div>
              <div className="text-left ml-6">
                <h3 className="text-2xl font-bold font-sports" style={{ color: homeTeamColors.primary }}>{game.homeTeam.name}</h3>
                <div className="flex items-center mt-2">
                  <span 
                    className="text-xs font-medium px-3 py-1 rounded-full font-sports"
                    style={{ 
                      backgroundColor: `${homeTeamColors.primary}20`, 
                      color: homeTeamColors.primary,
                      border: `1px solid ${homeTeamColors.primary}40`
                    }}
                  >
                    Home
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - updated with sports font and better styling */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-6 py-2">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-primary-blue-500 text-primary-blue-600 dark:text-primary-blue-400'
                      : 'border-transparent text-primary-black-500 hover:text-primary-black-700 hover:border-primary-black-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm font-sports transition-colors`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {/* Overview Section */}
          <div id="section-overview" className="mb-12 pb-8 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-primary-black-900 dark:text-white border-b pb-2 font-sports">Overview</h2>
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-primary-black-100 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 font-sports text-primary-black-900 dark:text-white flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Game Details
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-primary-black-50 dark:bg-gray-700 p-3 rounded-md">
                        <p className="text-xs uppercase tracking-wider font-medium text-primary-black-500 dark:text-gray-400 mb-1 font-sports">Date & Time</p>
                        <p className="font-medium text-primary-black-900 dark:text-white font-sports">{formattedDate}</p>
                      </div>
                      <div className="bg-primary-black-50 dark:bg-gray-700 p-3 rounded-md">
                        <p className="text-xs uppercase tracking-wider font-medium text-primary-black-500 dark:text-gray-400 mb-1 font-sports">Location</p>
                        <p className="font-medium text-primary-black-900 dark:text-white font-sports">{game.homeTeam.name} Arena</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-primary-black-50 dark:bg-gray-700 p-3 rounded-md">
                        <p className="text-xs uppercase tracking-wider font-medium text-primary-black-500 dark:text-gray-400 mb-1 font-sports">Game ID</p>
                        <p className="font-medium text-primary-black-900 dark:text-white font-mono text-sm">{game.id}</p>
                      </div>
                      <div className="bg-primary-black-50 dark:bg-gray-700 p-3 rounded-md">
                        <p className="text-xs uppercase tracking-wider font-medium text-primary-black-500 dark:text-gray-400 mb-1 font-sports">Matchup</p>
                        <p className="font-medium text-primary-black-900 dark:text-white font-sports">{game.awayTeam.name} @ {game.homeTeam.name}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-primary-black-100 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 font-sports text-primary-black-900 dark:text-white flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    Quick Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex flex-col items-center p-4 bg-primary-black-50 dark:bg-gray-700 rounded-md" style={{ borderLeft: `4px solid ${awayTeamColors.primary}` }}>
                        <p className="text-xs uppercase tracking-wider font-medium text-primary-black-500 dark:text-gray-400 mb-2 font-sports">{game.awayTeam.name}</p>
                        <div className="w-16 h-16 relative mb-2">
                          <Image
                            src={game.awayTeam.logo}
                            alt={game.awayTeam.name}
                            fill
                            className="object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://cdn.opticodds.com/team-logos/basketball/default.png';
                            }}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-primary-black-500 dark:text-gray-400 font-sports">Season Record</p>
                          <p className="font-medium text-primary-black-900 dark:text-white font-sports">
                            {game.awayTeam.record || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex flex-col items-center p-4 bg-primary-black-50 dark:bg-gray-700 rounded-md" style={{ borderLeft: `4px solid ${homeTeamColors.primary}` }}>
                        <p className="text-xs uppercase tracking-wider font-medium text-primary-black-500 dark:text-gray-400 mb-2 font-sports">{game.homeTeam.name}</p>
                        <div className="w-16 h-16 relative mb-2">
                          <Image
                            src={game.homeTeam.logo}
                            alt={game.homeTeam.name}
                            fill
                            className="object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://cdn.opticodds.com/team-logos/basketball/default.png';
                            }}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-primary-black-500 dark:text-gray-400 font-sports">Season Record</p>
                          <p className="font-medium text-primary-black-900 dark:text-white font-sports">
                            {game.homeTeam.record || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Odds Section */}
          <div id="section-odds" className="mb-12 pb-8 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-primary-black-900 dark:text-white border-b pb-2 font-sports">Odds Comparison</h2>
            <div>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue-500"></div>
                </div>
              ) : (
                <>
                  {getMoneylineOdds().length === 0 && getSpreadOdds().length === 0 && getTotalOdds().length === 0 ? (
                    <div className="bg-primary-black-50 dark:bg-gray-700 p-8 rounded-lg text-center border border-primary-black-100 dark:border-gray-600 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-primary-black-300 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-primary-black-700 dark:text-gray-300 mb-2 font-sports">No odds data available for this game.</p>
                      <p className="text-primary-black-500 dark:text-gray-400 text-sm font-sports">
                        We're currently working on integrating odds from BetMGM, Caesars, DraftKings, and Bet365.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Moneyline Odds */}
                      {getMoneylineOdds().length > 0 && (
                        <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-primary-black-100 dark:border-gray-700">
                          <h3 className="text-lg font-semibold mb-4 font-sports text-primary-black-900 dark:text-white flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-blue-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Moneyline Odds
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-primary-black-200 dark:divide-gray-700">
                              <thead className="bg-primary-black-50 dark:bg-gray-700">
                                <tr>
                                  <th 
                                    scope="col" 
                                    className="px-6 py-3 text-left text-xs font-medium text-primary-black-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer font-sports"
                                    onClick={() => requestSort('sportsbook')}
                                  >
                                    Sportsbook <SortIndicator column="sportsbook" />
                                  </th>
                                  <th 
                                    scope="col" 
                                    className="px-6 py-3 text-left text-xs font-medium text-primary-black-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer font-sports"
                                    onClick={() => requestSort('awayOdds')}
                                    style={{ color: awayTeamColors.primary }}
                                  >
                                    {game.awayTeam.name} <SortIndicator column="awayOdds" />
                                  </th>
                                  <th 
                                    scope="col" 
                                    className="px-6 py-3 text-left text-xs font-medium text-primary-black-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer font-sports"
                                    onClick={() => requestSort('homeOdds')}
                                    style={{ color: homeTeamColors.primary }}
                                  >
                                    {game.homeTeam.name} <SortIndicator column="homeOdds" />
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-800 divide-y divide-primary-black-200 dark:divide-gray-700">
                                {getMoneylineOdds().map((row, index) => {
                                  const bestAwayOdds = getBestMoneylineOdds().away;
                                  const bestHomeOdds = getBestMoneylineOdds().home;
                                  const isAwayBest = row.awayOdds === bestAwayOdds;
                                  const isHomeBest = row.homeOdds === bestHomeOdds;
                                  
                                  return (
                                    <tr key={index} className="hover:bg-primary-black-50 dark:hover:bg-gray-700 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className="h-8 w-8 relative mr-3">
                                            <Image
                                              src={`https://cdn.opticodds.com/sportsbook-logos/${row.sportsbook}.jpg`}
                                              alt={row.sportsbook}
                                              fill
                                              className="object-contain rounded-full"
                                              onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = '/sportsbook-logos/default.png';
                                              }}
                                            />
                                          </div>
                                          <span className="font-medium text-primary-black-900 dark:text-white font-sports">
                                            {row.sportsbook.charAt(0).toUpperCase() + row.sportsbook.slice(1)}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`font-medium font-sports ${
                                          row.awayOdds > 0 
                                            ? 'text-primary-green-600 dark:text-primary-green-400' 
                                            : 'text-semantic-error dark:text-red-400'
                                        } ${isAwayBest ? 'relative' : ''}`}>
                                          {isAwayBest && (
                                            <span className="absolute -left-4 top-1/2 transform -translate-y-1/2 text-primary-green-500">
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                              </svg>
                                            </span>
                                          )}
                                          {row.awayOdds > 0 ? `+${row.awayOdds}` : row.awayOdds}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`font-medium font-sports ${
                                          row.homeOdds > 0 
                                            ? 'text-primary-green-600 dark:text-primary-green-400' 
                                            : 'text-semantic-error dark:text-red-400'
                                        } ${isHomeBest ? 'relative' : ''}`}>
                                          {isHomeBest && (
                                            <span className="absolute -left-4 top-1/2 transform -translate-y-1/2 text-primary-green-500">
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                              </svg>
                                            </span>
                                          )}
                                          {row.homeOdds > 0 ? `+${row.homeOdds}` : row.homeOdds}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

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
            <h2 className="text-2xl font-bold mb-6 text-primary-black-900 dark:text-white border-b pb-2 font-sports">Team Statistics</h2>
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-primary-black-100 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 font-sports text-primary-black-900 dark:text-white flex items-center" style={{ color: awayTeamColors.primary }}>
                    <div className="w-8 h-8 relative mr-2">
                      <Image
                        src={game.awayTeam.logo}
                        alt={game.awayTeam.name}
                        fill
                        className="object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://cdn.opticodds.com/team-logos/basketball/default.png';
                        }}
                      />
                    </div>
                    {game.awayTeam.name} Statistics
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-primary-black-50 dark:bg-gray-700 p-3 rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="text-primary-black-600 dark:text-gray-400 font-sports">Points Per Game</span>
                        <span className="font-medium text-primary-black-900 dark:text-white font-sports">--</span>
                      </div>
                      <div className="w-full bg-primary-black-200 dark:bg-gray-600 h-2 mt-2 rounded-full overflow-hidden">
                        <div className="bg-primary-blue-500 h-full rounded-full" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                    <div className="bg-primary-black-50 dark:bg-gray-700 p-3 rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="text-primary-black-600 dark:text-gray-400 font-sports">Rebounds Per Game</span>
                        <span className="font-medium text-primary-black-900 dark:text-white font-sports">--</span>
                      </div>
                      <div className="w-full bg-primary-black-200 dark:bg-gray-600 h-2 mt-2 rounded-full overflow-hidden">
                        <div className="bg-primary-blue-500 h-full rounded-full" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                    <div className="bg-primary-black-50 dark:bg-gray-700 p-3 rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="text-primary-black-600 dark:text-gray-400 font-sports">Assists Per Game</span>
                        <span className="font-medium text-primary-black-900 dark:text-white font-sports">--</span>
                      </div>
                      <div className="w-full bg-primary-black-200 dark:bg-gray-600 h-2 mt-2 rounded-full overflow-hidden">
                        <div className="bg-primary-blue-500 h-full rounded-full" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                    <div className="bg-primary-black-50 dark:bg-gray-700 p-3 rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="text-primary-black-600 dark:text-gray-400 font-sports">Field Goal %</span>
                        <span className="font-medium text-primary-black-900 dark:text-white font-sports">--</span>
                      </div>
                      <div className="w-full bg-primary-black-200 dark:bg-gray-600 h-2 mt-2 rounded-full overflow-hidden">
                        <div className="bg-primary-blue-500 h-full rounded-full" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                    <div className="bg-primary-black-50 dark:bg-gray-700 p-3 rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="text-primary-black-600 dark:text-gray-400 font-sports">3-Point %</span>
                        <span className="font-medium text-primary-black-900 dark:text-white font-sports">--</span>
                      </div>
                      <div className="w-full bg-primary-black-200 dark:bg-gray-600 h-2 mt-2 rounded-full overflow-hidden">
                        <div className="bg-primary-blue-500 h-full rounded-full" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-primary-black-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 font-sports text-primary-black-900 dark:text-white flex items-center" style={{ color: homeTeamColors.primary }}>
                      <div className="w-8 h-8 relative mr-2">
                        <Image
                          src={game.homeTeam.logo}
                          alt={game.homeTeam.name}
                          fill
                          className="object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://cdn.opticodds.com/team-logos/basketball/default.png';
                          }}
                        />
                      </div>
                      {game.homeTeam.name} Statistics
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-primary-black-50 dark:bg-gray-700 p-3 rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="text-primary-black-600 dark:text-gray-400 font-sports">Points Per Game</span>
                          <span className="font-medium text-primary-black-900 dark:text-white font-sports">--</span>
                        </div>
                        <div className="w-full bg-primary-black-200 dark:bg-gray-600 h-2 mt-2 rounded-full overflow-hidden">
                          <div className="bg-primary-blue-500 h-full rounded-full" style={{ width: '0%' }}></div>
                        </div>
                      </div>
                      <div className="bg-primary-black-50 dark:bg-gray-700 p-3 rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="text-primary-black-600 dark:text-gray-400 font-sports">Rebounds Per Game</span>
                          <span className="font-medium text-primary-black-900 dark:text-white font-sports">--</span>
                        </div>
                        <div className="w-full bg-primary-black-200 dark:bg-gray-600 h-2 mt-2 rounded-full overflow-hidden">
                          <div className="bg-primary-blue-500 h-full rounded-full" style={{ width: '0%' }}></div>
                        </div>
                      </div>
                      <div className="bg-primary-black-50 dark:bg-gray-700 p-3 rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="text-primary-black-600 dark:text-gray-400 font-sports">Assists Per Game</span>
                          <span className="font-medium text-primary-black-900 dark:text-white font-sports">--</span>
                        </div>
                        <div className="w-full bg-primary-black-200 dark:bg-gray-600 h-2 mt-2 rounded-full overflow-hidden">
                          <div className="bg-primary-blue-500 h-full rounded-full" style={{ width: '0%' }}></div>
                        </div>
                      </div>
                      <div className="bg-primary-black-50 dark:bg-gray-700 p-3 rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="text-primary-black-600 dark:text-gray-400 font-sports">Field Goal %</span>
                          <span className="font-medium text-primary-black-900 dark:text-white font-sports">--</span>
                        </div>
                        <div className="w-full bg-primary-black-200 dark:bg-gray-600 h-2 mt-2 rounded-full overflow-hidden">
                          <div className="bg-primary-blue-500 h-full rounded-full" style={{ width: '0%' }}></div>
                        </div>
                      </div>
                      <div className="bg-primary-black-50 dark:bg-gray-700 p-3 rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="text-primary-black-600 dark:text-gray-400 font-sports">3-Point %</span>
                          <span className="font-medium text-primary-black-900 dark:text-white font-sports">--</span>
                        </div>
                        <div className="w-full bg-primary-black-200 dark:bg-gray-600 h-2 mt-2 rounded-full overflow-hidden">
                          <div className="bg-primary-blue-500 h-full rounded-full" style={{ width: '0%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-primary-black-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 font-sports text-primary-black-900 dark:text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  Head-to-Head Record
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-primary-black-50 dark:bg-gray-700 p-4 rounded-md text-center">
                      <div className="text-xl font-bold text-primary-black-900 dark:text-white font-sports" style={{ color: awayTeamColors.primary }}>--</div>
                      <div className="text-sm text-primary-black-600 dark:text-gray-400 font-sports">{game.awayTeam.name} Wins</div>
                    </div>
                    <div className="bg-primary-black-50 dark:bg-gray-700 p-4 rounded-md text-center">
                      <div className="text-xl font-bold text-primary-black-900 dark:text-white font-sports">--</div>
                      <div className="text-sm text-primary-black-600 dark:text-gray-400 font-sports">Last 5 Games</div>
                    </div>
                    <div className="bg-primary-black-50 dark:bg-gray-700 p-4 rounded-md text-center">
                      <div className="text-xl font-bold text-primary-black-900 dark:text-white font-sports" style={{ color: homeTeamColors.primary }}>--</div>
                      <div className="text-sm text-primary-black-600 dark:text-gray-400 font-sports">{game.homeTeam.name} Wins</div>
                    </div>
                  </div>
                  
                  <div className="bg-primary-black-50 dark:bg-gray-700 p-4 rounded-md">
                    <h4 className="text-sm font-semibold mb-3 text-primary-black-700 dark:text-gray-300 font-sports">Recent Matchups</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-primary-black-600 dark:text-gray-400 font-sports">This Season</span>
                        <span className="font-medium text-primary-black-900 dark:text-white font-sports">
                          {game.awayTeam.name} -- - {game.homeTeam.name} --
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-primary-black-600 dark:text-gray-400 font-sports">Last Season</span>
                        <span className="font-medium text-primary-black-900 dark:text-white font-sports">
                          {game.awayTeam.name} -- - {game.homeTeam.name} --
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-primary-black-600 dark:text-gray-400 font-sports">Average Score</span>
                        <span className="font-medium text-primary-black-900 dark:text-white font-sports">
                          {game.awayTeam.name} -- - {game.homeTeam.name} --
                        </span>
                      </div>
                    </div>
                  </div>
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