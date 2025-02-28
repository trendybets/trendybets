import { PlayerData } from '../types'
import { serverEnv } from "@/lib/env"

export async function fetchPlayerOdds(): Promise<PlayerData[]> {
  const response = await fetch('/api/odds')
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch player odds')
  }

  const data = await response.json()
  if (!Array.isArray(data)) {
    console.error('Unexpected API response:', data)
    throw new Error('Invalid response format from API')
  }

  return data
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

// Fetch active fixtures
export async function fetchActiveFixtures() {
  const url = `https://api.opticodds.com/api/v3/fixtures/active?` +
    `sport=basketball&` +
    `league=nba&` +
    `is_live=false&` +
    `key=${serverEnv.OPTIC_ODDS_API_KEY}`

  const response = await fetch(url, {
    next: { revalidate: 300 } // Cache for 5 minutes
  })

  if (!response.ok) {
    throw new Error('Failed to fetch fixtures')
  }

  const data = await response.json()
  return data.data || []
}

// Fetch team data
export async function fetchTeams() {
  const url = `https://api.opticodds.com/api/v3/teams?` +
    `sport=basketball&` +
    `league=nba&` +
    `key=${serverEnv.OPTIC_ODDS_API_KEY}`

  const response = await fetch(url, {
    next: { revalidate: 86400 } // Cache for 24 hours
  })

  if (!response.ok) {
    throw new Error('Failed to fetch teams')
  }

  const data = await response.json()
  return data.data || []
}

// Fetch odds for a fixture
export async function fetchFixtureOdds(fixtureId: string) {
  const url = `https://api.opticodds.com/api/v3/fixtures/odds?` +
    `sportsbook=draftkings&` +
    `sportsbook=caesars&` +
    `sportsbook=bet365&` +
    `sportsbook=betmgm&` +
    `fixture_id=${fixtureId}&` +
    `market=moneyline&` +
    `market=point_spread&` +
    `market=total_points&` +
    `is_main=true&` +
    `key=${serverEnv.OPTIC_ODDS_API_KEY}`

  const response = await fetch(url, {
    next: { revalidate: 60 } // Cache for 1 minute
  })

  if (!response.ok) {
    throw new Error('Failed to fetch odds')
  }

  const data = await response.json()
  return data.data || []
}

// Main function to get all game data
export async function fetchGames() {
  const response = await fetch('/api/games')
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch games')
  }

  const data = await response.json()
  return data
} 