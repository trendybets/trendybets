import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Move these to .env.local
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function fetchOdds(fixtureId: string) {
  try {
    console.log(`Fetching odds for fixture ${fixtureId}...`)
    const url = `https://api.opticodds.com/api/v3/fixtures/odds?sportsbook=draftkings&sportsbook=betmgm&sportsbook=caesars&sportsbook=bet365&fixture_id=${fixtureId}&market=moneyline&market=point_spread&market=total_points&is_main=true&key=${process.env.OPTIC_ODDS_API_KEY}`
    
    const response = await fetch(url, {
      headers: {
        'key': process.env.OPTIC_ODDS_API_KEY || ''
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error for fixture ${fixtureId}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      throw new Error(`Failed to fetch odds for fixture ${fixtureId}`)
    }

    const responseData = await response.json()
    const data = responseData.data?.[0]?.odds || []
    
    console.log(`Found ${data.length} odds for fixture ${fixtureId}`)

    // Transform the odds data to match our schema exactly
    const mappedOdds = data
      .filter(odd => odd && typeof odd === 'object')
      .map((odd: any) => ({
        id: odd.id,
        fixture_id: fixtureId,
        sportsbook: odd.sportsbook.toLowerCase(),
        market: odd.market,
        name: odd.name,
        is_main: odd.is_main,
        selection: odd.selection,
        normalized_selection: odd.normalized_selection,
        market_id: odd.market_id,
        selection_line: odd.selection_line || (odd.market_id === 'total_points' ? odd.selection_line : 'ml'),
        player_id: odd.player_id,
        team_id: odd.team_id,
        price: Math.round(odd.price), // Convert to integer
        points: odd.points,
        timestamp: odd.timestamp,
        start_date: null,
        last_synced_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

    console.log(`Mapped ${mappedOdds.length} odds for fixture ${fixtureId}`)
    if (mappedOdds.length > 0) {
      console.log('Sample mapped odd:', mappedOdds[0])
    }
    return mappedOdds
  } catch (error) {
    console.error(`Detailed error fetching odds for fixture ${fixtureId}:`, error)
    throw error
  }
}

export async function POST() {
  try {
    const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
    
    // Clean up old odds
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    console.log("Cleaning up old odds...")
    const { error: deleteError } = await supabase
      .from("odds")
      .delete()
      .lt('created_at', todayStart.toISOString())

    if (deleteError) {
      console.error("Error deleting old odds:", deleteError)
      throw deleteError
    }

    // Get active fixtures
    console.log("Fetching active fixtures...")
    const { data: fixtures, error: fixturesError } = await supabase
      .from("fixtures")
      .select("*")
      .eq('status', 'unplayed')
      .gte('start_date', todayStart.toISOString())

    if (fixturesError) throw fixturesError
    console.log(`Found ${fixtures?.length || 0} active fixtures`)

    let successCount = 0
    const errors: any[] = []
    let totalOddsUpserted = 0

    for (const fixture of fixtures) {
      try {
        console.log(`\nProcessing fixture ${fixture.id}...`)
        const odds = await fetchOdds(fixture.id)
        console.log(`Fetched ${odds.length} odds for fixture ${fixture.id}`)
        
        if (odds.length > 0) {
          // Batch upsert odds with timestamp
          const oddsToUpsert = odds.map(odd => ({
            ...odd,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))

          console.log(`Upserting ${oddsToUpsert.length} odds for fixture ${fixture.id}`)
          console.log('Sample odd to upsert:', oddsToUpsert[0])

          const { error: upsertError, data: upsertedData } = await supabase
            .from("odds")
            .upsert(oddsToUpsert, {
              onConflict: 'id',
              ignoreDuplicates: false
            })
            .select()

          if (upsertError) {
            console.error(`Upsert error for fixture ${fixture.id}:`, upsertError)
            throw upsertError
          }

          console.log(`Successfully upserted ${upsertedData?.length || 0} odds for fixture ${fixture.id}`)
          totalOddsUpserted += upsertedData?.length || 0
          successCount++
        } else {
          console.log(`No odds to upsert for fixture ${fixture.id}`)
        }
      } catch (error) {
        console.error(`Error syncing odds for fixture ${fixture.id}:`, error)
        errors.push({ fixture_id: fixture.id, error })
      }
    }

    // Remove sync log insert
    return NextResponse.json({
      message: `Odds sync completed: ${successCount} fixtures processed, ${totalOddsUpserted} total odds upserted`,
      errors
    })

  } catch (error) {
    console.error("Odds sync error:", error)
    return NextResponse.json({ error: "Odds sync failed" }, { status: 500 })
  }
} 