import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function fetchFixtureResults(fixtureId: string) {
  const response = await fetch(
    `https://api.opticodds.com/api/v3/fixtures/results?fixture_id=${fixtureId}&key=${process.env.OPTIC_ODDS_API_KEY}`,
    {
      headers: {
        'key': process.env.OPTIC_ODDS_API_KEY || ''
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch results for fixture ${fixtureId}`)
  }

  return response.json()
}

export async function POST() {
  try {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    // Get current date in UTC
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    // First, clean up old fixture results
    const { error: cleanupError } = await supabase
      .from("fixture_results")
      .delete()
      .lt('created_at', todayStart.toISOString())

    if (cleanupError) {
      console.error("Error cleaning up old fixture results:", cleanupError)
    }

    // Get unprocessed fixtures
    const { data: fixtures, error: fixturesError } = await supabase
      .from("fixtures")
      .select("*")
      .eq('status', 'unplayed')
      .gte('start_date', todayStart.toISOString())

    if (fixturesError) {
      throw fixturesError
    }

    let successCount = 0
    const errors: Array<{ fixture_id: string; error: any }> = []

    for (const fixture of fixtures) {
      try {
        const data = await fetchFixtureResults(fixture.id)
        
        const resultRecord = {
          id: `${data.fixture.id}_results`,
          fixture_id: fixture.id,
          created_at: new Date().toISOString(),
          game_id: data.fixture.game_id,
          start_date: data.fixture.start_date,
          home_team_id: data.fixture.home_competitors[0].id,
          away_team_id: data.fixture.away_competitors[0].id,
          home_team_display: data.fixture.home_team_display,
          away_team_display: data.fixture.away_team_display,
          // Scores
          home_total: data.scores.home.total,
          home_period_1: data.scores.home.periods.period_1,
          home_period_2: data.scores.home.periods.period_2,
          home_period_3: data.scores.home.periods.period_3,
          home_period_4: data.scores.home.periods.period_4,
          away_total: data.scores.away.total,
          away_period_1: data.scores.away.periods.period_1,
          away_period_2: data.scores.away.periods.period_2,
          away_period_3: data.scores.away.periods.period_3,
          away_period_4: data.scores.away.periods.period_4,
          // Home Stats
          home_dunks: data.stats.home[0].stats.dunks,
          home_fouls: data.stats.home[0].stats.fouls,
          home_blocks: data.stats.home[0].stats.blocks,
          home_points: data.stats.home[0].stats.points,
          home_steals: data.stats.home[0].stats.steals,
          home_assists: data.stats.home[0].stats.assists,
          home_turnovers: data.stats.home[0].stats.turnovers,
          home_team_rebounds: data.stats.home[0].stats.team_rebounds,
          home_total_rebounds: data.stats.home[0].stats.total_rebounds,
          home_points_in_paint: data.stats.home[0].stats.points_in_paint,
          home_field_goals_made: data.stats.home[0].stats.field_goals_made,
          home_free_throws_made: data.stats.home[0].stats.free_throws_made,
          home_fast_break_points: data.stats.home[0].stats.fast_break_points,
          home_defensive_rebounds: data.stats.home[0].stats.defensive_rebounds,
          home_offensive_rebounds: data.stats.home[0].stats.offensive_rebounds,
          home_points_off_turnovers: data.stats.home[0].stats.points_off_turnovers,
          home_second_chance_points: data.stats.home[0].stats.second_chance_points,
          home_field_goals_attempted: data.stats.home[0].stats.field_goals_attempted,
          home_free_throws_attempted: data.stats.home[0].stats.free_throws_attempted,
          home_three_point_made: data.stats.home[0].stats.three_point_field_goals_made,
          home_three_point_attempted: data.stats.home[0].stats.three_point_field_goals_attempted,
          // Away Stats
          away_dunks: data.stats.away[0].stats.dunks,
          away_fouls: data.stats.away[0].stats.fouls,
          away_blocks: data.stats.away[0].stats.blocks,
          away_points: data.stats.away[0].stats.points,
          away_steals: data.stats.away[0].stats.steals,
          away_assists: data.stats.away[0].stats.assists,
          away_turnovers: data.stats.away[0].stats.turnovers,
          away_team_rebounds: data.stats.away[0].stats.team_rebounds,
          away_total_rebounds: data.stats.away[0].stats.total_rebounds,
          away_points_in_paint: data.stats.away[0].stats.points_in_paint,
          away_field_goals_made: data.stats.away[0].stats.field_goals_made,
          away_free_throws_made: data.stats.away[0].stats.free_throws_made,
          away_fast_break_points: data.stats.away[0].stats.fast_break_points,
          away_defensive_rebounds: data.stats.away[0].stats.defensive_rebounds,
          away_offensive_rebounds: data.stats.away[0].stats.offensive_rebounds,
          away_points_off_turnovers: data.stats.away[0].stats.points_off_turnovers,
          away_second_chance_points: data.stats.away[0].stats.second_chance_points,
          away_field_goals_attempted: data.stats.away[0].stats.field_goals_attempted,
          away_free_throws_attempted: data.stats.away[0].stats.free_throws_attempted,
          away_three_point_made: data.stats.away[0].stats.three_point_field_goals_made,
          away_three_point_attempted: data.stats.away[0].stats.three_point_field_goals_attempted
        }

        // Use upsert with onConflict to ensure fresh data
        const { error: upsertError } = await supabase
          .from("fixture_results")
          .upsert(resultRecord, {
            onConflict: 'fixture_id',
            ignoreDuplicates: false // This ensures we update existing records
          })

        if (upsertError) {
          throw upsertError
        }

        // Update fixture status if needed
        if (data.status === 'completed') {
          await supabase
            .from("fixtures")
            .update({ status: 'completed' })
            .eq('id', fixture.id)
        }

        successCount++
      } catch (error) {
        console.error(`Error processing fixture ${fixture.id}:`, error)
        errors.push({ fixture_id: fixture.id, error })
      }
    }

    // Log sync completion
    await supabase
      .from("sync_log")
      .insert([{
        sync_type: 'fixture_results',
        success_count: successCount,
        error_count: errors.length,
        errors: errors,
        completed_at: new Date().toISOString()
      }])

    return NextResponse.json({
      message: `Sync completed: ${successCount} fixtures processed, ${errors.length} errors`,
      errors: errors
    })

  } catch (error) {
    console.error("Sync error:", error)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
} 