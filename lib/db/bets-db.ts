import { supabase } from './index'

/**
 * Places a bet for a user on a specific game
 */
export async function placeBet(
  userId: string, 
  gameId: string, 
  betType: string, 
  betAmount: number, 
  odds: number
) {
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