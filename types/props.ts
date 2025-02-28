export interface PlayerProp {
  id: string
  player: {
    id: string
    name: string
    team: string
    position: string
    image_url?: string
  }
  stat_type: string
  line: number
  averages: {
    last5: number
    last10: number
    season: number
  }
  hit_rates: {
    last5: number
    last10: number
    season: number
  }
  current_streak: number
  next_game: {
    opponent: string
    date: string
  }
  trend_strength: number
  status: 'active' | 'inactive'
}

type BaseOdds = {
  id: string
  fixture_id: string
  sportsbook: string
  market: string
  market_id: string
  name: string
  is_main: boolean
  selection: string
  selection_line: string | null
  team_id: string | null
  price: number
  points: number | null
  start_date: string
}

// Update TransformedOdds type in game-card.tsx
type TransformedOdds = BaseOdds 