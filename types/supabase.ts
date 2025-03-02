export interface Database {
  public: {
    Tables: {
      player_props: {
        Row: {
          id: string
          player_id: string
          points: number
          market_id: string
          selection_line: string
          name?: string
          sportsbook: {
            name: string
            logo: string
          }
        }
      },
      fixtures_completed: {
        Row: {
          id: string
          numerical_id: number
          game_id: string
          start_date: string
          home_competitors: {
            id: string
            name: string
            numerical_id: number
            base_id: number
            abbreviation: string
            logo: string
          }[]
          away_competitors: {
            id: string
            name: string
            numerical_id: number
            base_id: number
            abbreviation: string
            logo: string
          }[]
          home_team_display: string
          away_team_display: string
          status: string
          venue_name: string
          venue_location: string
          broadcast: string
          home_score_total: number
          home_score_q1: number
          home_score_q2: number
          home_score_q3: number
          home_score_q4: number
          away_score_total: number
          away_score_q1: number
          away_score_q2: number
          away_score_q3: number
          away_score_q4: number
          result: {
            scores: {
              home: {
                total: number
                periods: {
                  period_1: number
                  period_2: number
                  period_3: number
                  period_4: number
                }
              }
              away: {
                total: number
                periods: {
                  period_1: number
                  period_2: number
                  period_3: number
                  period_4: number
                }
              }
            }
          }
          season_type: string
          season_year: string
          season_week: string
        }
      }
    }
  }
}
