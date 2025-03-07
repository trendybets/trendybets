import { supabase } from './index'
import { performance } from 'perf_hooks'

/**
 * Retrieves odds for a specific fixture and sportsbook
 * @param fixtureId The fixture ID
 * @param sportsbook The sportsbook name
 * @returns Odds data for the fixture
 */
export async function getOddsForFixture(fixtureId: string, sportsbook: string) {
  const startTime = performance.now()
  
  const { data, error } = await supabase
    .from('odds')
    .select(`
      id,
      fixture_id,
      sportsbook,
      market,
      name,
      is_main,
      selection,
      normalized_selection,
      market_id,
      selection_line,
      player_id,
      team_id,
      price,
      points
    `) // Removed timestamp fields that aren't needed for display
    .eq('fixture_id', fixtureId)
    .eq('sportsbook', sportsbook.toLowerCase())

  const endTime = performance.now()
  console.log(`getOddsForFixture query execution time: ${endTime - startTime}ms`)

  if (error) {
    console.error('Error fetching odds:', error)
    throw error
  }

  return data
}

/**
 * Retrieves a player's game history with pagination
 * @param playerId The player ID
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 * @param ascending Sort order by date
 * @returns Player history data and pagination metadata
 */
export async function getPlayerHistory(
  playerId: string, 
  page = 1, 
  pageSize = 20, 
  ascending = false
) {
  const startTime = performance.now()
  console.log('getPlayerHistory called with:', { playerId, page, pageSize, ascending })

  // Calculate range for pagination
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  const { data, error, count } = await supabase
    .from('player_history')
    .select(`
      id,
      player_id,
      fixture_id,
      team,
      opponent,
      start_date,
      minutes,
      points,
      rebounds,
      assists,
      steals,
      blocks,
      turnovers,
      three_pointers_made,
      field_goals_made,
      field_goals_attempted
    `, { count: 'exact' })
    .eq('player_id', playerId)
    .order('start_date', { ascending: false }) // Always fetch most recent first
    .range(start, end)

  const endTime = performance.now()
  console.log(`getPlayerHistory query execution time: ${endTime - startTime}ms`)

  if (error) {
    console.error('Error fetching player history:', error)
    return { 
      data: [],
      pagination: {
        page,
        pageSize,
        total: 0,
        totalPages: 0
      }
    }
  }

  console.log(`Found ${data?.length} games for player ${playerId} (page ${page})`)
  return {
    data: data || [],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: count ? Math.ceil(count / pageSize) : 0
    }
  }
}

/**
 * Retrieves active player props with player information
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 * @returns Player props data and pagination metadata
 */
export async function getPlayerProps(page = 1, pageSize = 20) {
  const startTime = performance.now()
  
  // Calculate range for pagination
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  const { data, error, count } = await supabase
    .from('player_props')
    .select(`
      id,
      player_id,
      fixture_id,
      prop_type,
      line,
      status,
      trend_strength,
      player:players (
        id,
        name,
        team,
        position,
        image_url
      )
    `, { count: 'exact' })
    .eq('status', 'active')
    .order('trend_strength', { ascending: false })
    .range(start, end)

  const endTime = performance.now()
  console.log(`getPlayerProps query execution time: ${endTime - startTime}ms`)

  if (error) {
    console.error('Error fetching player props:', error)
    throw error
  }

  return {
    data: data || [],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: count ? Math.ceil(count / pageSize) : 0
    }
  }
} 