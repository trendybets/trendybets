import { supabase } from './index'

/**
 * Retrieves odds for a specific fixture and sportsbook
 */
export async function getOddsForFixture(fixtureId: string, sportsbook: string) {
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
      points,
      timestamp,
      start_date,
      last_synced_at,
      created_at,
      updated_at
    `)
    .eq('fixture_id', fixtureId)
    .eq('sportsbook', sportsbook.toLowerCase())

  if (error) {
    console.error('Error fetching odds:', error)
    throw error
  }

  return data
}

/**
 * Retrieves a player's game history
 */
export async function getPlayerHistory(playerId: string, limit = 20, ascending = false) {
  console.log('getPlayerHistory called with:', { playerId, limit, ascending })

  const { data, error } = await supabase
    .from('player_history')
    .select('*')
    .eq('player_id', playerId)
    .order('start_date', { ascending: false }) // Always fetch most recent first
    .limit(limit)

  if (error) {
    console.error('Error fetching player history:', error)
    return []
  }

  console.log(`Found ${data?.length} games for player ${playerId}`)
  return data || []
}

/**
 * Retrieves active player props with player information
 */
export async function getPlayerProps() {
  const { data, error } = await supabase
    .from('player_props')
    .select(`
      *,
      player:players (
        id,
        name,
        team,
        position,
        image_url
      )
    `)
    .eq('status', 'active')
    .order('trend_strength', { ascending: false })

  if (error) {
    console.error('Error fetching player props:', error)
    throw error
  }

  return data
} 