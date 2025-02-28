export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
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
        Insert: {
          id: string
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          numerical_id: number | null
          base_id: number | null
          city: string | null
          mascot: string | null
          nickname: string | null
          abbreviation: string | null
          division: string | null
          conference: string | null
          logo: string | null
          source_ids: Record<string, any> | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          numerical_id?: number | null
          base_id?: number | null
          city?: string | null
          mascot?: string | null
          nickname?: string | null
          abbreviation?: string | null
          division?: string | null
          conference?: string | null
          logo?: string | null
          source_ids?: Record<string, any> | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          numerical_id?: number | null
          base_id?: number | null
          city?: string | null
          mascot?: string | null
          nickname?: string | null
          abbreviation?: string | null
          division?: string | null
          conference?: string | null
          logo?: string | null
          source_ids?: Record<string, any> | null
          created_at?: string
        }
      }
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
          source_ids: Record<string, any> | null
          sport_id: string | null
          league_id: string | null
          team_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          first_name: string
          last_name: string
          position?: string | null
          number?: number | null
          age?: number | null
          height?: number | null
          weight?: number | null
          experience?: number | null
          logo?: string | null
          is_active: boolean
          source_ids?: Record<string, any> | null
          sport_id?: string | null
          league_id?: string | null
          team_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          first_name?: string
          last_name?: string
          position?: string | null
          number?: number | null
          age?: number | null
          height?: number | null
          weight?: number | null
          experience?: number | null
          logo?: string | null
          is_active?: boolean
          source_ids?: Record<string, any> | null
          sport_id?: string | null
          league_id?: string | null
          team_id?: string | null
          created_at?: string
        }
      }
      sportsbook: {
        Row: {
          id: string
          name: string
          logo: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          logo?: string | null
          is_active: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      market: {
        Row: {
          id: string
          sportsbook_id: string
          name: string
          numerical_id: number
          sport_id: string | null
          league_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          sportsbook_id: string
          name: string
          numerical_id: number
          sport_id?: string | null
          league_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sportsbook_id?: string
          name?: string
          numerical_id?: number
          sport_id?: string | null
          league_id?: string | null
          created_at?: string
        }
      }
      player_history: {
        Row: {
          player_id: string
          fixture_id: string
          game_id: string
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
        }
        Insert: {
          player_id: string
          fixture_id: string
          game_id: string
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
          created_at?: string
        }
        Update: {
          player_id?: string
          fixture_id?: string
          game_id?: string
          start_date?: string
          fouls?: number
          blocks?: number
          points?: number
          steals?: number
          assists?: number
          minutes?: number
          seconds?: number
          turnovers?: number
          plus_minus?: number
          first_basket?: number
          flagrant_fouls?: number
          total_rebounds?: number
          blocks_received?: number
          technical_fouls?: number
          field_goals_made?: number
          free_throws_made?: number
          first_team_basket?: number
          defensive_rebounds?: number
          offensive_rebounds?: number
          points_off_turnovers?: number
          field_goals_attempted?: number
          free_throws_attempted?: number
          first_basket_including_ft?: number
          two_point_field_goals_made?: number
          three_point_field_goals_made?: number
          first_team_basket_including_ft?: number
          two_point_field_goals_attempted?: number
          three_point_field_goals_attempted?: number
          created_at?: string
        }
      }
      fixtures: {
        Row: {
          id: string
          numerical_id: number
          game_id: string
          start_date: string
          status: string
          is_live: boolean
          home_team_display: string
          away_team_display: string
          home_team_id: string
          away_team_id: string
          home_team_abbreviation: string | null
          away_team_abbreviation: string | null
          home_record: string | null
          away_record: string | null
          venue_name: string | null
          venue_location: string | null
          broadcast: string | null
          created_at: string
        }
        Insert: {
          id: string
          numerical_id: number
          game_id: string
          start_date: string
          status: string
          is_live: boolean
          home_team_display: string
          away_team_display: string
          home_team_id: string
          away_team_id: string
          home_team_abbreviation?: string | null
          away_team_abbreviation?: string | null
          home_record?: string | null
          away_record?: string | null
          venue_name?: string | null
          venue_location?: string | null
          broadcast?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          numerical_id?: number
          game_id?: string
          start_date?: string
          status?: string
          is_live?: boolean
          home_team_display?: string
          away_team_display?: string
          home_team_id?: string
          away_team_id?: string
          home_team_abbreviation?: string | null
          away_team_abbreviation?: string | null
          home_record?: string | null
          away_record?: string | null
          venue_name?: string | null
          venue_location?: string | null
          broadcast?: string | null
          created_at?: string
        }
      }
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
        }
        Insert: {
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
          player_id?: string | null
          team_id?: string | null
          price: number
          points?: number | null
          timestamp: number
        }
        Update: {
          id?: string
          fixture_id?: string
          sportsbook?: string
          market?: string
          name?: string
          is_main?: boolean
          selection?: string
          normalized_selection?: string
          market_id?: string
          selection_line?: string
          player_id?: string | null
          team_id?: string | null
          price?: number
          points?: number | null
          timestamp?: number
        }
      }
      player_odds: {
        Row: {
          id: string
          fixture_id: string
          sportsbook: string
          market: string
          name: string
          is_main: boolean
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
        }
        Insert: {
          id: string
          fixture_id: string
          sportsbook: string
          market: string
          name: string
          is_main?: boolean
          selection: string
          normalized_selection?: string | null
          market_id: string
          selection_line?: string | null
          player_id?: string | null
          team_id?: string | null
          price?: number | null
          points?: number | null
          timestamp?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          fixture_id?: string
          sportsbook?: string
          market?: string
          name?: string
          is_main?: boolean
          selection?: string
          normalized_selection?: string | null
          market_id?: string
          selection_line?: string | null
          player_id?: string | null
          team_id?: string | null
          price?: number | null
          points?: number | null
          timestamp?: number | null
          created_at?: string
        }
      }
      fixture_results: {
        Row: {
          id: string
          fixture_id: string
          game_id: string
          start_date: string
          home_team_id: string
          away_team_id: string
          home_team_display: string
          away_team_display: string
          home_total: number
          home_period_1: number
          home_period_2: number
          home_period_3: number
          home_period_4: number
          away_total: number
          away_period_1: number
          away_period_2: number
          away_period_3: number
          away_period_4: number
          home_dunks: number
          home_fouls: number
          home_blocks: number
          home_points: number
          home_steals: number
          home_assists: number
          home_turnovers: number
          home_team_rebounds: number
          home_total_rebounds: number
          home_points_in_paint: number
          home_field_goals_made: number
          home_free_throws_made: number
          home_fast_break_points: number
          home_defensive_rebounds: number
          home_offensive_rebounds: number
          home_points_off_turnovers: number
          home_second_chance_points: number
          home_field_goals_attempted: number
          home_free_throws_attempted: number
          home_three_point_made: number
          home_three_point_attempted: number
          away_dunks: number
          away_fouls: number
          away_blocks: number
          away_points: number
          away_steals: number
          away_assists: number
          away_turnovers: number
          away_team_rebounds: number
          away_total_rebounds: number
          away_points_in_paint: number
          away_field_goals_made: number
          away_free_throws_made: number
          away_fast_break_points: number
          away_defensive_rebounds: number
          away_offensive_rebounds: number
          away_points_off_turnovers: number
          away_second_chance_points: number
          away_field_goals_attempted: number
          away_free_throws_attempted: number
          away_three_point_made: number
          away_three_point_attempted: number
          created_at: string
        }
        Insert: {
          id: string
          fixture_id: string
          game_id: string
          start_date: string
          home_team_id: string
          away_team_id: string
          home_team_display: string
          away_team_display: string
          home_total: number
          home_period_1: number
          home_period_2: number
          home_period_3: number
          home_period_4: number
          away_total: number
          away_period_1: number
          away_period_2: number
          away_period_3: number
          away_period_4: number
          home_dunks: number
          home_fouls: number
          home_blocks: number
          home_points: number
          home_steals: number
          home_assists: number
          home_turnovers: number
          home_team_rebounds: number
          home_total_rebounds: number
          home_points_in_paint: number
          home_field_goals_made: number
          home_free_throws_made: number
          home_fast_break_points: number
          home_defensive_rebounds: number
          home_offensive_rebounds: number
          home_points_off_turnovers: number
          home_second_chance_points: number
          home_field_goals_attempted: number
          home_free_throws_attempted: number
          home_three_point_made: number
          home_three_point_attempted: number
          away_dunks: number
          away_fouls: number
          away_blocks: number
          away_points: number
          away_steals: number
          away_assists: number
          away_turnovers: number
          away_team_rebounds: number
          away_total_rebounds: number
          away_points_in_paint: number
          away_field_goals_made: number
          away_free_throws_made: number
          away_fast_break_points: number
          away_defensive_rebounds: number
          away_offensive_rebounds: number
          away_points_off_turnovers: number
          away_second_chance_points: number
          away_field_goals_attempted: number
          away_free_throws_attempted: number
          away_three_point_made: number
          away_three_point_attempted: number
          created_at?: string
        }
        Update: {
          id?: string
          fixture_id?: string
          game_id?: string
          start_date?: string
          home_team_id?: string
          away_team_id?: string
          home_team_display?: string
          away_team_display?: string
          home_total?: number
          home_period_1?: number
          home_period_2?: number
          home_period_3?: number
          home_period_4?: number
          away_total?: number
          away_period_1?: number
          away_period_2?: number
          away_period_3?: number
          away_period_4?: number
          home_dunks?: number
          home_fouls?: number
          home_blocks?: number
          home_points?: number
          home_steals?: number
          home_assists?: number
          home_turnovers?: number
          home_team_rebounds?: number
          home_total_rebounds?: number
          home_points_in_paint?: number
          home_field_goals_made?: number
          home_free_throws_made?: number
          home_fast_break_points?: number
          home_defensive_rebounds?: number
          home_offensive_rebounds?: number
          home_points_off_turnovers?: number
          home_second_chance_points?: number
          home_field_goals_attempted?: number
          home_free_throws_attempted?: number
          home_three_point_made?: number
          home_three_point_attempted?: number
          away_dunks?: number
          away_fouls?: number
          away_blocks?: number
          away_points?: number
          away_steals?: number
          away_assists?: number
          away_turnovers?: number
          away_team_rebounds?: number
          away_total_rebounds?: number
          away_points_in_paint?: number
          away_field_goals_made?: number
          away_free_throws_made?: number
          away_fast_break_points?: number
          away_defensive_rebounds?: number
          away_offensive_rebounds?: number
          away_points_off_turnovers?: number
          away_second_chance_points?: number
          away_field_goals_attempted?: number
          away_free_throws_attempted?: number
          away_three_point_made?: number
          away_three_point_attempted?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

