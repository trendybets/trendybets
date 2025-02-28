import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Add at the top after imports
console.log('Exported functions:', {
  getFixturesWithTeams: typeof getFixturesWithTeams,
  getOddsForFixture: typeof getOddsForFixture,
  getSportsbook: typeof getSportsbook
})

// At the top of the file
console.log('Loading database.ts')

// Remove the export block at the top and export each function directly
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