import { NextResponse } from "next/server"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { serverEnv } from "@/lib/env"

const SUPABASE_URL = 'https://hvegilvwwvdmivnphlyo.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWdpbHZ3d3ZkbWl2bnBobHlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTY1NjgxNCwiZXhwIjoyMDU1MjMyODE0fQ.6GV2B4ciNiMGOnnRXOMznwD1aNqYUQmHxuuWrdc3U44'

// Add this line to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic'

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
  // Add authentication for cron jobs
  const apiToken = request.headers.get('api-token');
  
  // For production, you should use a secure comparison method and store this in an environment variable
  if (apiToken !== serverEnv.CRON_API_TOKEN) {
    console.error('Unauthorized access attempt to sync-player-history');
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse request body to check for player_id parameter
  let playerIdToProcess: string | null = null;
  try {
    const body = await request.json();
    playerIdToProcess = body.player_id || null;
  } catch (e) {
    // No body or invalid JSON, continue with full sync
  }

  console.log("API route called", playerIdToProcess ? `for player ${playerIdToProcess}` : "for all players");
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const syncStartTime = new Date().toISOString()
  
  try {
    // Get the last sync timestamp with correct column names
    const { data: lastSync } = await supabase
      .from("sync_log")
      .select(`
        id,
        sync_type,
        started_at,
        completed_at,
        status,
        last_sync_date,
        records_processed
      `)
      .eq("sync_type", "player_history")
      .eq("status", "completed")
      .order("last_sync_date", { ascending: false })
      .limit(1)

    // Use yesterday's date if no last sync found, otherwise use last sync date
    const lastSyncDate = lastSync?.[0]?.last_sync_date || 
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    console.log(`Last sync was at: ${lastSyncDate}`)
    
    let totalHistoryRecords = 0;
    
    // If a specific player ID is provided, only process that player
    if (playerIdToProcess) {
      console.log(`Processing single player: ${playerIdToProcess}`);
      const playerHistoryCount = await processPlayer(playerIdToProcess, lastSyncDate, supabase);
      totalHistoryRecords = playerHistoryCount;
      
      // Update sync_log for this specific player
      await supabase
        .from("sync_log")
        .insert([{ 
          sync_type: "player_history_single",
          started_at: syncStartTime,
          completed_at: new Date().toISOString(),
          status: "completed",
          last_sync_date: new Date().toISOString(),
          records_processed: totalHistoryRecords,
          metadata: {
            player_id: playerIdToProcess,
            games_processed: totalHistoryRecords
          }
        }])
        .select();
        
      return NextResponse.json(
        { 
          message: `Synced ${totalHistoryRecords} new history records for player ${playerIdToProcess} since ${lastSyncDate}`,
          player_id: playerIdToProcess,
          records: totalHistoryRecords
        },
        { status: 200 }
      );
    }
    
    // Otherwise, get all active players and queue them for processing
    const { data: players, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("is_active", true);

    if (playerError) throw playerError;
    console.log(`Found ${players.length} active players`);
    
    // Instead of processing all players, just return the list of players to process
    // and update the sync_log to indicate we've started the sync process
    await supabase
      .from("sync_log")
      .insert([{ 
        sync_type: "player_history_coordinator",
        started_at: syncStartTime,
        completed_at: new Date().toISOString(),
        status: "completed",
        last_sync_date: new Date().toISOString(),
        records_processed: 0,
        metadata: {
          players_to_process: players.length,
          last_sync_date: lastSyncDate
        }
      }])
      .select();
    
    return NextResponse.json(
      { 
        message: `Queued ${players.length} players for history sync since ${lastSyncDate}`,
        players: players.map(p => p.id)
      },
      { status: 200 }
    );
  } catch (error) {
    // Add error logging to sync_log
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    await supabase
      .from("sync_log")
      .insert([{
        sync_type: playerIdToProcess ? "player_history_single" : "player_history",
        started_at: syncStartTime,
        completed_at: new Date().toISOString(),
        status: "error",
        error: errorMessage,
        records_processed: 0,
        metadata: playerIdToProcess ? { player_id: playerIdToProcess } : undefined
      }]);

    console.error("Sync error:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Helper function to process a single player
async function processPlayer(
  playerId: string, 
  lastSyncDate: string, 
  supabase: SupabaseClient<Database>
): Promise<number> {
  try {
    console.log(`Fetching recent history for player ${playerId} since ${lastSyncDate}...`);
    
    // Add start_date parameter to only get games after last sync
    const apiUrl = `https://api.opticodds.com/api/v3/fixtures/player-results?` + 
      `player_id=${playerId}` +
      `&status=completed` +
      `&start_date=${lastSyncDate}` +
      `&key=${process.env.OPTIC_ODDS_API_KEY}`;

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch history for player ${playerId}: ${response.statusText}`);
      return 0;
    }
    
    const json = await response.json() as APIResponse;
    
    if (!json.data?.length) {
      console.log(`No new games for player ${playerId} since ${lastSyncDate}`);
      return 0;
    }

    let playerHistoryCount = 0;

    // Process each new fixture
    for (const fixtureData of json.data) {
      const { fixture, results } = fixtureData;
      
      // Skip if the game started before our last sync
      const gameDate = new Date(fixture.start_date);
      const syncDate = new Date(lastSyncDate);
      if (gameDate <= syncDate) {
        console.log(`Skipping game ${fixture.id} as it's before last sync date`);
        continue;
      }
      
      const playerResult = results.find(r => r.player.id === playerId);
      if (!playerResult) continue;
      
      const allStats = playerResult.stats.find(s => s.period === 'all');
      if (!allStats) continue;

      // Check if we already have this record
      const { data: existingRecord } = await supabase
        .from("player_history")
        .select("id")
        .eq("player_id", playerId)
        .eq("fixture_id", fixture.id)
        .maybeSingle();

      if (existingRecord) {
        console.log(`Record already exists for player ${playerId} and fixture ${fixture.id}`);
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
      const { error: insertError } = await supabase
        .from("player_history")
        .insert(historyRecord);

      if (insertError) {
        console.error(`Error inserting history for player ${playerId}:`, insertError);
        continue;
      }

      playerHistoryCount++;
      console.log(`Added new history record for player ${playerId}, fixture ${fixture.id}`);
    }
    
    console.log(`Completed sync for player ${playerId}: ${playerHistoryCount} new records`);
    return playerHistoryCount;
  } catch (error) {
    console.error(`Error processing player ${playerId}:`, error);
    return 0;
  }
} 