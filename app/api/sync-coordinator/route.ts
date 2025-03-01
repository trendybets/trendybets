import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { serverEnv } from "@/lib/env"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Add this line to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic'

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
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    // Get all active players
    const { data: players, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("is_active", true)

    if (playerError) throw playerError
    console.log(`Found ${players.length} active players to process`)

    // Process the first 5 players (to avoid timeouts)
    // In a real implementation, you'd track which players have been processed
    // and continue from where you left off
    const playersToProcess = players.slice(0, 5)
    
    // Process each player sequentially
    const results = []
    for (const player of playersToProcess) {
      console.log(`Processing player ${player.id}...`)
      
      try {
        // Call the sync-player-history endpoint for this player
        const response = await fetch(`https://v0-trendy-bets.vercel.app/api/sync-player-history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-token': serverEnv.CRON_API_TOKEN
          },
          body: JSON.stringify({ player_id: player.id })
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to sync player ${player.id}: ${response.statusText}`, errorText)
          results.push({ player_id: player.id, success: false, error: response.statusText })
          continue
        }
        
        const result = await response.json()
        console.log(`Successfully synced player ${player.id}: ${result.message}`)
        results.push({ player_id: player.id, success: true, records: result.records })
      } catch (error) {
        console.error(`Error processing player ${player.id}:`, error)
        results.push({ player_id: player.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }
    
    // Update sync_log
    await supabase
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
      }])

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