import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface Competitor {
  id: string
  name: string
  numerical_id: number
  base_id: number
  abbreviation: string
  logo: string
}

interface Sport {
  id: string
  name: string
  numerical_id: number
}

interface League {
  id: string
  name: string
  numerical_id: number
}

interface APIFixture {
  id: string
  numerical_id: number
  game_id: string
  start_date: string
  home_competitors: Competitor[]
  away_competitors: Competitor[]
  home_team_display: string
  away_team_display: string
  status: string
  is_live: boolean
  sport: Sport
  league: League
  home_starter: string | null
  home_record: string | null
  home_seed: string | null
  home_rotation_number: number | null
  away_starter: string | null
  away_record: string | null
  away_seed: string | null
  away_rotation_number: number | null
  tournament: string | null
  tournament_stage: string | null
  has_odds: boolean
  venue_name: string | null
  venue_location: string | null
  venue_neutral: boolean
  broadcast: string | null
  season_type: string | null
  season_year: string | null
  season_week: string | null
  source_ids: Record<string, any>
}

interface APIResponse {
  data: APIFixture[]
}

export async function POST() {
  console.log("API route called")
  
  try {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // First, verify we can access the table
    const { data: tableCheck, error: tableError } = await supabase
      .from("fixtures")
      .select("id")
      .limit(1)

    if (tableError) {
      console.error("Table check error:", tableError)
      throw new Error(`Failed to access fixtures table: ${tableError.message}`)
    }

    console.log("Table check successful")

    // Get IDs of unplayed fixtures
    const { data: unplayedFixtures, error: fetchError } = await supabase
      .from("fixtures")
      .select("id")
      .eq('status', 'unplayed')

    if (fetchError) {
      console.error("Error fetching unplayed fixtures:", fetchError)
      throw fetchError
    }

    if (unplayedFixtures && unplayedFixtures.length > 0) {
      const fixtureIds = unplayedFixtures.map(f => f.id)

      // First delete related odds
      const { error: oddsDeleteError } = await supabase
        .from("odds")
        .delete()
        .in('fixture_id', fixtureIds)

      if (oddsDeleteError) {
        console.error("Error deleting related odds:", oddsDeleteError)
        throw oddsDeleteError
      }

      // Then delete related player odds
      const { error: playerOddsDeleteError } = await supabase
        .from("player_odds")
        .delete()
        .in('fixture_id', fixtureIds)

      if (playerOddsDeleteError) {
        console.error("Error deleting related player odds:", playerOddsDeleteError)
        throw playerOddsDeleteError
      }

      // Finally delete the fixtures
      const { error: fixturesDeleteError } = await supabase
        .from("fixtures")
        .delete()
        .in('id', fixtureIds)

      if (fixturesDeleteError) {
        console.error("Error deleting fixtures:", fixturesDeleteError)
        throw fixturesDeleteError
      }
    }

    // Fetch new fixtures from API
    const apiUrl = `https://api.opticodds.com/api/v3/fixtures/active?sport=basketball&league=nba&key=${process.env.OPTIC_ODDS_API_KEY}`
    console.log("Fetching from API...")
    
    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    
    const json: APIResponse = await response.json()
    if (!json.data || !Array.isArray(json.data)) {
      throw new Error("Invalid API response format")
    }

    console.log(`Fetched ${json.data.length} fixtures`)
    
    // Map the fixtures to match our schema
    const fixturesToUpsert = json.data.map(fixture => ({
      id: fixture.id,
      game_id: fixture.game_id,
      numerical_id: fixture.numerical_id,
      start_date: fixture.start_date,
      home_team_id: fixture.home_competitors[0]?.id,
      away_team_id: fixture.away_competitors[0]?.id,
      home_team_display: fixture.home_team_display,
      away_team_display: fixture.away_team_display,
      home_record: fixture.home_record || '',
      away_record: fixture.away_record || '',
      venue_name: fixture.venue_name || '',
      venue_location: fixture.venue_location || '',
      broadcast: fixture.broadcast || '',
      status: 'unplayed',
      is_live: fixture.is_live || false,
      created_at: new Date().toISOString()
    }))

    console.log('Sample fixture to upsert:', fixturesToUpsert[0])

    // Upsert new fixtures
    const { data, error } = await supabase
      .from("fixtures")
      .upsert(fixturesToUpsert, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error("Database error:", error)
      throw error
    }

    // Log sync completion
    await supabase
      .from("sync_log")
      .insert([{
        sync_type: 'fixtures',
        success_count: fixturesToUpsert.length,
        error_count: 0,
        completed_at: new Date().toISOString()
      }])

    return NextResponse.json(
      { 
        message: `${fixturesToUpsert.length} fixtures synced successfully`,
        example: data?.[0]
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Sync error:", error)
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    )
  }
} 