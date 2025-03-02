import { PlayerData } from '../types'
import { serverEnv } from "@/lib/env"

export async function fetchPlayerOdds(fixtureLimit = 10): Promise<PlayerData[]> {
  try {
    console.log(`Fetching player odds with fixture limit: ${fixtureLimit}`);
    const response = await fetch(`/api/odds?limit=${fixtureLimit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch player odds: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    const playerData = responseData.data || [];
    
    console.log(`Received ${playerData.length} player odds entries`);
    
    // Log a sample player to check the games data
    if (playerData.length > 0) {
      console.log(`Sample player games count: ${playerData[0].games?.length || 0}`);
      
      // Log unique fixtures to help debug
      const fixtures = new Set();
      playerData.forEach((player: PlayerData) => {
        if (player.next_game && player.next_game.opponent) {
          fixtures.add(`${player.player.team} vs ${player.next_game.opponent}`);
        }
      });
      
      console.log('Unique fixtures found:', Array.from(fixtures));
      
      // Count players per fixture
      const fixturePlayerCounts: Record<string, number> = {};
      playerData.forEach((player: PlayerData) => {
        if (player.next_game && player.next_game.opponent) {
          const fixtureString = `${player.player.team} vs ${player.next_game.opponent}`;
          fixturePlayerCounts[fixtureString] = (fixturePlayerCounts[fixtureString] || 0) + 1;
        }
      });
      console.log('Players per fixture:', fixturePlayerCounts);
    }
    
    return playerData;
  } catch (error) {
    console.error('Error in fetchPlayerOdds:', error);
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