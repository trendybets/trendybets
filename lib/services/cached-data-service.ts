import { fetchPlayerOdds, fetchActiveFixtures, fetchTeams, fetchFixtureOdds, fetchGames } from '@/app/lib/api'
import { PlayerData } from '@/app/types'
import { withCache } from '@/lib/redis'

// Cache TTL values in seconds
const CACHE_TTL = {
  PLAYER_ODDS: 5 * 60, // 5 minutes
  FIXTURES: 10 * 60,   // 10 minutes
  TEAMS: 60 * 60,      // 1 hour
  FIXTURE_ODDS: 5 * 60, // 5 minutes
  GAMES: 10 * 60       // 10 minutes
}

/**
 * Generates a cache key for player odds
 * @param page Page number
 * @param pageSize Page size
 * @param fixtureLimit Fixture limit
 * @returns Cache key
 */
function getPlayerOddsCacheKey(page: number, pageSize: number, fixtureLimit: number): string {
  return `player_odds:page_${page}:size_${pageSize}:limit_${fixtureLimit}`
}

/**
 * Fetches player odds data with pagination and caching
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 * @param fixtureLimit Limit the number of fixtures to process (0 for all)
 * @returns Player odds data and pagination metadata
 */
export async function fetchPlayerOddsDataCached(
  page = 1,
  pageSize = 20,
  fixtureLimit = 0
): Promise<{
  data: PlayerData[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  fixtures: string[]
  teams: string[]
}> {
  const cacheKey = getPlayerOddsCacheKey(page, pageSize, fixtureLimit)
  
  return withCache(
    cacheKey,
    async () => {
      try {
        // Fetch player odds data
        const response = await fetchPlayerOdds(fixtureLimit, page, pageSize)
        
        // Extract unique fixtures
        const fixtureSet = new Set<string>()
        const teamSet = new Set<string>()
        
        response.data.forEach(player => {
          // Add team to teams set
          if (player.player?.team) {
            teamSet.add(player.player.team)
          }
          
          // Add fixture to fixtures set
          if (player.next_game && player.next_game.home_team && player.next_game.away_team) {
            const fixtureString = `${player.next_game.home_team} vs ${player.next_game.away_team}`
            fixtureSet.add(fixtureString)
          }
        })
        
        return {
          data: response.data,
          pagination: response.pagination,
          fixtures: Array.from(fixtureSet),
          teams: Array.from(teamSet).sort()
        }
      } catch (error) {
        console.error('Error fetching player odds data:', error)
        throw error
      }
    },
    CACHE_TTL.PLAYER_ODDS
  )
}

/**
 * Generates a cache key for active fixtures
 * @param page Page number
 * @param pageSize Page size
 * @returns Cache key
 */
function getActiveFixturesCacheKey(page: number, pageSize: number): string {
  return `active_fixtures:page_${page}:size_${pageSize}`
}

/**
 * Fetches active fixtures with pagination and caching
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 * @returns Active fixtures data and pagination metadata
 */
export async function fetchActiveFixturesDataCached(page = 1, pageSize = 20) {
  const cacheKey = getActiveFixturesCacheKey(page, pageSize)
  
  return withCache(
    cacheKey,
    async () => {
      try {
        return await fetchActiveFixtures(page, pageSize)
      } catch (error) {
        console.error('Error fetching active fixtures data:', error)
        throw error
      }
    },
    CACHE_TTL.FIXTURES
  )
}

/**
 * Fetches team data with caching
 * @returns Team data
 */
export async function fetchTeamsDataCached() {
  const cacheKey = 'teams'
  
  return withCache(
    cacheKey,
    async () => {
      try {
        return await fetchTeams()
      } catch (error) {
        console.error('Error fetching teams data:', error)
        throw error
      }
    },
    CACHE_TTL.TEAMS
  )
}

/**
 * Generates a cache key for fixture odds
 * @param fixtureId Fixture ID
 * @returns Cache key
 */
function getFixtureOddsCacheKey(fixtureId: string): string {
  return `fixture_odds:${fixtureId}`
}

/**
 * Fetches fixture odds with caching
 * @param fixtureId Fixture ID
 * @returns Fixture odds data
 */
export async function fetchFixtureOddsCached(fixtureId: string) {
  const cacheKey = getFixtureOddsCacheKey(fixtureId)
  
  return withCache(
    cacheKey,
    async () => {
      try {
        return await fetchFixtureOdds(fixtureId)
      } catch (error) {
        console.error('Error fetching fixture odds data:', error)
        throw error
      }
    },
    CACHE_TTL.FIXTURE_ODDS
  )
}

/**
 * Generates a cache key for games
 * @param page Page number
 * @param pageSize Page size
 * @returns Cache key
 */
function getGamesCacheKey(page: number, pageSize: number): string {
  return `games:page_${page}:size_${pageSize}`
}

/**
 * Fetches games with pagination and caching
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 * @returns Games data and pagination metadata
 */
export async function fetchGamesDataCached(page = 1, pageSize = 20) {
  const cacheKey = getGamesCacheKey(page, pageSize)
  
  return withCache(
    cacheKey,
    async () => {
      try {
        return await fetchGames(page, pageSize)
      } catch (error) {
        console.error('Error fetching games data:', error)
        throw error
      }
    },
    CACHE_TTL.GAMES
  )
} 