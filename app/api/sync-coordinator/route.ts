import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { serverEnv } from "@/lib/env"
import axios from 'axios'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Add this line to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic'

// Define types for player processing results
interface PlayerProcessResult {
  player_id: string;
  success: boolean;
  records?: number;
  error?: string;
}

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

export async function POST(request: Request) {
  // Add authentication for cron jobs
  const apiToken = request.headers.get('api-token');
  
  // For production, you should use a secure comparison method and store this in an environment variable
  if (apiToken !== serverEnv.CRON_API_TOKEN) {
    console.error('Unauthorized access attempt to sync-coordinator');
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
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
    
    // First, verify we can access the table
    console.log("Attempting to access players table...")
    try {
      const { data: tableCheck, error: tableError } = await withRetry(async () => {
        console.log("Executing table check query...")
        const result = await supabase
          .from("players")
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
        throw new Error(`Failed to access players table: ${tableError.message}`)
      }

      console.log("Table check successful", tableCheck)
    } catch (tableAccessError) {
      console.error("Error during table access:", tableAccessError)
      throw new Error(`Table access error: ${tableAccessError instanceof Error ? tableAccessError.message : String(tableAccessError)}`)
    }
    
    // Get all active players
    const { data: players, error: playerError } = await withRetry(async () => {
      return await supabase
        .from("players")
        .select("id")
        .eq("is_active", true);
    });

    if (playerError) throw playerError
    console.log(`Found ${players.length} active players to process`)

    // Process the first 5 players (to avoid timeouts)
    // In a real implementation, you'd track which players have been processed
    // and continue from where you left off
    const playersToProcess = players.slice(0, 5)
    
    // Process each player sequentially
    const results: PlayerProcessResult[] = []
    for (const player of playersToProcess) {
      console.log(`Processing player ${player.id}...`)
      
      try {
        // Call the sync-player-history endpoint for this player
        const response = await withRetry(async () => {
          return await axios({
            method: 'POST',
            url: `${process.env.VERCEL_URL || 'https://v0-trendy-bets.vercel.app'}/api/sync-player-history`,
            headers: {
              'Content-Type': 'application/json',
              'api-token': serverEnv.CRON_API_TOKEN
            },
            data: { player_id: player.id },
            timeout: 30000 // 30 second timeout
          });
        });
        
        console.log(`Successfully synced player ${player.id}: ${response.data.message}`);
        results.push({ player_id: player.id, success: true, records: response.data.records });
      } catch (error) {
        console.error(`Error processing player ${player.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ player_id: player.id, success: false, error: errorMessage });
      }
    }
    
    // Update sync_log
    await withRetry(async () => {
      return await supabase
        .from("sync_log")
        .insert([{ 
          sync_type: "player_history_coordinator",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status: "completed",
          records_processed: results.filter(r => r.success).length,
          metadata: {
            total_players: players.length,
            processed_players: playersToProcess.length,
            results
          }
        }]);
    });

    return NextResponse.json({ 
      message: `Processed ${playersToProcess.length} of ${players.length} players`,
      results,
      remaining_players: players.length - playersToProcess.length
    })
  } catch (error) {
    console.error('Error in sync coordinator:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
} 