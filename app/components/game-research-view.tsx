'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconInfoCircle, IconArrowsExchange, IconChartBar, IconUsers } from '@tabler/icons-react'
import { motion } from 'framer-motion'

// Add dummy data for team records
const dummyTeamRecords = {
  home: { wins: 35, losses: 20 },
  away: { wins: 28, losses: 27 }
}

// Add dummy data for recent form
const dummyRecentForm = {
  home: [
    { opponent: 'MIA', result: 'W', score: '112-108' },
    { opponent: 'NYK', result: 'L', score: '98-110' },
    { opponent: 'BOS', result: 'W', score: '121-115' },
    { opponent: 'DET', result: 'W', score: '109-97' },
    { opponent: 'ATL', result: 'L', score: '105-112' }
  ],
  away: [
    { opponent: 'BOS', result: 'L', score: '105-118' },
    { opponent: 'CLE', result: 'W', score: '115-109' },
    { opponent: 'PHI', result: 'L', score: '102-112' },
    { opponent: 'TOR', result: 'W', score: '124-110' },
    { opponent: 'CHI', result: 'W', score: '117-103' }
  ]
}

// Add dummy data for head-to-head history
const dummyHeadToHead = [
  { date: '2023-12-15', homeTeam: 'Team A', homeScore: 110, awayTeam: 'Team B', awayScore: 103 },
  { date: '2023-10-28', homeTeam: 'Team B', homeScore: 115, awayTeam: 'Team A', awayScore: 112 },
  { date: '2022-03-12', homeTeam: 'Team A', homeScore: 98, awayTeam: 'Team B', awayScore: 105 },
  { date: '2022-01-05', homeTeam: 'Team B', homeScore: 120, awayTeam: 'Team A', awayScore: 108 }
]

// Add dummy data for odds
const dummyOdds = {
  moneyline: [
    { sportsbook: 'DraftKings', homeOdds: -150, awayOdds: +130 },
    { sportsbook: 'FanDuel', homeOdds: -145, awayOdds: +125 },
    { sportsbook: 'BetMGM', homeOdds: -155, awayOdds: +135 },
    { sportsbook: 'Caesars', homeOdds: -148, awayOdds: +128 },
    { sportsbook: 'PointsBet', homeOdds: -152, awayOdds: +132 }
  ],
  spread: [
    { sportsbook: 'DraftKings', homeSpread: -3.5, homeOdds: -110, awaySpread: +3.5, awayOdds: -110 },
    { sportsbook: 'FanDuel', homeSpread: -3.5, homeOdds: -108, awaySpread: +3.5, awayOdds: -112 },
    { sportsbook: 'BetMGM', homeSpread: -3, homeOdds: -115, awaySpread: +3, awayOdds: -105 },
    { sportsbook: 'Caesars', homeSpread: -3.5, homeOdds: -110, awaySpread: +3.5, awayOdds: -110 },
    { sportsbook: 'PointsBet', homeSpread: -3.5, homeOdds: -107, awaySpread: +3.5, awayOdds: -113 }
  ],
  total: [
    { sportsbook: 'DraftKings', points: 224.5, overOdds: -110, underOdds: -110 },
    { sportsbook: 'FanDuel', points: 224.5, overOdds: -112, underOdds: -108 },
    { sportsbook: 'BetMGM', points: 225, overOdds: -110, underOdds: -110 },
    { sportsbook: 'Caesars', points: 224.5, overOdds: -110, underOdds: -110 },
    { sportsbook: 'PointsBet', points: 224, overOdds: -110, underOdds: -110 }
  ]
};

// Add dummy data for line movements
const dummyLineMovements = {
  spread: [
    { date: '2023-03-04T08:00:00Z', value: -2.5 },
    { date: '2023-03-04T12:00:00Z', value: -3 },
    { date: '2023-03-04T16:00:00Z', value: -3.5 },
    { date: '2023-03-04T20:00:00Z', value: -3 },
    { date: '2023-03-05T00:00:00Z', value: -3.5 }
  ],
  total: [
    { date: '2023-03-04T08:00:00Z', value: 223 },
    { date: '2023-03-04T12:00:00Z', value: 223.5 },
    { date: '2023-03-04T16:00:00Z', value: 224 },
    { date: '2023-03-04T20:00:00Z', value: 224.5 },
    { date: '2023-03-05T00:00:00Z', value: 224.5 }
  ]
};

// Add dummy player stats data
const dummyPlayerStats = {
  home: [
    { 
      name: 'John Davis', 
      position: 'PG', 
      ppg: 22.5, 
      rpg: 4.2, 
      apg: 6.8, 
      spg: 1.4,
      bpg: 0.3,
      mpg: 34.5,
      fg_pct: 0.458,
      three_pct: 0.382,
      ft_pct: 0.878
    },
    { 
      name: 'Mike Johnson', 
      position: 'SG', 
      ppg: 18.2, 
      rpg: 3.1, 
      apg: 2.5, 
      spg: 1.2,
      bpg: 0.5,
      mpg: 31.2,
      fg_pct: 0.462,
      three_pct: 0.412,
      ft_pct: 0.842
    },
    { 
      name: 'David Thompson', 
      position: 'SF', 
      ppg: 16.8, 
      rpg: 5.9, 
      apg: 1.4, 
      spg: 0.8,
      bpg: 0.4,
      mpg: 32.5,
      fg_pct: 0.475,
      three_pct: 0.365,
      ft_pct: 0.788
    },
    { 
      name: 'Kevin Anderson', 
      position: 'PF', 
      ppg: 14.2, 
      rpg: 7.8, 
      apg: 1.2, 
      spg: 0.7,
      bpg: 1.2,
      mpg: 30.8,
      fg_pct: 0.524,
      three_pct: 0.315,
      ft_pct: 0.724
    },
    { 
      name: 'Robert Smith', 
      position: 'C', 
      ppg: 12.6, 
      rpg: 10.4, 
      apg: 0.9, 
      spg: 0.5,
      bpg: 1.8,
      mpg: 29.4,
      fg_pct: 0.585,
      three_pct: 0.0,
      ft_pct: 0.645
    }
  ],
  away: [
    { 
      name: 'James Wilson', 
      position: 'PG', 
      ppg: 20.8, 
      rpg: 3.4, 
      apg: 7.2, 
      spg: 1.6,
      bpg: 0.2,
      mpg: 33.8,
      fg_pct: 0.448,
      three_pct: 0.392,
      ft_pct: 0.895
    },
    { 
      name: 'Stephen Brown', 
      position: 'SG', 
      ppg: 16.5, 
      rpg: 2.8, 
      apg: 3.4, 
      spg: 1.4,
      bpg: 0.3,
      mpg: 30.5,
      fg_pct: 0.458,
      three_pct: 0.425,
      ft_pct: 0.868
    },
    { 
      name: 'Chris Williams', 
      position: 'SF', 
      ppg: 15.2, 
      rpg: 6.2, 
      apg: 2.1, 
      spg: 0.9,
      bpg: 0.6,
      mpg: 31.8,
      fg_pct: 0.468,
      three_pct: 0.354,
      ft_pct: 0.762
    },
    { 
      name: 'Eric Taylor', 
      position: 'PF', 
      ppg: 13.8, 
      rpg: 8.2, 
      apg: 1.5, 
      spg: 0.6,
      bpg: 1.4,
      mpg: 29.5,
      fg_pct: 0.512,
      three_pct: 0.288,
      ft_pct: 0.715
    },
    { 
      name: 'Andrew Jones', 
      position: 'C', 
      ppg: 11.4, 
      rpg: 9.8, 
      apg: 0.7, 
      spg: 0.4,
      bpg: 1.7,
      mpg: 27.8,
      fg_pct: 0.575,
      three_pct: 0.0,
      ft_pct: 0.625
    }
  ]
};

// Add dummy player prop odds
const dummyPlayerProps = {
  points: [
    { player: 'John Davis', team: 'home', line: 22.5, overOdds: -110, underOdds: -110, sportsbook: 'DraftKings' },
    { player: 'James Wilson', team: 'away', line: 20.5, overOdds: -115, underOdds: -105, sportsbook: 'DraftKings' },
    { player: 'Mike Johnson', team: 'home', line: 17.5, overOdds: -105, underOdds: -115, sportsbook: 'FanDuel' },
    { player: 'Stephen Brown', team: 'away', line: 16.5, overOdds: -110, underOdds: -110, sportsbook: 'DraftKings' },
    { player: 'David Thompson', team: 'home', line: 16.5, overOdds: -110, underOdds: -110, sportsbook: 'BetMGM' }
  ],
  rebounds: [
    { player: 'Robert Smith', team: 'home', line: 10.5, overOdds: -105, underOdds: -115, sportsbook: 'DraftKings' },
    { player: 'Andrew Jones', team: 'away', line: 9.5, overOdds: -110, underOdds: -110, sportsbook: 'FanDuel' },
    { player: 'Kevin Anderson', team: 'home', line: 7.5, overOdds: -120, underOdds: +100, sportsbook: 'Caesars' },
    { player: 'Eric Taylor', team: 'away', line: 8.5, overOdds: +100, underOdds: -120, sportsbook: 'BetMGM' },
    { player: 'Chris Williams', team: 'away', line: 6.5, overOdds: -110, underOdds: -110, sportsbook: 'DraftKings' }
  ],
  assists: [
    { player: 'James Wilson', team: 'away', line: 7.5, overOdds: -105, underOdds: -115, sportsbook: 'DraftKings' },
    { player: 'John Davis', team: 'home', line: 6.5, overOdds: -115, underOdds: -105, sportsbook: 'BetMGM' },
    { player: 'Stephen Brown', team: 'away', line: 3.5, overOdds: -110, underOdds: -110, sportsbook: 'FanDuel' },
    { player: 'Mike Johnson', team: 'home', line: 2.5, overOdds: -130, underOdds: +110, sportsbook: 'Caesars' }
  ],
  threes: [
    { player: 'Stephen Brown', team: 'away', line: 2.5, overOdds: -135, underOdds: +115, sportsbook: 'DraftKings' },
    { player: 'Mike Johnson', team: 'home', line: 2.5, overOdds: -125, underOdds: +105, sportsbook: 'FanDuel' },
    { player: 'John Davis', team: 'home', line: 1.5, overOdds: -145, underOdds: +125, sportsbook: 'BetMGM' },
    { player: 'James Wilson', team: 'away', line: 1.5, overOdds: -155, underOdds: +135, sportsbook: 'Caesars' }
  ],
  combinations: [
    { player: 'John Davis', team: 'home', type: 'Pts+Reb+Ast', line: 33.5, overOdds: -110, underOdds: -110, sportsbook: 'DraftKings' },
    { player: 'James Wilson', team: 'away', type: 'Pts+Reb+Ast', line: 31.5, overOdds: -115, underOdds: -105, sportsbook: 'FanDuel' },
    { player: 'Robert Smith', team: 'home', type: 'Pts+Reb', line: 22.5, overOdds: -105, underOdds: -115, sportsbook: 'BetMGM' },
    { player: 'Andrew Jones', team: 'away', type: 'Pts+Reb', line: 21.5, overOdds: -110, underOdds: -110, sportsbook: 'Caesars' }
  ]
};

interface GameResearchProps {
  isOpen: boolean
  onClose: () => void
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

export default function GameResearchView({
  isOpen,
  onClose,
  gameId,
  homeTeam,
  awayTeam,
  startDate
}: GameResearchProps) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!isOpen) return null

  // Format date for display
  const formattedDate = new Date(startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })

  return (
    <motion.div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {/* Header with close button */}
        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Game Research</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Matchup header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 px-6 py-5">
          <div className="flex items-center justify-center">
            <div className="flex items-center justify-end w-2/5">
              <div className="text-right mr-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{awayTeam.name}</h3>
                <div className="flex items-center justify-end mt-1">
                  <span className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-medium px-2 py-0.5 rounded">
                    {dummyTeamRecords.away.wins}-{dummyTeamRecords.away.losses}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">Away</span>
                </div>
              </div>
              <div className="w-20 h-20 relative">
                <Image
                  src={awayTeam.logo || '/team-logos/default.png'}
                  alt={awayTeam.name}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            
            <div className="text-center mx-6 px-8">
              <div className="text-xl font-bold text-gray-900 dark:text-white">VS</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 whitespace-nowrap">{formattedDate}</div>
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Live Odds
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-start w-2/5">
              <div className="w-20 h-20 relative">
                <Image
                  src={homeTeam.logo || '/team-logos/default.png'}
                  alt={homeTeam.name}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="text-left ml-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{homeTeam.name}</h3>
                <div className="flex items-center mt-1">
                  <span className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-medium px-2 py-0.5 rounded">
                    {dummyTeamRecords.home.wins}-{dummyTeamRecords.home.losses}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">Home</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content with scrollable area */}
        <div className="flex-1 overflow-auto">
          {/* Tabs */}
          <div className="px-6 pt-4 bg-white dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 h-12">
                <TabsTrigger value="overview" className="flex items-center space-x-2 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20">
                  <IconInfoCircle className="h-4 w-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger value="odds" className="flex items-center space-x-2 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20">
                  <IconArrowsExchange className="h-4 w-4" />
                  <span>Game Odds</span>
                </TabsTrigger>
                <TabsTrigger value="props" className="flex items-center space-x-2 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20">
                  <IconUsers className="h-4 w-4" />
                  <span>Player Props</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center space-x-2 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20">
                  <IconChartBar className="h-4 w-4" />
                  <span>Team Statistics</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-950/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                      <IconInfoCircle className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
                      Game Information
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">Date & Time</p>
                          <p className="font-medium text-gray-900 dark:text-white">{formattedDate}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">Location</p>
                          <p className="font-medium text-gray-900 dark:text-white">{homeTeam.name} Arena</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">Game ID</p>
                          <p className="font-medium text-gray-900 dark:text-white">{gameId}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">Season</p>
                          <p className="font-medium text-gray-900 dark:text-white">2023-24 Regular Season</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">TV Broadcast</p>
                          <p className="font-medium text-gray-900 dark:text-white">ESPN, NBA TV</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">Referees</p>
                          <p className="font-medium text-gray-900 dark:text-white">TBD</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="bg-blue-50 dark:bg-blue-950/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Form</h3>
                    </div>
                    <div className="p-6 space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
                            <div className="w-6 h-6 relative mr-2">
                              <Image
                                src={homeTeam.logo || '/team-logos/default.png'}
                                alt={homeTeam.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                            {homeTeam.name} <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">(Last 5 games)</span>
                          </h4>
                          <div className="text-sm font-medium">
                            <span className="text-green-600 dark:text-green-400">{dummyRecentForm.home.filter(game => game.result === 'W').length}W</span>
                            <span className="mx-1">/</span>
                            <span className="text-red-600 dark:text-red-400">{dummyRecentForm.home.filter(game => game.result === 'L').length}L</span>
                          </div>
                        </div>
                        <div className="overflow-x-auto -mx-6 px-6">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Opponent</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Result</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-800">
                              {dummyRecentForm.home.map((game, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                  <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">vs {game.opponent}</td>
                                  <td className={`px-3 py-2.5 whitespace-nowrap text-sm font-medium ${game.result === 'W' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {game.result}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{game.score}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
                            <div className="w-6 h-6 relative mr-2">
                              <Image
                                src={awayTeam.logo || '/team-logos/default.png'}
                                alt={awayTeam.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                            {awayTeam.name} <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">(Last 5 games)</span>
                          </h4>
                          <div className="text-sm font-medium">
                            <span className="text-green-600 dark:text-green-400">{dummyRecentForm.away.filter(game => game.result === 'W').length}W</span>
                            <span className="mx-1">/</span>
                            <span className="text-red-600 dark:text-red-400">{dummyRecentForm.away.filter(game => game.result === 'L').length}L</span>
                          </div>
                        </div>
                        <div className="overflow-x-auto -mx-6 px-6">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Opponent</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Result</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-800">
                              {dummyRecentForm.away.map((game, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                  <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">@ {game.opponent}</td>
                                  <td className={`px-3 py-2.5 whitespace-nowrap text-sm font-medium ${game.result === 'W' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {game.result}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{game.score}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="bg-blue-50 dark:bg-blue-950/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Head-to-Head History</h3>
                    </div>
                    <div className="p-6">
                      <div className="overflow-x-auto -mx-6 px-6">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Winner</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-800">
                            {dummyHeadToHead.map((game, index) => {
                              // Temporarily replace with actual team names
                              const homeTeamName = game.homeTeam === 'Team A' ? homeTeam.name : awayTeam.name;
                              const awayTeamName = game.awayTeam === 'Team A' ? homeTeam.name : awayTeam.name;
                              const winner = game.homeScore > game.awayScore ? homeTeamName : awayTeamName;
                              const isHomeWinner = game.homeScore > game.awayScore;
                              
                              return (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                  <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                    {new Date(game.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                    <span className={isHomeWinner ? 'font-medium' : ''}>{homeTeamName} {game.homeScore}</span>
                                    <span className="mx-1 text-gray-400">-</span>
                                    <span className={!isHomeWinner ? 'font-medium' : ''}>{game.awayScore} {awayTeamName}</span>
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-300">
                                    {winner}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50">
                        <div className="flex items-center mb-2">
                          <div className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                          <h4 className="font-semibold text-blue-800 dark:text-blue-300">Series Summary</h4>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-400 pl-7">
                          {homeTeam.name} leads the series 3-1 over the last 4 matchups
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-950/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Key Injuries</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white flex items-center mb-4">
                          <div className="w-6 h-6 relative mr-2">
                            <Image
                              src={homeTeam.logo || '/team-logos/default.png'}
                              alt={homeTeam.name}
                              fill
                              className="object-contain"
                            />
                          </div>
                          {homeTeam.name}
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/50">
                            <span className="h-3 w-3 bg-red-500 dark:bg-red-600 rounded-full mr-3 flex-shrink-0"></span>
                            <div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">John Smith</span>
                              <div className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">Out (Ankle)</div>
                            </div>
                          </div>
                          <div className="flex items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-900/50">
                            <span className="h-3 w-3 bg-yellow-500 dark:bg-yellow-600 rounded-full mr-3 flex-shrink-0"></span>
                            <div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">Mike Johnson</span>
                              <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-0.5">Questionable (Illness)</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white flex items-center mb-4">
                          <div className="w-6 h-6 relative mr-2">
                            <Image
                              src={awayTeam.logo || '/team-logos/default.png'}
                              alt={awayTeam.name}
                              fill
                              className="object-contain"
                            />
                          </div>
                          {awayTeam.name}
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-900/50">
                            <span className="h-3 w-3 bg-yellow-500 dark:bg-yellow-600 rounded-full mr-3 flex-shrink-0"></span>
                            <div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">James Williams</span>
                              <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-0.5">Day-to-Day (Knee)</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Game Odds Tab */}
            {activeTab === 'odds' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl shadow-sm border border-blue-100 dark:border-blue-900/50 p-5">
                  <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-4 flex items-center">
                    <IconArrowsExchange className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
                    Best Available Odds
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                      <div className="text-xs uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-2">Moneyline</div>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <div className="w-5 h-5 relative mr-1.5">
                              <Image
                                src={homeTeam.logo || '/team-logos/default.png'}
                                alt={homeTeam.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{homeTeam.name}</div>
                          </div>
                          <div className="text-xl font-bold text-green-600 dark:text-green-400 mt-1.5">-145</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">FanDuel</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{awayTeam.name}</div>
                            <div className="w-5 h-5 relative ml-1.5">
                              <Image
                                src={awayTeam.logo || '/team-logos/default.png'}
                                alt={awayTeam.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                          </div>
                          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1.5">+135</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">BetMGM</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                      <div className="text-xs uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-2">Spread</div>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <div className="w-5 h-5 relative mr-1.5">
                              <Image
                                src={homeTeam.logo || '/team-logos/default.png'}
                                alt={homeTeam.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{homeTeam.name}</div>
                          </div>
                          <div className="text-xl font-bold text-gray-900 dark:text-gray-200 mt-1.5">-3 <span className="text-lg font-medium text-gray-600 dark:text-gray-400">(-115)</span></div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">BetMGM</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{awayTeam.name}</div>
                            <div className="w-5 h-5 relative ml-1.5">
                              <Image
                                src={awayTeam.logo || '/team-logos/default.png'}
                                alt={awayTeam.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                          </div>
                          <div className="text-xl font-bold text-gray-900 dark:text-gray-200 mt-1.5">+3.5 <span className="text-lg font-medium text-gray-600 dark:text-gray-400">(-107)</span></div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">PointsBet</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                      <div className="text-xs uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-2">Total</div>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-200">Over</div>
                          <div className="text-xl font-bold text-gray-900 dark:text-gray-200 mt-1.5">224 <span className="text-lg font-medium text-gray-600 dark:text-gray-400">(-108)</span></div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">FanDuel</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-200">Under</div>
                          <div className="text-xl font-bold text-gray-900 dark:text-gray-200 mt-1.5">225 <span className="text-lg font-medium text-gray-600 dark:text-gray-400">(-110)</span></div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">BetMGM</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-950/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Moneyline Odds</h3>
                    <div className="text-sm flex items-center text-green-600 dark:text-green-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Updated 15 minutes ago
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="overflow-x-auto -mx-6 px-6">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sportsbook</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{homeTeam.name}</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{awayTeam.name}</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Home Edge</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-800">
                          {dummyOdds.moneyline.map((odds, index) => {
                            // Calculate the implied probability and edge
                            const homeImplied = odds.homeOdds > 0 
                              ? 100 / (odds.homeOdds + 100) 
                              : Math.abs(odds.homeOdds) / (Math.abs(odds.homeOdds) + 100);
                            const awayImplied = odds.awayOdds > 0 
                              ? 100 / (odds.awayOdds + 100) 
                              : Math.abs(odds.awayOdds) / (Math.abs(odds.awayOdds) + 100);
                            const edge = 1 - (homeImplied + awayImplied);
                            
                            return (
                              <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-900/30 ${index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50 dark:bg-gray-900/20'}`}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-5 h-5 relative mr-2 bg-gray-100 dark:bg-gray-800 rounded-sm flex-shrink-0">
                                      {/* Placeholder for sportsbook logo */}
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{odds.sportsbook}</div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-gray-200">
                                  {odds.homeOdds > 0 ? '+' : ''}{odds.homeOdds}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-gray-200">
                                  {odds.awayOdds > 0 ? '+' : ''}{odds.awayOdds}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${edge > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                    {(edge * 100).toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Spread Odds</h3>
                    <div className="text-sm text-gray-500">Updated 15 minutes ago</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sportsbook</th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{homeTeam.name}</th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{awayTeam.name}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dummyOdds.spread.map((odds, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{odds.sportsbook}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                              {odds.homeSpread > 0 ? '+' : ''}{odds.homeSpread} ({odds.homeOdds > 0 ? '+' : ''}{odds.homeOdds})
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                              {odds.awaySpread > 0 ? '+' : ''}{odds.awaySpread} ({odds.awayOdds > 0 ? '+' : ''}{odds.awayOdds})
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Total (Over/Under)</h3>
                    <div className="text-sm text-gray-500">Updated 15 minutes ago</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sportsbook</th>
                          <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Over</th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Under</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dummyOdds.total.map((odds, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{odds.sportsbook}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium">
                              {odds.points}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                              {odds.overOdds > 0 ? '+' : ''}{odds.overOdds}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                              {odds.underOdds > 0 ? '+' : ''}{odds.underOdds}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-bold mb-4">Line Movement</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Spread ({homeTeam.name})</h4>
                      <div className="h-60 bg-white p-4 rounded-lg">
                        <div className="text-center text-gray-500">
                          Line movement chart would appear here
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 text-center">
                        Opening: -2.5 • Current: -3.5 • Change: -1
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Total</h4>
                      <div className="h-60 bg-white p-4 rounded-lg">
                        <div className="text-center text-gray-500">
                          Line movement chart would appear here
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 text-center">
                        Opening: 223 • Current: 224.5 • Change: +1.5
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-950/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Betting Insights</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-6">
                        <h4 className="font-medium text-gray-900 dark:text-white">Public Betting Percentages</h4>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Spread</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{homeTeam.name} -3.5</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                            <div className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" style={{ width: '65%' }}></div>
                          </div>
                          <div className="flex justify-between mt-1 text-xs">
                            <span className="text-gray-700 dark:text-gray-300">{homeTeam.name} <span className="font-medium">65%</span></span>
                            <span className="text-gray-700 dark:text-gray-300">{awayTeam.name} <span className="font-medium">35%</span></span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Moneyline</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400"></span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                            <div className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" style={{ width: '70%' }}></div>
                          </div>
                          <div className="flex justify-between mt-1 text-xs">
                            <span className="text-gray-700 dark:text-gray-300">{homeTeam.name} <span className="font-medium">70%</span></span>
                            <span className="text-gray-700 dark:text-gray-300">{awayTeam.name} <span className="font-medium">30%</span></span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Total</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">224.5</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                            <div className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" style={{ width: '55%' }}></div>
                          </div>
                          <div className="flex justify-between mt-1 text-xs">
                            <span className="text-gray-700 dark:text-gray-300">Over <span className="font-medium">55%</span></span>
                            <span className="text-gray-700 dark:text-gray-300">Under <span className="font-medium">45%</span></span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Betting Trends</h4>
                        <ul className="space-y-3 text-sm">
                          <li className="flex items-start">
                            <span className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5 mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            <span className="text-gray-900 dark:text-gray-200">{homeTeam.name} are 7-3 ATS in their last 10 games</span>
                          </li>
                          <li className="flex items-start">
                            <span className="h-5 w-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5 mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </span>
                            <span className="text-gray-900 dark:text-gray-200">{awayTeam.name} are 4-6 ATS in their last 10 games</span>
                          </li>
                          <li className="flex items-start">
                            <span className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5 mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            <span className="text-gray-900 dark:text-gray-200">The OVER is 6-4 in {homeTeam.name}'s last 10 games</span>
                          </li>
                          <li className="flex items-start">
                            <span className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5 mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            <span className="text-gray-900 dark:text-gray-200">The OVER is 7-3 in {awayTeam.name}'s last 10 games</span>
                          </li>
                          <li className="flex items-start">
                            <span className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                            <span className="text-gray-900 dark:text-gray-200">{homeTeam.name} are 8-2 SU as favorites this season</span>
                          </li>
                          <li className="flex items-start">
                            <span className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                            <span className="text-gray-900 dark:text-gray-200">{awayTeam.name} are 5-7 SU as underdogs this season</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Player Props Tab */}
            {activeTab === 'props' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Player selector tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-.352-.035-.696-.1-1.028A5.001 5.001 0 0010 11z" clipRule="evenodd" />
                      </svg>
                      Player Performance
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-7">
                      View player stats and available prop bets
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
                    <button
                      className="text-blue-600 py-3 px-4 bg-white dark:bg-gray-800 border-b-2 border-blue-500 font-medium text-sm"
                    >
                      Points
                    </button>
                    <button
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-3 px-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm"
                    >
                      Rebounds
                    </button>
                    <button
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-3 px-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm"
                    >
                      Assists
                    </button>
                    <button
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-3 px-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm"
                    >
                      Three Pointers
                    </button>
                    <button
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-3 px-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm"
                    >
                      Combinations
                    </button>
                  </div>
                  
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/30">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Player</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Season Avg</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last 5</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Line</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Over</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Under</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Best At</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {dummyPlayerProps.points.map((prop, index) => {
                            // Find the player stats
                            const playerTeam = prop.team === 'home' ? dummyPlayerStats.home : dummyPlayerStats.away;
                            const playerStat = playerTeam.find(player => player.name === prop.player);
                            
                            return (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}>
                                <td className="px-3 py-3 whitespace-nowrap">
                                  <div className="font-medium text-gray-900">{prop.player}</div>
                                  <div className="text-xs text-gray-500">{playerStat?.position}</div>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{prop.team === 'home' ? homeTeam.name : awayTeam.name}</div>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm font-medium text-gray-900">{playerStat?.ppg?.toFixed(1) || '0.0'}</div>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm font-medium text-gray-900">
                                    {playerStat?.ppg 
                                      ? (playerStat.ppg * (Math.random() * 0.2 + 0.9)).toFixed(1) 
                                      : '0.0'}
                                  </div>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm font-medium text-gray-900">{prop.line}</div>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-right">
                                  <div className="text-sm font-medium text-gray-900">{prop.overOdds > 0 ? `+${prop.overOdds}` : prop.overOdds}</div>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-right">
                                  <div className="text-sm font-medium text-gray-900">{prop.underOdds > 0 ? `+${prop.underOdds}` : prop.underOdds}</div>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-right">
                                  <div className="text-xs text-gray-500">{prop.sportsbook}</div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="bg-blue-50 dark:bg-blue-950/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
                      <img src={homeTeam.logo} alt={homeTeam.name} className="h-6 w-6 mr-2" />
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{homeTeam.name} Player Stats</h3>
                    </div>
                    <div className="p-4 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/30">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Player</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pos</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PPG</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">RPG</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">APG</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">FG%</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">3PT%</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {dummyPlayerStats.home.map((playerStat, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="font-medium text-gray-900 dark:text-white">{playerStat.name}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-500 dark:text-gray-400">{playerStat.position}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{playerStat.ppg?.toFixed(1) || '-'}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{playerStat.rpg}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{playerStat.apg}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{playerStat.fg_pct ? (playerStat.fg_pct * 100).toFixed(1) : '-'}%</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{playerStat.three_pct ? (playerStat.three_pct * 100).toFixed(1) : '-'}%</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="bg-blue-50 dark:bg-blue-950/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
                      <img src={awayTeam.logo} alt={awayTeam.name} className="h-6 w-6 mr-2" />
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{awayTeam.name} Player Stats</h3>
                    </div>
                    <div className="p-4 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/30">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Player</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pos</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PPG</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">RPG</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">APG</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">FG%</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">3PT%</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {dummyPlayerStats.away.map((playerStat, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="font-medium text-gray-900 dark:text-white">{playerStat.name}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-500 dark:text-gray-400">{playerStat.position}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{playerStat.ppg?.toFixed(1) || '-'}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{playerStat.rpg}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{playerStat.apg}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{playerStat.fg_pct ? (playerStat.fg_pct * 100).toFixed(1) : '-'}%</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{playerStat.three_pct ? (playerStat.three_pct * 100).toFixed(1) : '-'}%</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Team Statistics Tab */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <p className="text-gray-500">Detailed team statistics and comparisons will appear here</p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-bold mb-4">{awayTeam.name}</h3>
                    <p className="text-gray-500">Team statistics will appear here</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-bold mb-4">{homeTeam.name}</h3>
                    <p className="text-gray-500">Team statistics will appear here</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
} 