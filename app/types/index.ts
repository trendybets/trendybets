export interface Player {
  id: string
  name: string
  team: string
  position: string
  image_url: string
}

export interface NextGame {
  fixture_id?: string
  opponent: string
  date: string
  home_team: string
  away_team: string
}

export interface RecommendedBet {
  type: 'over' | 'under'
  confidence: 'very-high' | 'high' | 'medium' | 'low'
  reason: string
  odds?: number
}

export interface GameStats {
  points: number
  assists: number
  total_rebounds: number
  date: string
  is_away: boolean
  opponent: string
}

export interface PlayerHistoryGame {
  id: string
  player_id: string
  fixture_id: string
  start_date: string
  points: number
  assists: number
  rebounds: number
  minutes: number
  opponent: string
  is_home: boolean
  created_at: string
  updated_at: string
}

export interface PlayerData {
  id: string
  player: Player
  stat_type: string
  line: number
  games: GameStats[]
  averages: {
    points: {
      last5: number
      last10: number
      season: number
    }
    assists: {
      last5: number
      last10: number
      season: number
    }
    rebounds: {
      last5: number
      last10: number
      season: number
    }
  }
  hit_rates: {
    points: {
      last5: number
      last10: number
      season: number
    }
    assists: {
      last5: number
      last10: number
      season: number
    }
    rebounds: {
      last5: number
      last10: number
      season: number
    }
  }
  lines: {
    points: number
    assists: number
    rebounds: number
  }
  current_streak: number
  recommended_bet: RecommendedBet
  next_game: NextGame
  trend_strength: number
} 