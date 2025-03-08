import { NextResponse } from "next/server"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { serverEnv } from "@/lib/env"
import axios from 'axios'
import { withServiceRoleClient, withRetry, withPerformanceLogging } from "@/lib/db/supabase-client"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Add this line to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic'

// Increase the execution duration to 5 minutes (300 seconds)
export const maxDuration = 300

interface Stats {
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
}

interface StatPeriod {
  period: string
  stats: Stats
}

interface PlayerResult {
  player: {
    id: string
    name: string
    position: string
    number: number
    numerical_id: number
    base_id: number
  }
  team: {
    id: string
    name: string
    numerical_id: number
    base_id: number
  }
  status: string
  stats: StatPeriod[]
  is_starter: boolean
}

interface Fixture {
  id: string
  numerical_id: number
  game_id: string
  start_date: string
  status: string
  is_live: boolean
}

interface FixtureData {
  fixture: Fixture
  results: PlayerResult[]
}

interface APIResponse {
  data: FixtureData[]
}

export async function POST(request: Request) {
  return withPerformanceLogging(async () => {
    console.log("Starting player history sync...")
    
    try {
      // Parse request body
      const body = await request.json()
      const { playerId, lastSyncDate } = body
      
      if (!playerId) {
        return NextResponse.json({ error: "Player ID is required" }, { status: 400 })
      }
      
      // Use the connection pool to get a Supabase client and process the player
      const processedGames = await withServiceRoleClient(async (supabase) => {
        return processPlayer(playerId, lastSyncDate, supabase)
      })
      
      console.log(`Player history sync completed for player ${playerId}`)
      
      return NextResponse.json({
        success: true,
        player_id: playerId,
        processed_games: processedGames
      })
    } catch (error) {
      console.error("Error in player history sync:", error)
      
      return NextResponse.json({
        error: "Failed to sync player history",
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }
  }, "player_history_sync")
}

// Helper function to process a single player
async function processPlayer(
  playerId: string, 
  lastSyncDate: string, 
  supabase: SupabaseClient<Database>
): Promise<number> {
  try {
    console.log(`[Player ${playerId}] Starting processing since ${lastSyncDate}...`);
    
    // Format the date for the API request (YYYY-MM-DD)
    const formattedDate = new Date(lastSyncDate).toISOString().split('T')[0];
    
    // Add start_date parameter to only get games after last sync
    const apiUrl = `https://api.opticodds.com/api/v3/fixtures/player-results`;
    
    console.log(`[Player ${playerId}] Fetching from API URL: ${apiUrl}`);
    
    const response = await withRetry(async () => {
      try {
        console.log(`[Player ${playerId}] Making API request with params: player_id=${playerId}, status=completed, start_date=${formattedDate}`);
        const res = await axios({
          method: 'GET',
          url: apiUrl,
          params: {
            player_id: playerId,
            status: 'completed',
            start_date: formattedDate, // Use the formatted date
            key: serverEnv.OPTIC_ODDS_API_KEY
          },
          headers: {
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive'
          },
          timeout: 15000, // 15 second timeout
          // Force IPv4
          family: 4
        });
        
        if (res.status !== 200) {
          console.error(`[Player ${playerId}] API request failed: ${res.status} ${res.statusText}`);
          throw new Error(`API request failed: ${res.status} ${res.statusText}`);
        }
        
        return res;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(`[Player ${playerId}] Axios error:`, {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          });
        }
        throw error;
      }
    });
    
    const json: APIResponse = response.data;
    
    if (!json.data?.length) {
      console.log(`[Player ${playerId}] No new games since ${lastSyncDate}`);
      return 0;
    }

    console.log(`[Player ${playerId}] Found ${json.data.length} fixtures to process`);
    let playerHistoryCount = 0;
    const syncDate = new Date(lastSyncDate);
    
    // Process each new fixture
    for (const fixtureData of json.data) {
      const { fixture, results } = fixtureData;
      
      // Skip if the game started before our last sync
      const gameDate = new Date(fixture.start_date);
      if (gameDate <= syncDate) {
        console.log(`[Player ${playerId}] Skipping game ${fixture.id} as it's before last sync date`);
        continue;
      }
      
      const playerResult = results.find(r => r.player.id === playerId);
      if (!playerResult) {
        console.log(`[Player ${playerId}] No player result found for fixture ${fixture.id}`);
        continue;
      }
      
      const allStats = playerResult.stats.find(s => s.period === 'all');
      if (!allStats) {
        console.log(`[Player ${playerId}] No 'all' period stats found for fixture ${fixture.id}`);
        continue;
      }

      // Check if we already have this record - use a more efficient query
      const { data: existingRecords, error: checkError } = await withRetry(async () => {
        return await supabase
          .from("player_history")
          .select("id")
          .eq("player_id", playerId)
          .eq("fixture_id", fixture.id);
      });

      if (checkError) {
        console.error(`[Player ${playerId}] Error checking for existing record:`, checkError);
        continue;
      }

      if (existingRecords && existingRecords.length > 0) {
        console.log(`[Player ${playerId}] Record already exists for fixture ${fixture.id}`);
        continue;
      }

      // Provide default values for potentially null fields
      const stats = allStats.stats;
      const historyRecord = {
        player_id: playerId,
        fixture_id: fixture.id,
        game_id: fixture.game_id,
        start_date: fixture.start_date,
        fouls: stats.fouls ?? 0,
        blocks: stats.blocks ?? 0,
        points: stats.points ?? 0,
        steals: stats.steals ?? 0,
        assists: stats.assists ?? 0,
        minutes: stats.minutes ?? 0,
        seconds: stats.seconds ?? 0,
        turnovers: stats.turnovers ?? 0,
        plus_minus: stats.plus_minus ?? 0,
        first_basket: stats.first_basket ?? 0,
        flagrant_fouls: stats.flagrant_fouls ?? 0,
        total_rebounds: stats.total_rebounds ?? 0,
        blocks_received: stats.blocks_received ?? 0,
        technical_fouls: stats.technical_fouls ?? 0,
        field_goals_made: stats.field_goals_made ?? 0,
        free_throws_made: stats.free_throws_made ?? 0,
        first_team_basket: stats.first_team_basket ?? 0,
        defensive_rebounds: stats.defensive_rebounds ?? 0,
        offensive_rebounds: stats.offensive_rebounds ?? 0,
        points_off_turnovers: stats.points_off_turnovers ?? 0,
        field_goals_attempted: stats.field_goals_attempted ?? 0,
        free_throws_attempted: stats.free_throws_attempted ?? 0,
        first_basket_including_ft: stats.first_basket_including_ft ?? 0,
        two_point_field_goals_made: stats.two_point_field_goals_made ?? 0,
        three_point_field_goals_made: stats.three_point_field_goals_made ?? 0,
        first_team_basket_including_ft: stats.first_team_basket_including_ft ?? 0,
        two_point_field_goals_attempted: stats.two_point_field_goals_attempted ?? 0,
        three_point_field_goals_attempted: stats.three_point_field_goals_attempted ?? 0,
        created_at: new Date().toISOString()
      };

      // Insert the new record
      const { error: insertError } = await withRetry(async () => {
        return await supabase
          .from("player_history")
          .insert(historyRecord);
      });

      if (insertError) {
        console.error(`[Player ${playerId}] Error inserting history for fixture ${fixture.id}:`, insertError);
        continue;
      }

      playerHistoryCount++;
      console.log(`[Player ${playerId}] Added new history record for fixture ${fixture.id}`);
    }
    
    console.log(`[Player ${playerId}] Completed sync: ${playerHistoryCount} new records`);
    return playerHistoryCount;
  } catch (error) {
    console.error(`[Player ${playerId}] Error processing:`, error);
    return 0;
  }
} 