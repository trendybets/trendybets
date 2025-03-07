import { supabase } from './index'
import { performance } from 'perf_hooks'

/**
 * Retrieves a user's profile by their user ID
 * @param userId The user ID
 * @returns User profile data
 */
export async function getProfile(userId: string) {
  const startTime = performance.now()
  
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, created_at")
    .eq("id", userId)
    .single()

  const endTime = performance.now()
  console.log(`getProfile query execution time: ${endTime - startTime}ms`)

  if (error) throw error
  return data
}

/**
 * Updates a user's profile with the provided updates
 * @param userId The user ID
 * @param updates The profile updates
 * @returns Updated profile data
 */
export async function updateProfile(
  userId: string, 
  updates: { username?: string; avatar_url?: string }
) {
  const startTime = performance.now()
  
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("id, username, avatar_url, updated_at")

  const endTime = performance.now()
  console.log(`updateProfile query execution time: ${endTime - startTime}ms`)

  if (error) throw error
  return data
}

/**
 * Retrieves bets placed by a user with pagination
 * @param userId The user ID
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 * @returns User bets data and pagination metadata
 */
export async function getUserBets(userId: string, page = 1, pageSize = 20) {
  const startTime = performance.now()
  
  // Calculate range for pagination
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  const { data, error, count } = await supabase
    .from("bets")
    .select(`
      id,
      user_id,
      fixture_id,
      player_id,
      bet_type,
      bet_value,
      odds,
      stake,
      potential_payout,
      status,
      created_at,
      game:games (
        id,
        home_team,
        away_team,
        start_time,
        home_score,
        away_score,
        status
      )
    `, { count: 'exact' })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(start, end)

  const endTime = performance.now()
  console.log(`getUserBets query execution time: ${endTime - startTime}ms`)

  if (error) throw error
  
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