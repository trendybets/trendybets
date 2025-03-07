import { supabase } from './index'

/**
 * Retrieves all games ordered by start time
 */
export async function getGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("start_time", { ascending: true })

  if (error) throw error
  return data
}

/**
 * Retrieves all fixtures with their associated teams
 */
export async function getFixturesWithTeams() {
  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      *,
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
    `)
    .eq('status', 'unplayed')
    .order('start_date', { ascending: true })

  if (error) {
    console.error('Error fetching fixtures:', error)
    throw error
  }

  return data
}

/**
 * Retrieves all active sportsbooks
 */
export async function getSportsbook() {
  const { data, error } = await supabase
    .from('sportsbook')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching sportsbook:', error)
    throw error
  }

  return data
} 