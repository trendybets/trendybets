import { PlayerData } from '../types'
import { serverEnv } from "@/lib/env"

export async function fetchPlayerOdds(fixtureLimit = 0): Promise<PlayerData[]> {
  try {
    // Fetch all fixtures by default (limit=0)
    console.log(`Fetching player odds with fixtureLimit=${fixtureLimit}`);
    const response = await fetch(`/api/odds?limit=${fixtureLimit}`, {
      cache: 'no-store' // Disable caching to ensure fresh data
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch player odds: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    const playerData = responseData.data || [];
    
    console.log(`API returned ${playerData.length} players with metadata:`, responseData.meta);
    
    return playerData;
  } catch (error) {
    console.error('Error fetching player odds:', error);
    throw error;
  }
}

// Types
interface Team {
  id: string
  name: string
  logo: string
}

interface Fixture {
  id: string
  start_date: string
  home_team_id: string
  away_team_id: string
  home_team_display: string
  away_team_display: string
}

interface GameOdds {
  fixture_id: string
  sportsbook: string
  market_id: string
  price: number
  points?: number
}

// Helper function to normalize team names for comparison
const normalizeTeamName = (name: string) => {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/\./g, '')  // Remove periods
    .replace(/-/g, '')   // Remove hyphens
    .replace(/^the/i, ''); // Remove leading "the"
};

// Fetch active fixtures
export async function fetchActiveFixtures() {
  const response = await fetch('/api/fixtures/active', {
    cache: 'no-store' // Disable caching to ensure fresh data
  })

  if (!response.ok) {
    throw new Error('Failed to fetch fixtures')
  }

  const data = await response.json()
  return data.data || []
}

// Fetch team data
export async function fetchTeams() {
  const response = await fetch('/api/teams', {
    cache: 'no-store' // Disable caching to ensure fresh data
  })

  if (!response.ok) {
    throw new Error('Failed to fetch teams')
  }

  const data = await response.json()
  return data.data || []
}

// Fetch game odds for a fixture (moneyline, point spread, total points)
export async function fetchFixtureOdds(fixtureId: string) {
  const response = await fetch(`/api/games/odds?fixture_id=${fixtureId}`, {
    cache: 'no-store' // Disable caching to ensure fresh data
  })

  if (!response.ok) {
    throw new Error('Failed to fetch odds')
  }

  const data = await response.json()
  return data.data || []
}

// Main function to get all game data
export async function fetchGames() {
  const response = await fetch('/api/games', {
    cache: 'no-store' // Disable caching to ensure fresh data
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch games')
  }

  const data = await response.json()
  return data
} 