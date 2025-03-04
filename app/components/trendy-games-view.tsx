'use client'

import { useEffect, useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import * as database from '@/lib/database'
import type { Database } from '@/types/supabase'
import { LoadingState } from './loading-state'
import Image from 'next/image'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table'
import { ChevronRightIcon, ChevronLeftIcon } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchGames } from '../lib/api'
import GameResearchView from './game-research-view'

type Fixture = Database['public']['Tables']['fixtures']['Row'] & {
  home_team: Database['public']['Tables']['teams']['Row']
  away_team: Database['public']['Tables']['teams']['Row']
  first_half_total_points?: number
  total_points?: number
}

const teamAbbreviations: { [key: string]: string } = {
  "Washington Wizards": "WAS",
  "Milwaukee Bucks": "MIL",
  "Cleveland Cavaliers": "CLE",
  "New York Knicks": "NYK",
  "Orlando Magic": "ORL",
  "Memphis Grizzlies": "MEM",
  "Toronto Raptors": "TOR",
  "Miami Heat": "MIA",
  "Dallas Mavericks": "DAL",
  "New Orleans Pelicans": "NOP",
  "San Antonio Spurs": "SAS",
  "Detroit Pistons": "DET",
  "Houston Rockets": "HOU",
  "Minnesota Timberwolves": "MIN",
  "Utah Jazz": "UTA",
  "Oklahoma City Thunder": "OKC",
  "Sacramento Kings": "SAC",
  "Golden State Warriors": "GSW",
  "Chicago Bulls": "CHI",
  "Phoenix Suns": "PHX",
  "Philadelphia 76ers": "PHI",
  "Brooklyn Nets": "BKN",
  "Denver Nuggets": "DEN",
  "Los Angeles Lakers": "LAL",
  "Portland Trail Blazers": "POR",
  "Charlotte Hornets": "CHA",
  "Boston Celtics": "BOS",
  "Indiana Pacers": "IND",
  "Los Angeles Clippers": "LAC",
  "Atlanta Hawks": "ATL"
}

// Get team abbreviation function
const getTeamAbbreviation = (teamName: string) => {
  return teamAbbreviations[teamName] || teamName.substring(0, 3).toUpperCase();
};

// Add back the timeframes constant at the top
const timeframes = [
  { id: 'game', label: 'Game' },
  { id: '1h', label: '1H' },
  { id: '2h', label: '2H' },
  { id: 'q1', label: 'Q1' },
  { id: 'q2', label: 'Q2' },
  { id: 'q3', label: 'Q3' },
  { id: 'q4', label: 'Q4' },
]

// First, let's add the sportsbook filters at the top
const sportsbooks = [
  { id: 'all', label: 'All' },
  { id: 'draftkings', label: 'DraftKings', logo: 'draftkings.jpg' },
  { id: 'betmgm', label: 'BetMGM', logo: 'betmgm.jpg' },
  { id: 'caesars', label: 'Caesars', logo: 'caesars.jpg' },
  { id: 'bet365', label: 'Bet365', logo: 'bet365.jpg' },
  { id: 'espn_bet', label: 'ESPN Bet', logo: 'espn_bet.jpg' }
]

// Add this helper function at the top level
function normalizeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  // Use UTC to prevent timezone issues
  const result = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Los_Angeles' // Use Pacific time for consistency with the UI
  })
  
  console.log(`Normalizing date: ${typeof date === 'string' ? date : date.toISOString()} -> ${result}`)
  return result
}

// Add this helper function at the top level
function groupFixturesByDate(fixtures: Fixture[]) {
  const groups = fixtures.reduce((acc, fixture) => {
    const date = new Date(fixture.start_date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(fixture)
    return acc
  }, {} as Record<string, Fixture[]>)

  return Object.entries(groups).sort(([dateA], [dateB]) => {
    return new Date(dateA).getTime() - new Date(dateB).getTime()
  })
}

// Add this interface for the modal state
interface TrendModalState {
  isOpen: boolean;
  playerName: string;
  statType: string;
  historicalData: any[];
}

// First update the Game interface to match the API response
interface Game {
  id: string
  start_date: string
  home_team: {
    id: string
    name: string
    logo: string
  }
  away_team: {
    id: string
    name: string
    logo: string
  }
  home_record: string | null
  away_record: string | null
  odds: {
    moneyline: Array<{
      sportsbook: string
      team_id: string
      price: number
      is_home: boolean
    }>
    spread: Array<{
      sportsbook: string
      team_id: string
      price: number
      points: number
      is_home: boolean
    }>
    total: Array<{
      sportsbook: string
      price: number
      points: number
      selection_line: string
    }>
  }
  total_points?: number
  first_half_total_points?: number
}

// Add team colors mapping
const teamColors: Record<string, { primary: string; secondary: string }> = {
  "Boston Celtics": { primary: "#007A33", secondary: "#BA9653" },
  "Brooklyn Nets": { primary: "#000000", secondary: "#FFFFFF" },
  "New York Knicks": { primary: "#006BB6", secondary: "#F58426" },
  "Philadelphia 76ers": { primary: "#006BB6", secondary: "#ED174C" },
  "Toronto Raptors": { primary: "#CE1141", secondary: "#000000" },
  "Chicago Bulls": { primary: "#CE1141", secondary: "#000000" },
  "Cleveland Cavaliers": { primary: "#860038", secondary: "#FDBB30" },
  "Detroit Pistons": { primary: "#C8102E", secondary: "#1D42BA" },
  "Indiana Pacers": { primary: "#002D62", secondary: "#FDBB30" },
  "Milwaukee Bucks": { primary: "#00471B", secondary: "#EEE1C6" },
  "Atlanta Hawks": { primary: "#E03A3E", secondary: "#C1D32F" },
  "Charlotte Hornets": { primary: "#1D1160", secondary: "#00788C" },
  "Miami Heat": { primary: "#98002E", secondary: "#F9A01B" },
  "Orlando Magic": { primary: "#0077C0", secondary: "#C4CED4" },
  "Washington Wizards": { primary: "#002B5C", secondary: "#E31837" },
  "Denver Nuggets": { primary: "#0E2240", secondary: "#FEC524" },
  "Minnesota Timberwolves": { primary: "#0C2340", secondary: "#236192" },
  "Oklahoma City Thunder": { primary: "#007AC1", secondary: "#EF3B24" },
  "Portland Trail Blazers": { primary: "#E03A3E", secondary: "#000000" },
  "Utah Jazz": { primary: "#002B5C", secondary: "#00471B" },
  "Golden State Warriors": { primary: "#1D428A", secondary: "#FFC72C" },
  "Los Angeles Clippers": { primary: "#C8102E", secondary: "#1D428A" },
  "Los Angeles Lakers": { primary: "#552583", secondary: "#FDB927" },
  "Phoenix Suns": { primary: "#1D1160", secondary: "#E56020" },
  "Sacramento Kings": { primary: "#5A2D81", secondary: "#63727A" },
  "Dallas Mavericks": { primary: "#00538C", secondary: "#002B5E" },
  "Houston Rockets": { primary: "#CE1141", secondary: "#000000" },
  "Memphis Grizzlies": { primary: "#5D76A9", secondary: "#12173F" },
  "New Orleans Pelicans": { primary: "#0C2340", secondary: "#C8102E" },
  "San Antonio Spurs": { primary: "#C4CED4", secondary: "#000000" }
};

// Add a function to get team colors
const getTeamColors = (teamName: string) => {
  return teamColors[teamName] || { primary: "#718096", secondary: "#CBD5E0" };
};

// Add a function to create CSS gradient
const createGradient = (teamName: string, opacity: number = 0.15) => {
  const colors = getTeamColors(teamName);
  return `linear-gradient(to right, ${colors.primary}${Math.round(opacity * 255).toString(16)} 0%, ${colors.secondary}${Math.round(opacity * 0.5 * 255).toString(16)} 70%, transparent 100%)`;
};

// Add interface for TableRow
interface TableRow {
  id: string
  startDate: string
  homeTeam: {
    id: string
    name: string
    logo?: string
    record?: string | null
    odds: {
      spread?: { points: number; price: number }
      moneyline?: { price: number }
    }
  }
  awayTeam: {
    id: string
    name: string
    logo?: string
    record?: string | null
    odds: {
      spread?: { points: number; price: number }
      moneyline?: { price: number }
    }
  }
  total: {
    over?: { points: number; price: number }
    under?: { points: number; price: number }
  }
}

interface ResearchModalState {
  isOpen: boolean
  gameId: string
  homeTeam: {
    id: string
    name: string
    logo: string
  }
  awayTeam: {
    id: string
    name: string
    logo: string
  }
  startDate: string
}

export default function TrendyGamesView() {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState('game')
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return normalizeDate(today)
  })
  const [trendModal, setTrendModal] = useState<TrendModalState>({
    isOpen: false,
    playerName: '',
    statType: '',
    historicalData: []
  })
  
  // Add research modal state
  const [researchModal, setResearchModal] = useState<ResearchModalState>({
    isOpen: false,
    gameId: '',
    homeTeam: {
      id: '',
      name: '',
      logo: ''
    },
    awayTeam: {
      id: '',
      name: '',
      logo: ''
    },
    startDate: ''
  })
  
  // State for line movement data (static, no longer updated via streaming)
  const [lineMovementData, setLineMovementData] = useState<Record<string, {
    spread: Array<{
      timestamp: number
      sportsbook: string
      homeTeamSpread: number
      homeTeamPrice: number
      awayTeamSpread: number
      awayTeamPrice: number
    }>
    total: Array<{
      timestamp: number
      sportsbook: string
      points: number
      overPrice: number
      underPrice: number
    }>
    moneyline: Array<{
      timestamp: number
      sportsbook: string
      homeTeamPrice: number
      awayTeamPrice: number
    }>
  }>>({})
  
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showRefreshNotification, setShowRefreshNotification] = useState(false)
  
  // Add effect to handle notification visibility
  useEffect(() => {
    if (lastUpdated) {
      setShowRefreshNotification(true);
      const timer = setTimeout(() => {
        setShowRefreshNotification(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [lastUpdated]);

  // Update the availableDates useMemo
  const availableDates = useMemo(() => {
    const dates = games.map(game => normalizeDate(game.start_date))
    return Array.from(new Set(dates)).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime()
    })
  }, [games])

  // Function to load games data that can be called multiple times
  const loadGamesData = async () => {
    try {
      setIsLoading(true)
      
      // Add cache-busting query parameter
      const timestamp = new Date().getTime()
      console.log('Fetching games data with timestamp:', timestamp)
      
      const data = await fetch('/api/games?t=' + timestamp, { 
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        cache: 'no-store' // Ensure we're not using cached data
      }).then(res => {
        if (!res.ok) {
          console.error('Failed to fetch games:', {
            status: res.status,
            statusText: res.statusText
          })
          throw new Error(`Failed to fetch games: ${res.status} ${res.statusText}`)
        }
        return res.json()
      })
      
      // Log detailed information about the fetched games
      console.log('Games data fetched:', {
        timestamp: new Date().toISOString(),
        count: data.length,
        isStatic: typeof window !== 'undefined' && window.location.hostname.includes('github.io'),
        games: data.map((game: any) => ({
          id: game.id,
          start_date: game.start_date,
          normalized_date: normalizeDate(game.start_date),
          home: game.home_team.name,
          away: game.away_team.name,
          hasOdds: {
            moneyline: (game.odds?.moneyline?.length || 0) > 0,
            spread: (game.odds?.spread?.length || 0) > 0,
            total: (game.odds?.total?.length || 0) > 0
          }
        }))
      })
      
      // Check if we have any games with odds
      const gamesWithOdds = data.filter((game: any) => 
        (game.odds?.moneyline?.length || 0) > 0 || 
        (game.odds?.spread?.length || 0) > 0 || 
        (game.odds?.total?.length || 0) > 0
      )
      
      console.log(`Found ${gamesWithOdds.length} games with odds out of ${data.length} total games`)
      
      if (gamesWithOdds.length === 0 && data.length > 0) {
        console.warn('No games have odds data! This might indicate an API issue.')
      }
      
      setGames(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error loading games:', err)
      setError(err instanceof Error ? err.message : 'Failed to load games')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial data load
  useEffect(() => {
    loadGamesData()
    
    // Set up auto-refresh every 5 minutes
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing games data...')
      loadGamesData()
    }, 5 * 60 * 1000)
    
    return () => {
      clearInterval(refreshInterval)
    }
  }, [])

  // Effect to update selected date when games change
  useEffect(() => {
    if (games.length > 0) {
      // Find today's date
      const today = normalizeDate(new Date())
      
      // Check if there are games today
      const todayGames = games.filter(game => normalizeDate(game.start_date) === today)
      
      if (todayGames.length > 0) {
        // If there are games today, select today
        setSelectedDate(today)
      } else {
        // Otherwise, select the earliest date with games
        const dates = games.map(game => new Date(game.start_date))
        const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())))
        setSelectedDate(normalizeDate(earliestDate))
      }
    }
  }, [games])

  // Update the dateGames filter with more logging
  const dateGames = useMemo(() => {
    // Get today's date normalized
    const today = normalizeDate(new Date())
    console.log(`Filtering games for date: ${selectedDate} (today is ${today})`)

    const filtered = games.filter(game => {
      const gameDate = normalizeDate(game.start_date)
      const matches = gameDate === selectedDate
      console.log(`Game ${game.id} date check: ${game.start_date} -> ${gameDate} === ${selectedDate} = ${matches}`)
      return matches
    })
    
    // Add filter for games that haven't started yet
    const now = new Date()
    const upcomingGames = filtered.filter(game => {
      const startDate = new Date(game.start_date)
      const isUpcoming = startDate > now
      
      if (!isUpcoming) {
        console.log(`Filtering out game that has already started: ${game.id} - ${game.home_team.name} vs ${game.away_team.name} (${game.start_date})`)
      }
      
      return isUpcoming
    })
    
    console.log(`Filtered ${games.length} games down to ${filtered.length} for date ${selectedDate}, with ${upcomingGames.length} upcoming games remaining`)
    return upcomingGames
  }, [games, selectedDate])

  // Add a function to manually refresh the data
  const handleRefresh = () => {
    console.log('Manual refresh triggered')
    loadGamesData()
  }

  // Debug log when games state updates
  useEffect(() => {
    console.log('Games state updated:', {
      totalGames: games.length,
      sampleGame: games[0],
      hasOdds: games[0]?.odds != null
    })
  }, [games])

  // Debug filtered fixtures
  useEffect(() => {
    if (dateGames.length > 0) {
      console.log('Filtered fixtures:', {
        count: dateGames.length,
        sampleFixture: {
          id: dateGames[0].id,
          odds: dateGames[0].odds
        }
      })
    }
  }, [dateGames])

  // Add loading state handling
  if (isLoading && games.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error && games.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        Error: {error}
      </div>
    )
  }

  console.log('Filtered games:', {
    totalGames: games.length,
    dateGames: dateGames.length,
    selectedDate
  })

  const currentDateIndex = availableDates.indexOf(selectedDate)

  // Navigation functions
  const goToNextDate = () => {
    if (currentDateIndex < availableDates.length - 1) {
      setSelectedDate(availableDates[currentDateIndex + 1])
    }
  }

  const goToPreviousDate = () => {
    if (currentDateIndex > 0) {
      setSelectedDate(availableDates[currentDateIndex - 1])
    }
  }

  // Add this function to prepare historical data
  const prepareHistoricalData = (playerName: string, statType: string) => {
    const playerGames = games.filter(fixture => 
      fixture.home_team.name === playerName || fixture.away_team.name === playerName
    );

    return playerGames
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(-10)
      .map(game => ({
        date: new Date(game.start_date).toLocaleDateString(),
        value: statType === '1st Half Total Points' ? 
          game.first_half_total_points ?? null : 
          game.total_points ?? null,
        opponent: game.home_team.name === playerName ? game.away_team.name : game.home_team.name
      }));
  };

  // Add click handler for rows
  const handleRowClick = (playerName: string, statType: string) => {
    const historicalData = prepareHistoricalData(playerName, statType);
    setTrendModal({
      isOpen: true,
      playerName,
      statType,
      historicalData
    });
  };

  // Add this component for the trends modal
  const TrendsModal = () => {
    if (!trendModal.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {trendModal.playerName} - {trendModal.statType} History
            </h2>
            <button 
              onClick={() => setTrendModal(prev => ({ ...prev, isOpen: false }))}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendModal.historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border rounded shadow">
                          <p>Date: {label}</p>
                          <p>Value: {payload[0].value}</p>
                          <p>Opponent: {payload[0].payload.opponent}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // Add a function to open the research modal
  const handleOpenResearch = (game: TableRow) => {
    setResearchModal({
      isOpen: true,
      gameId: game.id,
      homeTeam: {
        id: game.homeTeam.id,
        name: game.homeTeam.name,
        logo: `/team-logos/${getTeamAbbreviation(game.homeTeam.name).toLowerCase()}.png`
      },
      awayTeam: {
        id: game.awayTeam.id,
        name: game.awayTeam.name,
        logo: `/team-logos/${getTeamAbbreviation(game.awayTeam.name).toLowerCase()}.png`
      },
      startDate: game.startDate
    })
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Trendy Games</h1>
          <p className="text-gray-600 mt-1">Compare odds across major sportsbooks for upcoming games only</p>
          <p className="text-xs text-gray-500 mt-1">Note: Games that have already started are not shown</p>
        </div>
        
        {/* Add refresh button and last updated timestamp */}
        <div className="flex flex-col items-end">
          <div className="flex gap-2">
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isLoading 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh Odds</span>
                </>
              )}
            </button>
          </div>
          
          {lastUpdated && (
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500 mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
              
              {/* Updated notification with state-based visibility */}
              {showRefreshNotification && (
                <div className="fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg shadow-md z-50 animate-fade-in">
                  Data refreshed successfully!
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Timeframe selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="bg-white rounded-xl p-1 flex gap-0.5 shadow-sm">
          {timeframes.map((timeframe) => (
            <button
              key={timeframe.id}
              onClick={() => setSelectedTimeframe(timeframe.id)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                selectedTimeframe === timeframe.id 
                  ? "bg-blue-500 text-white shadow-sm" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              {timeframe.label}
            </button>
          ))}
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-3 bg-white rounded-xl p-1 shadow-sm">
          <button
            onClick={goToPreviousDate}
            disabled={currentDateIndex === 0}
            className={cn(
              "p-2 rounded-lg transition-colors",
              currentDateIndex === 0 
                ? "text-gray-300 cursor-not-allowed" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
            aria-label="Previous date"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          
          <div className="text-base font-medium text-gray-900 px-2">
            {selectedDate === availableDates[0] && normalizeDate(new Date()) === selectedDate 
              ? "Today's Games" 
              : selectedDate}
            <span className="text-sm text-gray-500 ml-2">
              ({dateGames.length} games)
            </span>
          </div>
          
          {/* Add "Today" button if we're not already on today */}
          {normalizeDate(new Date()) !== selectedDate && availableDates.includes(normalizeDate(new Date())) && (
            <button
              onClick={() => setSelectedDate(normalizeDate(new Date()))}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium"
            >
              Today
            </button>
          )}
          
          <button
            onClick={goToNextDate}
            disabled={currentDateIndex === availableDates.length - 1}
            className={cn(
              "p-2 rounded-lg transition-colors",
              currentDateIndex === availableDates.length - 1 
                ? "text-gray-300 cursor-not-allowed" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
            aria-label="Next date"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Games Table */}
      {isLoading && dateGames.length > 0 && (
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </div>
      )}
      
      <OddsTable 
        fixtures={dateGames} 
        selectedTimeframe={selectedTimeframe}
        onRowClick={handleRowClick}
        onResearchClick={handleOpenResearch}
      />

      {/* Add the modal component */}
      <TrendsModal />
      
      {/* Add the research modal */}
      <GameResearchView
        isOpen={researchModal.isOpen}
        onClose={() => setResearchModal({ ...researchModal, isOpen: false })}
        game={{
          id: researchModal.gameId,
          homeTeam: researchModal.homeTeam,
          awayTeam: researchModal.awayTeam,
          startDate: researchModal.startDate,
          odds: {}
        }}
        lineMovementData={lineMovementData}
      />
    </div>
  )
}

function OddsCard({ value, odds, sportsbook }: { value: string, odds: string, sportsbook?: string }) {
  return (
    <div className="bg-white rounded-lg p-4 flex flex-col 
      border border-gray-100 hover:border-gray-200 hover:bg-gray-50
      transition-all duration-200 group shadow-sm">
      <div className="flex items-center gap-2 mb-1.5">
        {sportsbook && (
          <Image
            src={`https://cdn.opticodds.com/sportsbook-logos/${sportsbook}.jpg`}
            alt={sportsbook}
            width={14}
            height={14}
            className="rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
          />
        )}
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider group-hover:text-gray-700">
          {sportsbook || '-'}
        </span>
      </div>
      <div>
        <div className="text-xl font-bold text-gray-900 tracking-tight group-hover:text-black">{value}</div>
        <div className="text-sm text-gray-500 font-medium mt-0.5">{odds}</div>
      </div>
    </div>
  )
}

function OddsTable({ 
  fixtures, 
  selectedTimeframe,
  onRowClick,
  onResearchClick
}: { 
  fixtures: Game[], 
  selectedTimeframe: string,
  onRowClick: (playerName: string, statType: string) => void,
  onResearchClick: (game: TableRow) => void
}) {
  // Add a constant for supported sportsbooks
  const SUPPORTED_SPORTSBOOKS = ['draftkings', 'betmgm', 'caesars', 'bet365', 'espn_bet'];

  // Update the formatTeamRecord function to use the actual records
  const formatTeamRecord = (teamName: string, record: string | null) => {
    // Use the record from the API if available, otherwise show a placeholder
    return record || 'N/A';
  };

  // Log the fixtures we're processing
  console.log('Processing fixtures for OddsTable:', {
    count: fixtures.length,
    fixtureIds: fixtures.map(f => f.id),
    fixturesWithOdds: fixtures.filter(f => 
      (f.odds?.moneyline && f.odds.moneyline.length > 0) || 
      (f.odds?.spread && f.odds.spread.length > 0) || 
      (f.odds?.total && f.odds.total.length > 0)
    ).length
  });

  const tableData = useMemo(() => 
    fixtures.map(fixture => {
      // Find best spread for each team across all sportsbooks
      const homeSpreadOdds = fixture.odds?.spread?.filter(odd => 
        odd.is_home && SUPPORTED_SPORTSBOOKS.includes(odd.sportsbook.toLowerCase())
      ) || []
      const awaySpreadOdds = fixture.odds?.spread?.filter(odd => 
        !odd.is_home && SUPPORTED_SPORTSBOOKS.includes(odd.sportsbook.toLowerCase())
      ) || []
      
      // Log available sportsbooks for debugging
      console.log('Available sportsbooks for game:', {
        gameId: fixture.id,
        homeTeam: fixture.home_team.name,
        awayTeam: fixture.away_team.name,
        spreads: fixture.odds?.spread?.map(o => o.sportsbook) || [],
        moneylines: fixture.odds?.moneyline?.map(o => o.sportsbook) || [],
        totals: fixture.odds?.total?.map(o => o.sportsbook) || []
      });
      
      // For spreads, we want:
      // 1. For favorites (negative points): The smallest negative number (closest to 0)
      // 2. For underdogs (positive points): The largest positive number
      // If points are equal, take the better price
      const bestHomeSpread = homeSpreadOdds.length > 0 ? homeSpreadOdds.reduce((best, current) => {
        if (!best) return current
        // If both are favorites (negative points)
        if (current.points < 0 && best.points < 0) {
          return current.points > best.points ? current : 
                 current.points === best.points ? (current.price > best.price ? current : best) : 
                 best
        }
        // If both are underdogs (positive points)
        if (current.points > 0 && best.points > 0) {
          return current.points > best.points ? current : 
                 current.points === best.points ? (current.price > best.price ? current : best) : 
                 best
        }
        // If mixed, prefer the better price
        return current.price > best.price ? current : best
      }, homeSpreadOdds[0]) : null;

      const bestAwaySpread = awaySpreadOdds.length > 0 ? awaySpreadOdds.reduce((best, current) => {
        if (!best) return current
        if (current.points < 0 && best.points < 0) {
          return current.points > best.points ? current : 
                 current.points === best.points ? (current.price > best.price ? current : best) : 
                 best
        }
        if (current.points > 0 && best.points > 0) {
          return current.points > best.points ? current : 
                 current.points === best.points ? (current.price > best.price ? current : best) : 
                 best
        }
        return current.price > best.price ? current : best
      }, awaySpreadOdds[0]) : null;

      // Find best moneyline for each team across all sportsbooks
      const homeMoneylineOdds = fixture.odds?.moneyline?.filter(odd => 
        odd.is_home && SUPPORTED_SPORTSBOOKS.includes(odd.sportsbook.toLowerCase())
      ) || []
      const awayMoneylineOdds = fixture.odds?.moneyline?.filter(odd => 
        !odd.is_home && SUPPORTED_SPORTSBOOKS.includes(odd.sportsbook.toLowerCase())
      ) || []

      // Find best moneyline by comparing prices
      const bestHomeMoneyline = homeMoneylineOdds.length > 0 ? homeMoneylineOdds.reduce((best, current) => 
        !best || current.price > best.price ? current : best, homeMoneylineOdds[0]) : null;
      const bestAwayMoneyline = awayMoneylineOdds.length > 0 ? awayMoneylineOdds.reduce((best, current) => 
        !best || current.price > best.price ? current : best, awayMoneylineOdds[0]) : null;

      // Find best totals across all sportsbooks
      const overOdds = fixture.odds?.total?.filter(odd => 
        odd.selection_line?.toLowerCase() === 'over' && 
        SUPPORTED_SPORTSBOOKS.includes(odd.sportsbook.toLowerCase())
      ) || []
      const underOdds = fixture.odds?.total?.filter(odd => 
        odd.selection_line?.toLowerCase() === 'under' && 
        SUPPORTED_SPORTSBOOKS.includes(odd.sportsbook.toLowerCase())
      ) || []

      // For totals, we want:
      // 1. For overs: The lowest points with the best price
      // 2. For unders: The highest points with the best price
      const bestOver = overOdds.length > 0 ? overOdds.reduce((best, current) => {
        if (!best) return current
        if (current.points === best.points) {
          return current.price > best.price ? current : best
        }
        return current.points < best.points ? current : best
      }, overOdds[0]) : null;

      const bestUnder = underOdds.length > 0 ? underOdds.reduce((best, current) => {
        if (!best) return current
        if (current.points === best.points) {
          return current.price > best.price ? current : best
        }
        return current.points > best.points ? current : best
      }, underOdds[0]) : null;

      // Add debug logging for odds selection
      console.log('Best odds found:', {
        gameId: fixture.id,
        homeTeam: fixture.home_team.name,
        awayTeam: fixture.away_team.name,
        bestHomeSpread: bestHomeSpread ? {
          points: bestHomeSpread.points,
          price: bestHomeSpread.price,
          sportsbook: bestHomeSpread.sportsbook
        } : null,
        bestAwaySpread: bestAwaySpread ? {
          points: bestAwaySpread.points,
          price: bestAwaySpread.price,
          sportsbook: bestAwaySpread.sportsbook
        } : null,
        bestHomeMoneyline: bestHomeMoneyline ? {
          price: bestHomeMoneyline.price,
          sportsbook: bestHomeMoneyline.sportsbook
        } : null,
        bestAwayMoneyline: bestAwayMoneyline ? {
          price: bestAwayMoneyline.price,
          sportsbook: bestAwayMoneyline.sportsbook
        } : null,
        bestOver: bestOver ? {
          points: bestOver.points,
          price: bestOver.price,
          sportsbook: bestOver.sportsbook
        } : null,
        bestUnder: bestUnder ? {
          points: bestUnder.points,
          price: bestUnder.price,
          sportsbook: bestUnder.sportsbook
        } : null,
        allSportsbooks: {
          spreads: homeSpreadOdds.concat(awaySpreadOdds).map(o => o.sportsbook),
          moneylines: homeMoneylineOdds.concat(awayMoneylineOdds).map(o => o.sportsbook),
          totals: overOdds.concat(underOdds).map(o => o.sportsbook)
        }
      })

      return {
        id: fixture.id,
        startDate: fixture.start_date,
        homeTeam: {
          id: fixture.home_team.id,
          name: fixture.home_team.name,
          logo: fixture.home_team.logo,
          record: fixture.home_record,
          odds: {
            moneyline: bestHomeMoneyline ? { 
              price: bestHomeMoneyline.price,
              sportsbook: bestHomeMoneyline.sportsbook
            } : undefined,
            spread: bestHomeSpread ? { 
              points: bestHomeSpread.points, 
              price: bestHomeSpread.price,
              sportsbook: bestHomeSpread.sportsbook
            } : undefined
          }
        },
        awayTeam: {
          id: fixture.away_team.id,
          name: fixture.away_team.name, 
          logo: fixture.away_team.logo,
          record: fixture.away_record,
          odds: {
            moneyline: bestAwayMoneyline ? {
              price: bestAwayMoneyline.price,
              sportsbook: bestAwayMoneyline.sportsbook
            } : undefined,
            spread: bestAwaySpread ? {
              points: bestAwaySpread.points,
              price: bestAwaySpread.price,
              sportsbook: bestAwaySpread.sportsbook
            } : undefined
          }
        },
        total: {
          over: bestOver ? {
            points: bestOver.points,
            price: bestOver.price,
            sportsbook: bestOver.sportsbook
          } : undefined,
          under: bestUnder ? {
            points: bestUnder.points,
            price: bestUnder.price,
            sportsbook: bestUnder.sportsbook
          } : undefined
        }
      }
    })
  , [fixtures, SUPPORTED_SPORTSBOOKS, selectedTimeframe]);

  if (fixtures.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No games available for selected date
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {tableData.map((game, index) => (
        <div key={game.id} className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200">
          {/* Game Header with column labels - now shown for every card */}
          <div className="px-6 py-3 border-b border-gray-200 flex">
            <div className="w-1/3 text-sm font-medium text-gray-700 uppercase tracking-wider">Match</div>
            <div className="w-1/5 text-sm font-medium text-gray-700 uppercase tracking-wider text-center">Spread</div>
            <div className="w-1/5 text-sm font-medium text-gray-700 uppercase tracking-wider text-center">Moneyline</div>
            <div className="w-1/5 text-sm font-medium text-gray-700 uppercase tracking-wider text-center">Total</div>
          </div>

          {/* Game Content */}
          <div className="px-6 py-4">
            {/* Away Team Row - Modified to extend gradient to full width */}
            <div className="flex items-center py-3 border-b border-gray-100 rounded-t-lg -mx-6 px-6" style={{ background: createGradient(game.awayTeam.name, 0.08) }}>
              <div className="w-1/3 flex items-center">
                <div className="relative w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
                  <Image
                    src={game.awayTeam.logo}
                    alt={game.awayTeam.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="ml-3">
                  <div className="font-bold text-lg text-gray-900">{getTeamAbbreviation(game.awayTeam.name)}</div>
                  <div className="text-xs text-gray-500">{formatTeamRecord(game.awayTeam.name, game.awayTeam.record)}</div>
                </div>
              </div>
              
              {/* Spread */}
              <div className="w-1/5 flex justify-center">
                {game.awayTeam.odds.spread && (
                  <div className="relative bg-white rounded-lg px-3 py-2 border border-gray-200 shadow-sm">
                    <div className="text-base font-medium text-gray-900">
                      {game.awayTeam.odds.spread.points > 0 ? '+' : ''}{game.awayTeam.odds.spread.points}
                    </div>
                    <div className="text-xs text-gray-500">
                      -{Math.abs(game.awayTeam.odds.spread.price)}
                    </div>
                    <div className="absolute top-0 right-0 w-4 h-4 transform translate-x-1 -translate-y-1">
                      <div className="relative w-4 h-4">
                        <Image
                          src={`https://cdn.opticodds.com/sportsbook-logos/${game.awayTeam.odds.spread.sportsbook}.jpg`}
                          alt={game.awayTeam.odds.spread.sportsbook}
                          fill
                          className="object-contain rounded-full border border-gray-200"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Moneyline */}
              <div className="w-1/5 flex justify-center">
                {game.awayTeam.odds.moneyline && (
                  <div className="relative bg-white rounded-lg px-3 py-2 border border-gray-200 shadow-sm">
                    <div className="text-base font-medium text-gray-900">
                      {game.awayTeam.odds.moneyline.price > 0 ? '+' : ''}{game.awayTeam.odds.moneyline.price}
                    </div>
                    <div className="absolute top-0 right-0 w-4 h-4 transform translate-x-1 -translate-y-1">
                      <div className="relative w-4 h-4">
                        <Image
                          src={`https://cdn.opticodds.com/sportsbook-logos/${game.awayTeam.odds.moneyline.sportsbook}.jpg`}
                          alt={game.awayTeam.odds.moneyline.sportsbook}
                          fill
                          className="object-contain rounded-full border border-gray-200"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Total */}
              <div className="w-1/5 flex justify-center">
                {game.total.over && (
                  <div className="relative bg-white rounded-lg px-3 py-2 border border-gray-200 shadow-sm">
                    <div className="text-base font-medium text-gray-900">
                      O{game.total.over.points}
                    </div>
                    <div className="text-xs text-gray-500">
                      -{Math.abs(game.total.over.price)}
                    </div>
                    <div className="absolute top-0 right-0 w-4 h-4 transform translate-x-1 -translate-y-1">
                      <div className="relative w-4 h-4">
                        <Image
                          src={`https://cdn.opticodds.com/sportsbook-logos/${game.total.over.sportsbook}.jpg`}
                          alt={game.total.over.sportsbook}
                          fill
                          className="object-contain rounded-full border border-gray-200"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Home Team Row - Modified to extend gradient to full width */}
            <div className="flex items-center py-3 rounded-b-lg -mx-6 px-6" style={{ background: createGradient(game.homeTeam.name, 0.08) }}>
              <div className="w-1/3 flex items-center">
                <div className="relative w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
                  <Image
                    src={game.homeTeam.logo}
                    alt={game.homeTeam.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="ml-3">
                  <div className="font-bold text-lg text-gray-900">{getTeamAbbreviation(game.homeTeam.name)}</div>
                  <div className="text-xs text-gray-500">{formatTeamRecord(game.homeTeam.name, game.homeTeam.record)}</div>
                </div>
              </div>
              
              {/* Spread */}
              <div className="w-1/5 flex justify-center">
                {game.homeTeam.odds.spread && (
                  <div className="relative bg-white rounded-lg px-3 py-2 border border-gray-200 shadow-sm">
                    <div className="text-base font-medium text-gray-900">
                      {game.homeTeam.odds.spread.points > 0 ? '+' : ''}{game.homeTeam.odds.spread.points}
                    </div>
                    <div className="text-xs text-gray-500">
                      -{Math.abs(game.homeTeam.odds.spread.price)}
                    </div>
                    <div className="absolute top-0 right-0 w-4 h-4 transform translate-x-1 -translate-y-1">
                      <div className="relative w-4 h-4">
                        <Image
                          src={`https://cdn.opticodds.com/sportsbook-logos/${game.homeTeam.odds.spread.sportsbook}.jpg`}
                          alt={game.homeTeam.odds.spread.sportsbook}
                          fill
                          className="object-contain rounded-full border border-gray-200"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Moneyline */}
              <div className="w-1/5 flex justify-center">
                {game.homeTeam.odds.moneyline && (
                  <div className="relative bg-white rounded-lg px-3 py-2 border border-gray-200 shadow-sm">
                    <div className="text-base font-medium text-gray-900">
                      {game.homeTeam.odds.moneyline.price > 0 ? '+' : ''}{game.homeTeam.odds.moneyline.price}
                    </div>
                    <div className="absolute top-0 right-0 w-4 h-4 transform translate-x-1 -translate-y-1">
                      <div className="relative w-4 h-4">
                        <Image
                          src={`https://cdn.opticodds.com/sportsbook-logos/${game.homeTeam.odds.moneyline.sportsbook}.jpg`}
                          alt={game.homeTeam.odds.moneyline.sportsbook}
                          fill
                          className="object-contain rounded-full border border-gray-200"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Total */}
              <div className="w-1/5 flex justify-center">
                {game.total.under && (
                  <div className="relative bg-white rounded-lg px-3 py-2 border border-gray-200 shadow-sm">
                    <div className="text-base font-medium text-gray-900">
                      U{game.total.under.points}
                    </div>
                    <div className="text-xs text-gray-500">
                      -{Math.abs(game.total.under.price)}
                    </div>
                    <div className="absolute top-0 right-0 w-4 h-4 transform translate-x-1 -translate-y-1">
                      <div className="relative w-4 h-4">
                        <Image
                          src={`https://cdn.opticodds.com/sportsbook-logos/${game.total.under.sportsbook}.jpg`}
                          alt={game.total.under.sportsbook}
                          fill
                          className="object-contain rounded-full border border-gray-200"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Game Time and Research Button */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path strokeLinecap="round" strokeWidth="2" d="M12 6v6l4 2" />
                </svg>
                <span className="text-sm text-gray-700 font-medium">
                  {new Date(game.startDate).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <button 
                onClick={() => onResearchClick(game)}
                className="text-blue-600 text-sm font-medium flex items-center hover:text-blue-800 transition-colors"
              >
                Research
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 