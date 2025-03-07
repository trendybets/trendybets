import { PlayerData } from '../types'
import { serverEnv } from "@/lib/env"

// Simple client-side cache
const API_CACHE = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute in milliseconds

/**
 * Fetches data from an API endpoint with caching
 * @param url The API endpoint URL
 * @param options Fetch options
 * @param ttl Cache TTL in milliseconds (default: 1 minute)
 * @returns The API response data
 */
async function fetchWithCache(url: string, options: RequestInit = {}, ttl = CACHE_TTL) {
  const cacheKey = url;
  const cachedData = API_CACHE.get(cacheKey);
  
  // If we have cached data and it's not expired, use it
  if (cachedData && (Date.now() - cachedData.timestamp) < ttl) {
    console.log(`Using cached data for ${url}`);
    return cachedData.data;
  }
  
  // Otherwise fetch new data
  console.log(`Fetching fresh data for ${url}`);
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Cache the new data
  API_CACHE.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}

/**
 * Fetches player odds with pagination support
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 * @param fixtureLimit Limit the number of fixtures to process (0 for all)
 * @returns Player odds data and pagination metadata
 */
export async function fetchPlayerOdds(
  fixtureLimit = 0,
  page = 1,
  pageSize = 20
): Promise<{ data: PlayerData[], pagination: any }> {
  try {
    console.log(`Fetching player odds with fixtureLimit=${fixtureLimit}, page=${page}, pageSize=${pageSize}`);
    
    const url = `/api/odds?limit=${fixtureLimit}&page=${page}&pageSize=${pageSize}`;
    const responseData = await fetchWithCache(url);
    
    console.log(`API returned ${responseData.data?.length || 0} players with metadata:`, responseData.meta);
    
    return {
      data: responseData.data || [],
      pagination: responseData.pagination || {
        page,
        pageSize,
        total: responseData.data?.length || 0,
        totalPages: Math.ceil((responseData.data?.length || 0) / pageSize)
      }
    };
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

/**
 * Fetches active fixtures with pagination
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 * @returns Active fixtures data and pagination metadata
 */
export async function fetchActiveFixtures(page = 1, pageSize = 20) {
  const url = `/api/fixtures/active?page=${page}&pageSize=${pageSize}`;
  const data = await fetchWithCache(url);
  
  return {
    data: data.data || [],
    pagination: data.pagination || {
      page,
      pageSize,
      total: data.data?.length || 0,
      totalPages: Math.ceil((data.data?.length || 0) / pageSize)
    }
  };
}

/**
 * Fetches team data
 * @returns Team data
 */
export async function fetchTeams() {
  const data = await fetchWithCache('/api/teams', {}, 5 * 60 * 1000); // Cache teams for 5 minutes
  return data.data || [];
}

/**
 * Fetches game odds for a fixture
 * @param fixtureId The fixture ID
 * @returns Game odds data
 */
export async function fetchFixtureOdds(fixtureId: string) {
  const url = `/api/games/odds?fixture_id=${fixtureId}`;
  const data = await fetchWithCache(url);
  return data.data || [];
}

/**
 * Fetches all games with pagination
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 * @returns Games data and pagination metadata
 */
export async function fetchGames(page = 1, pageSize = 20) {
  const url = `/api/games?page=${page}&pageSize=${pageSize}`;
  const data = await fetchWithCache(url);
  
  return {
    data: data.data || [],
    pagination: data.pagination || {
      page,
      pageSize,
      total: data.data?.length || 0,
      totalPages: Math.ceil((data.data?.length || 0) / pageSize)
    }
  };
} 