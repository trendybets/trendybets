import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
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

  console.log("API route called")
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const syncStartTime = new Date().toISOString()
  
  try {
    // Get all active players
    const { data: players, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("is_active", true)

    if (playerError) throw playerError
    console.log(`Found ${players.length} active players`)

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
    
    let totalHistoryRecords = 0
    const batchSize = 10 // Process 10 players at a time
    
    // Process players in batches
    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize)
      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(players.length / batchSize)}`)
      
      // Process each batch in parallel
      const batchResults = await Promise.all(batch.map(async (player) => {
        try {
          console.log(`Fetching recent history for player ${player.id}...`)
          
          // Add start_date parameter to only get games after last sync
          const apiUrl = `https://api.opticodds.com/api/v3/fixtures/player-results?` + 
            `player_id=${player.id}` +
            `&status=completed` +
            `&start_date=${lastSyncDate}` +
            `&key=${process.env.OPTIC_ODDS_API_KEY}`

          const response = await fetch(apiUrl)
          
          if (!response.ok) {
            console.error(`Failed to fetch history for player ${player.id}: ${response.statusText}`)
            return 0
          }
          
          const json: APIResponse = await response.json()
          
          if (!json.data?.length) {
            console.log(`No new games for player ${player.id} since ${lastSyncDate}`)
            return 0
          }

          let playerHistoryCount = 0

          // Process each new fixture
          for (const fixtureData of json.data) {
            const { fixture, results } = fixtureData
            
            // Skip if the game started before our last sync
            const gameDate = new Date(fixture.start_date)
            const syncDate = new Date(lastSyncDate)
            if (gameDate <= syncDate) {
              console.log(`Skipping game ${fixture.id} as it's before last sync date`)
              continue
            }
            
            const playerResult = results.find(r => r.player.id === player.id)
            if (!playerResult) continue
            
            const allStats = playerResult.stats.find(s => s.period === 'all')
            if (!allStats) continue

            // Check if we already have this record
            const { data: existingRecord } = await supabase
              .from("player_history")
              .select("id")
              .eq("player_id", player.id)
              .eq("fixture_id", fixture.id)
              .maybeSingle()

            if (existingRecord) {
              console.log(`Record already exists for player ${player.id} and fixture ${fixture.id}`)
              continue
            }

            // Provide default values for potentially null fields
            const stats = allStats.stats
            const historyRecord = {
              player_id: player.id,
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
            }

            // Insert the new record
            const { error: insertError } = await supabase
              .from("player_history")
              .insert(historyRecord)

            if (insertError) {
              console.error(`Error inserting history for player ${player.id}:`, insertError)
              continue
            }

            playerHistoryCount++
          }
          
          return playerHistoryCount
        } catch (error) {
          console.error(`Error processing player ${player.id}:`, error)
          return 0
        }
      }))
      
      // Sum up the records processed in this batch
      totalHistoryRecords += batchResults.reduce((sum, count) => sum + count, 0)
    }

    // Update sync_log with correct column names
    await supabase
      .from("sync_log")
      .insert([{ 
        sync_type: "player_history",
        started_at: syncStartTime,
        completed_at: new Date().toISOString(),
        status: "completed",
        last_sync_date: new Date().toISOString(),
        records_processed: totalHistoryRecords,
        metadata: {
          games_processed: totalHistoryRecords,
          players_processed: players.length
        }
      }])
      .select()

    return NextResponse.json(
      { 
        message: `Synced ${totalHistoryRecords} new history records since ${lastSyncDate}`,
      },
      { status: 200 }
    )
  } catch (error) {
    // Add error logging to sync_log
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    
    await supabase
      .from("sync_log")
      .insert([{
        sync_type: "player_history",
        started_at: syncStartTime,
        completed_at: new Date().toISOString(),
        status: "error",
        error: errorMessage,
        records_processed: 0
      }])

    console.error("Sync error:", error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
} 