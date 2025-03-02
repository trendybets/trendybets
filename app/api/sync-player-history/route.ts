import { NextResponse } from "next/server"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { serverEnv } from "@/lib/env"
import axios from 'axios'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Add this line to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic'

// Helper function to retry failed operations
async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;
    console.log(`Operation failed, retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(operation, retries - 1, delay * 1.5);
  }
}

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
  
  // Log environment variables (without revealing full values)
  console.log("Environment check:", {
    SUPABASE_URL_set: !!SUPABASE_URL,
    SUPABASE_SERVICE_KEY_set: !!SUPABASE_SERVICE_KEY,
    SUPABASE_URL_length: SUPABASE_URL?.length,
    SUPABASE_SERVICE_KEY_length: SUPABASE_SERVICE_KEY?.length,
    NODE_OPTIONS: process.env.NODE_OPTIONS || 'not set'
  })
  
  // Create Supabase client with improved fetch implementation
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    // Add custom fetch implementation with DNS resolution options
    global: {
      fetch: (url, options) => {
        // Log the URL (with API key redacted)
        console.log(`Fetching URL: ${url.toString().replace(/apikey=[^&]+/, 'apikey=REDACTED')}`);
        
        // Parse the URL to get the query parameters
        const urlObj = new URL(url.toString());
        const apiKey = urlObj.searchParams.get('apikey') || SUPABASE_SERVICE_KEY;
        
        // Create new headers with the API key
        const newHeaders = new Headers(options?.headers || {});
        
        // Ensure API key is in headers
        if (!newHeaders.has('apikey')) {
          newHeaders.set('apikey', apiKey);
        }
        
        // Always set the Authorization header with the API key
        if (!newHeaders.has('Authorization')) {
          newHeaders.set('Authorization', `Bearer ${apiKey}`);
        }
        
        // Add additional headers for better connectivity
        newHeaders.set('Accept-Encoding', 'gzip, deflate');
        newHeaders.set('Connection', 'keep-alive');
        
        // Return the fetch with updated headers
        return fetch(url, {
          ...options,
          headers: newHeaders
        });
      }
    }
  })
  
  const syncStartTime = new Date().toISOString()
  
  try {
    // First, verify we can access the table
    console.log("Attempting to access player_history table...")
    try {
      const { data: tableCheck, error: tableError } = await withRetry(async () => {
        console.log("Executing table check query...")
        const result = await supabase
          .from("player_history")
          .select("id")
          .limit(1);
        
        console.log("Table check query completed", {
          hasData: !!result.data,
          dataLength: result.data?.length,
          hasError: !!result.error
        });
        
        return result;
      });

      if (tableError) {
        console.error("Table check error:", tableError)
        throw new Error(`Failed to access player_history table: ${tableError.message}`)
      }

      console.log("Table check successful", tableCheck)
    } catch (tableAccessError) {
      console.error("Error during table access:", tableAccessError)
      throw new Error(`Table access error: ${tableAccessError instanceof Error ? tableAccessError.message : String(tableAccessError)}`)
    }
    
    // Get the last sync timestamp with correct column names
    const { data: lastSync } = await withRetry(async () => {
      return await supabase
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
        .limit(1);
    });

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
      await withRetry(async () => {
        return await supabase
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
      });
        
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
    const { data: players, error: playerError } = await withRetry(async () => {
      return await supabase
        .from("players")
        .select("id")
        .eq("is_active", true);
    });

    if (playerError) throw playerError;
    console.log(`Found ${players.length} active players`);
    
    // Process all players in batches
    const batchSize = 10; // Process 10 players at a time
    let totalProcessedRecords = 0;
    
    // Create batches of players
    const batches = [];
    for (let i = 0; i < players.length; i += batchSize) {
      batches.push(players.slice(i, i + batchSize));
    }
    
    console.log(`Created ${batches.length} batches of players to process`);
    
    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} players`);
      
      // Process players in parallel within each batch
      const batchResults = await Promise.all(
        batch.map(player => processPlayer(player.id, lastSyncDate, supabase))
      );
      
      // Sum up the total records processed in this batch
      const batchTotal = batchResults.reduce((sum, count) => sum + count, 0);
      totalProcessedRecords += batchTotal;
      
      console.log(`Batch ${batchIndex + 1} complete: processed ${batchTotal} records`);
      
      // Add a small delay between batches to avoid rate limiting
      if (batchIndex < batches.length - 1) {
        console.log(`Waiting 2 seconds before processing next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Update the sync_log to indicate we've completed the sync process
    await withRetry(async () => {
      return await supabase
        .from("sync_log")
        .insert([{ 
          sync_type: "player_history",
          started_at: syncStartTime,
          completed_at: new Date().toISOString(),
          status: "completed",
          last_sync_date: new Date().toISOString(),
          records_processed: totalProcessedRecords,
          metadata: {
            players_processed: players.length,
            last_sync_date: lastSyncDate
          }
        }])
        .select();
    });
    
    return NextResponse.json(
      { 
        message: `Processed ${players.length} players for history sync since ${lastSyncDate}`,
        players_processed: players.length,
        records_processed: totalProcessedRecords
      },
      { status: 200 }
    );
  } catch (error) {
    // Add error logging to sync_log
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    await withRetry(async () => {
      return await supabase
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
    });

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
    const apiUrl = `https://api.opticodds.com/api/v3/fixtures/player-results`;
    
    console.log(`Fetching from API URL with axios: ${apiUrl}`);
    console.log(`Using API key: ${serverEnv.OPTIC_ODDS_API_KEY ? 'API key is set' : 'API key is missing'}`);
    
    const response = await withRetry(async () => {
      const res = await axios({
        method: 'GET',
        url: apiUrl,
        params: {
          player_id: playerId,
          status: 'completed',
          start_date: lastSyncDate,
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
        console.error(`API request failed: ${res.status} ${res.statusText}`);
        throw new Error(`API request failed: ${res.status} ${res.statusText}`);
      }
      
      return res;
    });
    
    const json: APIResponse = response.data;
    
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
      const { data: existingRecord } = await withRetry(async () => {
        return await supabase
          .from("player_history")
          .select("id")
          .eq("player_id", playerId)
          .eq("fixture_id", fixture.id)
          .maybeSingle();
      });

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
      const { error: insertError } = await withRetry(async () => {
        return await supabase
          .from("player_history")
          .insert(historyRecord);
      });

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