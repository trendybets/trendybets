import { withPerformanceLogging } from './supabase-client'
import { supabase } from './index'

/**
 * Retrieves all active sports
 * @returns Array of sports
 */
export async function getSports() {
  return withPerformanceLogging(async () => {
    const { data, error } = await supabase
      .from('sports')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching sports:', error)
      throw error
    }

    return data || []
  }, 'getSports')
}

/**
 * Retrieves a specific sport by ID
 * @param sportId Sport ID to retrieve
 * @returns Sport data or null if not found
 */
export async function getSportById(sportId: string) {
  return withPerformanceLogging(async () => {
    const { data, error } = await supabase
      .from('sports')
      .select('*')
      .eq('id', sportId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // PGRST116 is the error code for "no rows returned"
        return null
      }
      console.error(`Error fetching sport ${sportId}:`, error)
      throw error
    }

    return data
  }, 'getSportById')
}

/**
 * Retrieves leagues for a specific sport
 * @param sportId Sport ID to filter by (optional)
 * @returns Array of leagues
 */
export async function getLeagues(sportId?: string) {
  return withPerformanceLogging(async () => {
    let query = supabase
      .from('leagues')
      .select(`
        *,
        sport:sports(id, name)
      `)
      .order('name', { ascending: true })

    if (sportId) {
      query = query.eq('sport_id', sportId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching leagues:', error)
      throw error
    }

    return data || []
  }, 'getLeagues')
}

/**
 * Retrieves a specific league by ID
 * @param leagueId League ID to retrieve
 * @returns League data or null if not found
 */
export async function getLeagueById(leagueId: string) {
  return withPerformanceLogging(async () => {
    const { data, error } = await supabase
      .from('leagues')
      .select(`
        *,
        sport:sports(id, name)
      `)
      .eq('id', leagueId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // PGRST116 is the error code for "no rows returned"
        return null
      }
      console.error(`Error fetching league ${leagueId}:`, error)
      throw error
    }

    return data
  }, 'getLeagueById')
}

/**
 * Retrieves leagues grouped by region
 * @param sportId Optional sport ID to filter by
 * @returns Object with regions as keys and arrays of leagues as values
 */
export async function getLeaguesByRegion(sportId?: string) {
  return withPerformanceLogging(async () => {
    const leagues = await getLeagues(sportId)
    
    return leagues.reduce((regions: Record<string, any[]>, league: any) => {
      const region = league.region || 'Other'
      
      if (!regions[region]) {
        regions[region] = []
      }
      
      regions[region].push(league)
      return regions
    }, {})
  }, 'getLeaguesByRegion')
} 