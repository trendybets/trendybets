import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Define constants for environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Define the fetchPlayerProps function if it doesn't exist elsewhere
async function fetchPlayerProps(fixtureId: string) {
  // This is a placeholder implementation
  // You should implement the actual API call to fetch player props
  console.log(`Fetching player props for fixture ${fixtureId}...`)
  return [] // Return empty array for now
}

export async function POST() {
  try {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    // Clean up old odds
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    await supabase
      .from("player_odds")
      .delete()
      .lt('created_at', todayStart.toISOString())

    // Get active fixtures
    const { data: fixtures, error: fixturesError } = await supabase
      .from("fixtures")
      .select("*")
      .eq('status', 'unplayed')
      .gte('start_date', todayStart.toISOString())

    if (fixturesError) throw fixturesError

    let successCount = 0
    const errors: any[] = []

    for (const fixture of fixtures) {
      try {
        const props = await fetchPlayerProps(fixture.id)
        
        // Batch upsert props with timestamp
        const propsToUpsert = props.map((prop: Record<string, any>) => ({
          ...prop,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        const { error: upsertError } = await supabase
          .from("player_odds")
          .upsert(propsToUpsert, {
            onConflict: 'fixture_id,player_id,market_id,sportsbook',
            ignoreDuplicates: false
          })

        if (upsertError) throw upsertError
        successCount++
      } catch (error) {
        console.error(`Error syncing props for fixture ${fixture.id}:`, error)
        errors.push({ fixture_id: fixture.id, error })
      }
    }

    // Log sync completion
    await supabase
      .from("sync_log")
      .insert([{
        sync_type: 'player_odds',
        success_count: successCount,
        error_count: errors.length,
        errors: errors,
        completed_at: new Date().toISOString()
      }])

    return NextResponse.json({
      message: `Props sync completed: ${successCount} fixtures processed`,
      errors
    })

  } catch (error) {
    console.error("Props sync error:", error)
    return NextResponse.json({ error: "Props sync failed" }, { status: 500 })
  }
} 