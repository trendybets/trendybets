import { NextResponse } from "next/server"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { serverEnv } from "@/lib/env"
import axios from 'axios'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Add this line to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic'

// Increase the execution duration to 10 minutes (600 seconds)
export const maxDuration = 600

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

  // Parse request body to check for player_id parameter and limit parameter
  let playerIdToProcess: string | null = null;
  let playerLimit: number | null = null;
  let workerMode: boolean = false;
  let startIndex: number = 0;
  let endIndex: number = 0;
  
  try {
    const body = await request.json();
    playerIdToProcess = body.player_id || null;
    playerLimit = body.limit ? parseInt(body.limit, 10) : null;
    workerMode = body.worker_mode === true;
    startIndex = body.start_index ? parseInt(body.start_index, 10) : 0;
    endIndex = body.end_index ? parseInt(body.end_index, 10) : 0;
  } catch (e) {
    // No body or invalid JSON, continue with full sync
  }

  console.log("API route called", 
    playerIdToProcess ? `for player ${playerIdToProcess}` : 
    workerMode ? `as worker for players ${startIndex}-${endIndex}` :
    playerLimit ? `for up to ${playerLimit} players` : "for all players"
  );
  
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
    
    // If in worker mode, only process the specified range of players
    let playersToProcess = players;
    
    if (workerMode && startIndex >= 0 && endIndex > startIndex && endIndex <= players.length) {
      playersToProcess = players.slice(startIndex, endIndex);
      console.log(`Worker mode: Processing players ${startIndex} to ${endIndex-1} (${playersToProcess.length} players)`);
    } else if (playerLimit && playerLimit > 0 && playerLimit < players.length) {
      // Apply limit if specified
      playersToProcess = players.slice(0, playerLimit);
      console.log(`Found ${players.length} active players, processing ${playersToProcess.length}`);
    } else {
      console.log(`Found ${players.length} active players`);
      
      // If not in worker mode and processing all players, spawn workers instead
      if (!workerMode && playersToProcess.length > 20) {
        console.log("Spawning workers to process players in parallel");
        
        // Create worker batches (20 players per worker)
        const workerSize = 20;
        const workerPromises = [];
        
        for (let i = 0; i < players.length; i += workerSize) {
          const end = Math.min(i + workerSize, players.length);
          console.log(`Creating worker for players ${i} to ${end-1}`);
          
          // Make a request to this same endpoint but in worker mode
          const workerPromise = axios({
            method: 'POST',
            url: request.url,
            headers: {
              'Content-Type': 'application/json',
              'api-token': serverEnv.CRON_API_TOKEN
            },
            data: {
              worker_mode: true,
              start_index: i,
              end_index: end
            }
          }).catch(error => {
            console.error(`Worker for players ${i}-${end-1} failed:`, error.message);
            return { data: { records_processed: 0 } };
          });
          
          workerPromises.push(workerPromise);
        }
        
        console.log(`Waiting for ${workerPromises.length} workers to complete...`);
        const workerResults = await Promise.all(workerPromises);
        
        // Sum up the total records processed by all workers
        const totalProcessedRecords = workerResults.reduce((sum, result) => {
          return sum + (result.data?.records_processed || 0);
        }, 0);
        
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
                workers_used: workerPromises.length,
                last_sync_date: lastSyncDate
              }
            }])
            .select();
        });
        
        return NextResponse.json(
          { 
            message: `Processed ${players.length} players using ${workerPromises.length} workers since ${lastSyncDate}`,
            players_processed: players.length,
            workers_used: workerPromises.length,
            records_processed: totalProcessedRecords
          },
          { status: 200 }
        );
      }
    }
    
    // Process players in batches
    const batchSize = 5; // Process 5 players at a time
    let totalProcessedRecords = 0;
    
    // Create batches of players
    const batches = [];
    for (let i = 0; i < playersToProcess.length; i += batchSize) {
      batches.push(playersToProcess.slice(i, i + batchSize));
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
        console.log(`Waiting 1 second before processing next batch...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Update the sync_log to indicate we've completed the sync process
    await withRetry(async () => {
      return await supabase
        .from("sync_log")
        .insert([{ 
          sync_type: workerMode ? "player_history_worker" : "player_history",
          started_at: syncStartTime,
          completed_at: new Date().toISOString(),
          status: "completed",
          last_sync_date: new Date().toISOString(),
          records_processed: totalProcessedRecords,
          metadata: {
            players_processed: playersToProcess.length,
            worker_range: workerMode ? `${startIndex}-${endIndex}` : undefined,
            last_sync_date: lastSyncDate
          }
        }])
        .select();
    });
    
    return NextResponse.json(
      { 
        message: `Processed ${playersToProcess.length} players for history sync since ${lastSyncDate}`,
        players_processed: playersToProcess.length,
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