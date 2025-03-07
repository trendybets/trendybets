import { supabase } from './index'

/**
 * Retrieves games ordered by start time with pagination support
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 * @param includeCompleted Whether to include completed games
 * @returns Games data and pagination metadata
 */
export async function getGames(page = 1, pageSize = 20, includeCompleted = true) {
  // Calculate range for pagination
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  // Start building the query
  let query = supabase
    .from("games")
    .select(`
      id,
      home_team,
      away_team,
      start_time,
      home_score,
      away_score,
      status,
      season_type,
      season_year
    `, { count: 'exact' }) // Request exact count for pagination
    .order("start_time", { ascending: true })
    .range(start, end)
  
  // Add status filter if not including completed games
  if (!includeCompleted) {
    query = query.not('status', 'eq', 'completed')
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching games:', error)
    throw error
  }

  return {
    data,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: count ? Math.ceil(count / pageSize) : 0
    }
  }
}

/**
 * Retrieves fixtures with their associated teams
 * @param status Filter by fixture status (default: 'unplayed')
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 * @returns Fixtures data and pagination metadata
 */
export async function getFixturesWithTeams(status = 'unplayed', page = 1, pageSize = 20) {
  // Calculate range for pagination
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  const { data, error, count } = await supabase
    .from('fixtures')
    .select(`
      id,
      start_date,
      status,
      home_team_id,
      away_team_id,
      home_team_display,
      away_team_display,
      home_team:teams!fixtures_home_team_id_fkey (
        id,
        name,
        logo,
        abbreviation
      ),
      away_team:teams!fixtures_away_team_id_fkey (
        id,
        name,
        logo,
        abbreviation
      )
    `, { count: 'exact' })
    .eq('status', status)
    .order('start_date', { ascending: true })
    .range(start, end)

  if (error) {
    console.error('Error fetching fixtures:', error)
    throw error
  }

  return {
    data,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: count ? Math.ceil(count / pageSize) : 0
    }
  }
}

/**
 * Retrieves all active sportsbooks
 */
export async function getSportsbook() {
  const { data, error } = await supabase
    .from('sportsbook')
    .select('id, name, logo, is_active')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching sportsbook:', error)
    throw error
  }

  return data
} 