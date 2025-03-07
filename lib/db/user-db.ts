import { supabase } from './index'

/**
 * Retrieves a user's profile by their user ID
 */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (error) throw error
  return data
}

/**
 * Updates a user's profile with the provided updates
 */
export async function updateProfile(
  userId: string, 
  updates: { username?: string; avatar_url?: string }
) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)

  if (error) throw error
  return data
}

/**
 * Retrieves all bets placed by a user
 */
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