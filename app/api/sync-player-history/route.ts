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
    const syncStartTime = new Date().toISOString()
    
    // Declare variables at the function level to make them available in the catch block
    let playerId: string | null = null;
    let lastSyncDate: string | null = null;
    let playerLimit: number | null = null;
    let workerMode = false;
    let startIndex = 0;
    let endIndex = 0;
    
    try {
      // Add authentication for cron jobs
      const apiToken = request.headers.get('api-token');
      
      // For production, you should use a secure comparison method and store this in an environment variable
      if (apiToken && apiToken === serverEnv.CRON_API_TOKEN) {
        console.log('Authenticated cron job request');
      }
      
      // Parse request body
      let body;
      
      try {
        body = await request.json();
        
        // Check for new format
        if (body.playerId) {
          playerId = body.playerId;
          lastSyncDate = body.lastSyncDate;
        } 
        // Check for old format
        else {
          playerId = body.player_id || null;
          playerLimit = body.limit ? parseInt(body.limit, 10) : null;
          workerMode = body.worker_mode === true;
          startIndex = body.start_index ? parseInt(body.start_index, 10) : 0;
          endIndex = body.end_index ? parseInt(body.end_index, 10) : 0;
        }
      } catch (e) {
        // No body or invalid JSON, continue with default values
        console.log('No valid JSON body provided');
      }
      
      console.log("Request parameters:", { 
        playerId, 
        lastSyncDate,
        playerLimit,
        workerMode,
        startIndex,
        endIndex
      });
      
      // Get the last sync date if not provided
      if (!lastSyncDate) {
        const lastSyncInfo = await withServiceRoleClient(async (supabase) => {
          const { data } = await supabase
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
          
          return data;
        });
        
        // Use yesterday's date if no last sync found, otherwise use last sync date
        lastSyncDate = lastSyncInfo?.[0]?.last_sync_date || 
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        console.log(`Last sync was at: ${lastSyncDate}`);
      }
      
      // If we have a specific player ID, process just that player
      if (playerId) {
        console.log(`Processing player ${playerId} since ${lastSyncDate}`);
        
        // Use the connection pool to get a Supabase client and process the player
        const processedGames = await withServiceRoleClient(async (supabase) => {
          // Ensure lastSyncDate is not null before passing to processPlayer
          const syncDate = lastSyncDate || new Date().toISOString().split('T')[0];
          return processPlayer(playerId as string, syncDate, supabase);
        });
        
        console.log(`Player history sync completed for player ${playerId}`);
        
        // Update sync_log for this specific player
        await withServiceRoleClient(async (supabase) => {
          return await supabase
            .from("sync_log")
            .insert([{ 
              sync_type: "player_history_single",
              started_at: syncStartTime,
              completed_at: new Date().toISOString(),
              status: "completed",
              last_sync_date: new Date().toISOString(),
              records_processed: processedGames,
              metadata: {
                player_id: playerId,
                games_processed: processedGames
              }
            }]);
        });
        
        return NextResponse.json({
          success: true,
          player_id: playerId,
          processed_games: processedGames
        });
      }
      
      // If no specific player ID, process all active players
      console.log('No specific player ID provided, processing all active players');
      
      // Get all active players
      const players = await withServiceRoleClient(async (supabase) => {
        const { data } = await supabase
          .from("players")
          .select("id")
          .eq("is_active", true);
        
        return data || [];
      });
      
      if (!players || players.length === 0) {
        return NextResponse.json({ 
          error: "No active players found" 
        }, { status: 404 });
      }
      
      console.log(`Found ${players.length} active players`);
      
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
          
          // Create worker batches (10 players per worker)
          const workerSize = 10;
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
          await withServiceRoleClient(async (supabase) => {
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
              }]);
          });
          
          return NextResponse.json({ 
            message: `Processed ${players.length} players using ${workerPromises.length} workers since ${lastSyncDate}`,
            players_processed: players.length,
            workers_used: workerPromises.length,
            records_processed: totalProcessedRecords
          }, { status: 200 });
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
          batch.map(player => withServiceRoleClient(async (supabase) => {
            // Ensure lastSyncDate is not null before passing to processPlayer
            const syncDate = lastSyncDate || new Date().toISOString().split('T')[0];
            return processPlayer(player.id, syncDate, supabase);
          }))
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
      await withServiceRoleClient(async (supabase) => {
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
          }]);
      });
      
      return NextResponse.json({ 
        message: `Processed ${playersToProcess.length} players for history sync`,
        players_processed: playersToProcess.length,
        records_processed: totalProcessedRecords
      }, { status: 200 });
      
    } catch (error) {
      console.error("Error in player history sync:", error);
      
      // Add error logging to sync_log
      await withServiceRoleClient(async (supabase) => {
        const errorPlayerId = playerId || null;
        return await supabase
          .from("sync_log")
          .insert([{
            sync_type: errorPlayerId ? "player_history_single" : "player_history",
            started_at: syncStartTime,
            completed_at: new Date().toISOString(),
            status: "error",
            error: error instanceof Error ? error.message : String(error),
            records_processed: 0,
            metadata: errorPlayerId ? { player_id: errorPlayerId } : undefined
          }]);
      });
      
      return NextResponse.json({
        error: "Failed to sync player history",
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  }, "player_history_sync");
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
      if (gameDate < syncDate) {
        console.log(`[Player ${playerId}] Skipping fixture ${fixture.id} (${fixture.start_date}) - before last sync`);
        continue;
      }
      
      // Find the player's result in this fixture
      const playerResult = results.find(r => r.player.id === playerId);
      
      if (!playerResult) {
        console.log(`[Player ${playerId}] No results found for player in fixture ${fixture.id}`);
        continue;
      }
      
      console.log(`[Player ${playerId}] Processing fixture ${fixture.id} (${fixture.start_date})`);
      
      // Extract the player's stats from each period
      for (const period of playerResult.stats) {
        // Skip if this is not a full game period
        if (period.period !== 'game') continue;
        
        const stats = period.stats;
        
        // Insert the player history record
        const { data: historyData, error: historyError } = await supabase
          .from('player_history')
          .upsert({
            player_id: playerId,
            fixture_id: fixture.id,
            game_date: fixture.start_date,
            team_id: playerResult.team.id,
            team_name: playerResult.team.name,
            is_starter: playerResult.is_starter,
            minutes: stats.minutes,
            seconds: stats.seconds,
            points: stats.points,
            assists: stats.assists,
            rebounds: stats.total_rebounds,
            offensive_rebounds: stats.offensive_rebounds,
            defensive_rebounds: stats.defensive_rebounds,
            steals: stats.steals,
            blocks: stats.blocks,
            turnovers: stats.turnovers,
            fouls: stats.fouls,
            plus_minus: stats.plus_minus,
            field_goals_made: stats.field_goals_made,
            field_goals_attempted: stats.field_goals_attempted,
            three_point_field_goals_made: stats.three_point_field_goals_made,
            three_point_field_goals_attempted: stats.three_point_field_goals_attempted,
            free_throws_made: stats.free_throws_made,
            free_throws_attempted: stats.free_throws_attempted,
            first_basket: stats.first_basket,
            first_team_basket: stats.first_team_basket,
            first_basket_including_ft: stats.first_basket_including_ft,
            first_team_basket_including_ft: stats.first_team_basket_including_ft,
            technical_fouls: stats.technical_fouls,
            flagrant_fouls: stats.flagrant_fouls,
            blocks_received: stats.blocks_received,
            points_off_turnovers: stats.points_off_turnovers,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'player_id,fixture_id'
          })
          .select();
        
        if (historyError) {
          console.error(`[Player ${playerId}] Error inserting history for fixture ${fixture.id}:`, historyError);
          continue;
        }
        
        playerHistoryCount++;
        console.log(`[Player ${playerId}] Inserted history for fixture ${fixture.id}`);
      }
    }
    
    console.log(`[Player ${playerId}] Processed ${playerHistoryCount} new history records`);
    return playerHistoryCount;
  } catch (error) {
    console.error(`[Player ${playerId}] Error processing player:`, error);
    throw error;
  }
} 