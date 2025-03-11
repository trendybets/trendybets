export interface Database {
  public: {
    Tables: {
      // Fixture results for completed games with detailed statistics
      fixture_results: {
        Row: {
          id: string
          fixture_id: string | null
          game_id: string | null
          start_date: string | null
          home_team_id: string | null
          away_team_id: string | null
          home_team_display: string | null
          away_team_display: string | null
          home_total: number | null
          home_period_1: number | null
          home_period_2: number | null
          home_period_3: number | null
          home_period_4: number | null
          away_total: number | null
          away_period_1: number | null
          away_period_2: number | null
          away_period_3: number | null
          away_period_4: number | null
          home_dunks: number | null
          home_fouls: number | null
          home_blocks: number | null
          home_points: number | null
          home_steals: number | null
          home_assists: number | null
          home_turnovers: number | null
          home_team_rebounds: number | null
          home_total_rebounds: number | null
          home_points_in_paint: number | null
          home_field_goals_made: number | null
          home_free_throws_made: number | null
          home_fast_break_points: number | null
          home_defensive_rebounds: number | null
          home_offensive_rebounds: number | null
          home_points_off_turnovers: number | null
          home_second_chance_points: number | null
          home_field_goals_attempted: number | null
          home_free_throws_attempted: number | null
          home_three_point_made: number | null
          home_three_point_attempted: number | null
          away_dunks: number | null
          away_fouls: number | null
          away_blocks: number | null
          away_points: number | null
          away_steals: number | null
          away_assists: number | null
          away_turnovers: number | null
          away_team_rebounds: number | null
          away_total_rebounds: number | null
          away_points_in_paint: number | null
          away_field_goals_made: number | null
          away_free_throws_made: number | null
          away_fast_break_points: number | null
          away_defensive_rebounds: number | null
          away_offensive_rebounds: number | null
          away_points_off_turnovers: number | null
          away_second_chance_points: number | null
          away_field_goals_attempted: number | null
          away_free_throws_attempted: number | null
          away_three_point_made: number | null
          away_three_point_attempted: number | null
          created_at: string | null
        }
      },
      // Completed fixtures/games table
      fixtures_completed: {
        Row: {
          id: string
          numerical_id: number | null
          game_id: string | null
          start_date: string | null
          home_competitors: {
            id: string
            name: string
            numerical_id: number
            base_id: number
            abbreviation: string
            logo: string
          }[] | null
          away_competitors: {
            id: string
            name: string
            numerical_id: number
            base_id: number
            abbreviation: string
            logo: string
          }[] | null
          home_team_display: string | null
          away_team_display: string | null
          status: string | null
          venue_name: string | null
          venue_location: string | null
          broadcast: string | null
          home_score_total: number | null
          home_score_q1: number | null
          home_score_q2: number | null
          home_score_q3: number | null
          home_score_q4: number | null
          away_score_total: number | null
          away_score_q1: number | null
          away_score_q2: number | null
          away_score_q3: number | null
          away_score_q4: number | null
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
          } | null
          season_type: string | null
          season_year: string | null
          season_week: string | null
          player_history_id: number | null
          created_at: string | null
          updated_at: string | null
        }
      },
      // Upcoming fixtures/games table
      fixtures: {
        Row: {
          id: string
          numerical_id: number | null
          game_id: string
          start_date: string
          status: string
          is_live: boolean
          home_team_display: string | null
          away_team_display: string | null
          venue_name: string | null
          venue_location: string | null
          broadcast: string | null
          created_at: string
          home_team_id: string
          away_team_id: string
          home_team_abbreviation: string | null
          away_team_abbreviation: string | null
          home_record: string | null
          away_record: string | null
          start_time: string | null
          sport_id: string | null
          league_id: string | null
          home_score: number | null
          away_score: number | null
          venue: string | null
          source_ids: any | null
          updated_at: string | null
          last_synced_at: string | null
        }
      },
      // Market types table
      market: {
        Row: {
          id: string
          sportsbook_id: string
          name: string
          numerical_id: number | null
          sport_id: string | null
          league_id: string | null
          created_at: string
        }
      },
      // Game odds table
      odds: {
        Row: {
          id: string
          fixture_id: string
          sportsbook: string
          market: string
          name: string
          is_main: boolean
          selection: string
          normalized_selection: string
          market_id: string
          selection_line: string
          player_id: string | null
          team_id: string | null
          price: number
          points: number | null
          timestamp: number
          start_date: string | null
          last_synced_at: string | null
          created_at: string | null
          updated_at: string | null
        }
      },
      // Player game history table
      player_history: {
        Row: {
          id: number
          player_id: string
          fixture_id: string
          game_id: string | null
          start_date: string
          fouls: number
          blocks: number
          points: number
          steals: number
          assists: number
          minutes: number
          seconds: number
          turnovers: number
          plus_minus: number
          first_basket: number
          flagrant_fouls: number
          total_rebounds: number
          blocks_received: number
          technical_fouls: number
          field_goals_made: number
          free_throws_made: number
          first_team_basket: number
          defensive_rebounds: number
          offensive_rebounds: number
          points_off_turnovers: number
          field_goals_attempted: number
          free_throws_attempted: number
          first_basket_including_ft: number
          two_point_field_goals_made: number
          three_point_field_goals_made: number
          first_team_basket_including_ft: number
          two_point_field_goals_attempted: number
          three_point_field_goals_attempted: number
          created_at: string
          last_synced_at: string | null
        }
      },
      // Player betting odds table
      player_odds: {
        Row: {
          id: string
          fixture_id: string
          sportsbook: string
          market: string
          name: string
          is_main: boolean | null
          selection: string
          normalized_selection: string | null
          market_id: string
          selection_line: string | null
          player_id: string | null
          team_id: string | null
          price: number | null
          points: number | null
          timestamp: number | null
          created_at: string
          start_date: string | null
          last_synced_at: string | null
        }
      },
      // Players table
      players: {
        Row: {
          id: string
          full_name: string
          first_name: string
          last_name: string
          position: string | null
          number: number | null
          age: number | null
          height: number | null
          weight: number | null
          experience: number | null
          logo: string | null
          is_active: boolean
          source_ids: any | null
          sport_id: string | null
          league_id: string | null
          team_id: string | null
          created_at: string
        }
      },
      // User profiles table
      profiles: {
        Row: {
          id: string
          username: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
      },
      // Sportsbooks reference table
      sportsbook: {
        Row: {
          id: string
          name: string
          logo: string | null
          is_onshore: boolean
          is_active: boolean
          created_at: string
        }
      },
      // Sync log for tracking data synchronization operations
      sync_log: {
        Row: {
          id: string
          sync_type: string
          started_at: string
          completed_at: string | null
          status: string
          last_sync_date: string | null
          records_processed: number | null
          error: string | null
          metadata: any | null
        }
      },
      // Sync schedule for managing automatic data synchronization
      sync_schedule: {
        Row: {
          id: number
          endpoint: string
          frequency: string
          last_run: string | null
          next_run: string | null
          is_active: boolean | null
          created_at: string | null
        }
      },
      // Teams reference table
      teams: {
        Row: {
          id: string
          name: string
          numerical_id: number | null
          base_id: number | null
          created_at: string
          city: string | null
          mascot: string | null
          nickname: string | null
          abbreviation: string | null
          division: string | null
          conference: string | null
          logo: string | null
          source_ids: any | null
        }
      },
      // Sports reference table
      sports: {
        Row: {
          id: string
          name: string
          numerical_id: number | null
          main_markets: {
            id: string
            name: string
            numerical_id: number
          }[] | null
          last_synced_at: string | null
          created_at: string
        }
      },
      // Leagues reference table
      leagues: {
        Row: {
          id: string
          name: string
          numerical_id: number | null
          sport_id: string
          region: string | null
          region_code: string | null
          last_synced_at: string | null
          created_at: string
        }
      }
    }
  }
}
