import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { serverEnv } from "@/lib/env"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Add this line to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic'

async function fetchPage(page: number) {
  // Add end_date parameter to only get games up to today
  const today = new Date().toISOString().split('T')[0];
  
  const response = await fetch(
    `https://api.opticodds.com/api/v3/fixtures?` + 
    `sport=basketball&` +
    `league=nba&` +
    `page=${page}&` +
    `season_year=2024&` +
    `season_type=regular%20season&` +
    `status=completed&` +
    `end_date=${today}&` + // Add this parameter
    `key=${process.env.OPTIC_ODDS_API_KEY}`,
    {
      headers: {
        'key': process.env.OPTIC_ODDS_API_KEY || ''
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch fixtures page ${page}`)
  }

  return response.json()
}

export async function POST(request: Request) {
  // Add authentication for cron jobs
  const apiToken = request.headers.get('api-token');
  
  // For production, you should use a secure comparison method and store this in an environment variable
  if (apiToken !== serverEnv.CRON_API_TOKEN) {
    console.error('Unauthorized access attempt to sync-fixtures-completed');
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    let allFixtures: any[] = []
    let page = 1
    let hasMorePages = true
    let successCount = 0
    let errors: any[] = []

    // Fetch all pages
    while (hasMorePages) {
      const data = await fetchPage(page)
      
      if (!data.data || data.data.length === 0) {
        hasMorePages = false
        break
      }

      allFixtures = [...allFixtures, ...data.data]
      page++
    }

    console.log(`Fetched ${allFixtures.length} completed fixtures`)
    
    // Debug: Log sample fixture
    if (allFixtures.length > 0) {
      console.log('Sample fixture structure:', JSON.stringify(allFixtures[0], null, 2))
    }

    // Debug: Check dates and statuses
    const dateAnalysis = allFixtures.reduce((acc, fixture) => {
      const date = new Date(fixture.start_date)
      const status = fixture.status
      const hasScores = fixture.result?.scores?.home?.total != null
      
      console.log(`Fixture ${fixture.id}:`, {
        date: fixture.start_date,
        status,
        hasScores,
        resultStructure: fixture.result ? Object.keys(fixture.result) : 'no result',
        scoresStructure: fixture.result?.scores ? Object.keys(fixture.result.scores) : 'no scores'
      })

      return {
        ...acc,
        future: acc.future + (date > new Date() ? 1 : 0),
        past: acc.past + (date <= new Date() ? 1 : 0),
        completed: acc.completed + (status === 'completed' ? 1 : 0),
        withScores: acc.withScores + (hasScores ? 1 : 0)
      }
    }, { future: 0, past: 0, completed: 0, withScores: 0 })

    console.log('Date and Status Analysis:', dateAnalysis)

    // Validate and transform fixtures before upserting
    const validFixtures = allFixtures
      .filter(fixture => {
        const gameDate = new Date(fixture.start_date)
        const isInPast = gameDate <= new Date()
        const hasValidResult = fixture.result?.scores?.home?.total != null && 
                             fixture.result?.scores?.away?.total != null;

        if (!hasValidResult) {
          console.warn(`Fixture ${fixture.id} details:`, {
            date: fixture.start_date,
            status: fixture.status,
            resultExists: !!fixture.result,
            scoresExist: !!fixture.result?.scores,
            homeScores: fixture.result?.scores?.home,
            awayScores: fixture.result?.scores?.away
          })
          errors.push({ 
            id: fixture.id, 
            error: 'Missing score totals',
            details: {
              hasResult: !!fixture.result,
              hasScores: !!fixture.result?.scores,
              homeScores: fixture.result?.scores?.home,
              awayScores: fixture.result?.scores?.away
            },
            fixture: fixture
          })
          return false
        }
        return true
      })
      .map((fixture) => ({
        id: fixture.id,
        numerical_id: fixture.numerical_id,
        game_id: fixture.game_id,
        start_date: fixture.start_date,
        home_competitors: fixture.home_competitors,
        away_competitors: fixture.away_competitors,
        home_team_display: fixture.home_team_display,
        away_team_display: fixture.away_team_display,
        status: fixture.status,
        venue_name: fixture.venue_name,
        venue_location: fixture.venue_location,
        broadcast: fixture.broadcast,
        // Use optional chaining and nullish coalescing for all score fields
        home_score_total: fixture.result?.scores?.home?.total ?? 0,
        home_score_q1: fixture.result?.scores?.home?.periods?.period_1 ?? 0,
        home_score_q2: fixture.result?.scores?.home?.periods?.period_2 ?? 0,
        home_score_q3: fixture.result?.scores?.home?.periods?.period_3 ?? 0,
        home_score_q4: fixture.result?.scores?.home?.periods?.period_4 ?? 0,
        away_score_total: fixture.result?.scores?.away?.total ?? 0,
        away_score_q1: fixture.result?.scores?.away?.periods?.period_1 ?? 0,
        away_score_q2: fixture.result?.scores?.away?.periods?.period_2 ?? 0,
        away_score_q3: fixture.result?.scores?.away?.periods?.period_3 ?? 0,
        away_score_q4: fixture.result?.scores?.away?.periods?.period_4 ?? 0,
        result: fixture.result,
        season_type: fixture.season_type,
        season_year: fixture.season_year,
        season_week: fixture.season_week
      }))

    if (validFixtures.length > 0) {
      // Upsert valid fixtures
      const { error } = await supabase
        .from("fixtures_completed")
        .upsert(validFixtures, { onConflict: 'id' })

      if (error) {
        throw error
      }

      successCount = validFixtures.length
    }

    // Update sync_log
    await supabase
      .from("sync_log")
      .insert([{ 
        sync_type: "fixtures_completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        status: "completed",
        records_processed: successCount,
        errors: errors.length > 0 ? errors : null
      }])

    return NextResponse.json({ 
      message: `${successCount} fixtures synced successfully`,
      skipped: errors.length,
      errors: errors.length > 0 ? errors : null,
      count: successCount,
      pages: page - 1
    })
  } catch (error) {
    console.error('Error syncing fixtures:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
} 