import { supabase } from '@/lib/database'
import type { PlayerProp } from '@/types/props'

export async function getPlayerProps() {
  const { data, error } = await supabase
    .from('player_props')
    .select(`
      id,
      player:players (
        id,
        name,
        team,
        position,
        image_url
      ),
      stat_type,
      line,
      averages,
      hit_rates,
      current_streak,
      next_game,
      trend_strength,
      status
    `)
    .eq('status', 'active')
    .order('trend_strength', { ascending: false })

  if (error) {
    console.error('Error fetching player props:', error)
    throw error
  }

  return data as PlayerProp[]
} 