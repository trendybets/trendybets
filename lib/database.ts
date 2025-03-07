import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { clientEnv, serverEnv } from "@/lib/env"

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const supabaseClient = createClient<Database>(
  clientEnv.SUPABASE_URL,
  clientEnv.SUPABASE_ANON_KEY
)

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (error) throw error
  return data
}

export async function updateProfile(userId: string, updates: { username?: string; avatar_url?: string }) {
  const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId)

  if (error) throw error
  return data
}

export async function getGames() {
  const { data, error } = await supabase.from("games").select("*").order("start_time", { ascending: true })

  if (error) throw error
  return data
}

export async function placeBet(userId: string, gameId: string, betType: string, betAmount: number, odds: number) {
  const { data, error } = await supabase.from("bets").insert({
    user_id: userId,
    game_id: gameId,
    bet_type: betType,
    bet_amount: betAmount,
    odds: odds,
    status: "pending",
  })

  if (error) throw error
  return data
}

export async function getUserBets(userId: string) {
  const { data, error } = await supabase
    .from("bets")
    .select(`
      *,
      game:games (
        id,
        home_team,
        away_team,
        start_time,
        home_score,
        away_score,
        status
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

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

export async function getPlayerHistory(playerId: string, limit = 20, ascending = false) {
  console.log('getPlayerHistory called with:', { playerId, limit, ascending })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

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

// Function to calculate average points
export function calculateAverage(history: any[]) {
  if (!history.length) return 0
  const sum = history.reduce((acc, game) => acc + game.points, 0)
  return Math.round((sum / history.length) * 10) / 10 // Round to 1 decimal place
}

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

