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
      games (*)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function getFixturesWithTeams() {
  console.log("getFixturesWithTeams called")
  try {
    const { data: fixtures, error } = await supabaseClient
      .from('fixtures')
      .select(`
        *,
        home_team:teams!fixtures_home_team_id_fkey(id, name, logo),
        away_team:teams!fixtures_away_team_id_fkey(id, name, logo)
      `)
      .eq('status', 'unplayed')
      .order('start_time', { ascending: true })

    console.log("Supabase response:", { fixtures, error })

    if (error) throw error
    return fixtures
  } catch (error) {
    console.error("Error in getFixturesWithTeams:", error)
    throw error
  }
}

export async function getOddsForFixture(fixtureId: string, sportsbook: string) {
  console.log('Fetching odds for:', { fixtureId, sportsbook })
  
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // First get the sportsbook info
  const { data: sportsbookData } = await supabase
    .from('sportsbook')
    .select('logo')
    .eq('name', sportsbook)
    .single()

  // Then get the odds
  const { data, error } = await supabase
    .from('odds')
    .select(`
      id,
      fixture_id,
      sportsbook,
      market,
      market_id,
      name,
      is_main,
      selection,
      selection_line,
      team_id,
      price,
      points,
      start_date
    `)
    .eq('fixture_id', fixtureId)
    .eq('sportsbook', sportsbook)
    .eq('is_main', true)
    .in('market_id', ['point_spread', 'moneyline', 'total_points'])

  if (error) {
    console.error('Error fetching odds:', error)
    return []
  }

  // Add the logo to each odds record
  return data.map(odd => ({
    ...odd,
    sportsbook_logo: sportsbookData?.logo
  }))
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

