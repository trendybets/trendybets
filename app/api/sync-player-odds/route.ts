import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { serverEnv } from "@/lib/env"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabase = createClient<Database>(SUPABASE_URL, serverEnv.SUPABASE_SERVICE_KEY)

// Add cache with 30-second TTL
const cache = new Map<string, { data: any, timestamp: number }>()
const CACHE_TTL = 30 * 1000 // 30 seconds
const BATCH_SIZE = 5 // Process 5 fixtures at a time

interface OpticOddsData {
  id: string
  odds: Array<{
    id: string
    sportsbook: string
    market: string
    name: string
    is_main: boolean
    selection: string
    normalized_selection: string
    market_id: string
    selection_line: string
    player_id: string
    team_id: string | null
    price: number
    points: number
    timestamp: number
  }>
}

async function fetchFixtureOdds(fixtureIds: string[]) {
  const cacheKey = fixtureIds.sort().join(',')
  const now = Date.now()
  
  // Check cache
  const cached = cache.get(cacheKey)
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    console.log('Cache hit for fixtures:', fixtureIds)
    return cached.data
  }

  // Fetch fresh data
  const response = await fetch(
    `https://api.opticodds.com/api/v3/fixtures/odds?` +
    fixtureIds.map(id => `fixture_id=${id}`).join('&') +
    `&sportsbook=draftkings` +
    `&market=player_points` +
    `&market=player_rebounds` +
    `&market=player_assists` +
    `&is_main=true` +
    `&key=${serverEnv.OPTIC_ODDS_API_KEY}`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch odds: ${response.statusText}`)
  }

  const data = await response.json()
  
  // Update cache
  cache.set(cacheKey, { data: data.data, timestamp: now })
  
  return data.data
}

export async function POST() {
  try {
    // First get all players with their team_ids
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, team_id')

    if (playersError) {
      console.error('Error fetching players:', playersError)
      throw playersError
    }

    // Create a lookup map for player -> team_id
    const playerTeamMap = players?.reduce((acc, player) => {
      acc[player.id] = player.team_id
      return acc
    }, {} as Record<string, string>) || {}

    const { data: fixtures, error: fixturesError } = await supabase
      .from("fixtures")
      .select("id, start_date")
      .order("start_date", { ascending: true })

    if (fixturesError) throw fixturesError
    console.log(`Found ${fixtures.length} fixtures to process`)

    // Process fixtures in batches
    const allPlayerOdds = []
    for (let i = 0; i < fixtures.length; i += BATCH_SIZE) {
      const batch = fixtures.slice(i, i + BATCH_SIZE)
      console.log(`Processing batch ${i / BATCH_SIZE + 1}...`)
      
      try {
        const fixtureOddsData = await fetchFixtureOdds(batch.map(f => f.id))
        
        // Process each fixture's odds
        for (let j = 0; j < fixtureOddsData.length; j++) {
          const fixtureData = fixtureOddsData[j]
          const fixture = batch[j]
          
          if (!fixtureData?.odds) {
            console.log(`No odds found for fixture ${fixture.id}`)
            continue
          }

          const playerOdds = fixtureData.odds
            .filter((odd: any) => 
              odd.market_id === 'player_points' || 
              odd.market_id === 'player_rebounds' || 
              odd.market_id === 'player_assists'
            )
            .map((odd: any) => ({
              id: odd.id,
              fixture_id: fixture.id,
              start_date: fixture.start_date,
              sportsbook: odd.sportsbook,
              market: odd.market,
              name: odd.name,
              is_main: odd.is_main,
              selection: odd.selection,
              normalized_selection: odd.normalized_selection,
              market_id: odd.market_id,
              selection_line: odd.selection_line,
              player_id: odd.player_id,
              team_id: playerTeamMap[odd.player_id],
              price: odd.price,
              points: odd.points,
              timestamp: odd.timestamp
            }))

          allPlayerOdds.push(...playerOdds)
        }
      } catch (error) {
        console.error(`Error processing batch starting at index ${i}:`, error)
        // Continue with next batch instead of failing completely
        continue
      }
    }

    console.log(`Total player odds collected: ${allPlayerOdds.length}`)

    if (allPlayerOdds.length > 0) {
      const fixtureIds = Array.from(new Set(allPlayerOdds.map(odd => odd.fixture_id)))
      
      // Use a transaction for atomicity
      const { error: transactionError } = await supabase.rpc('sync_player_odds', {
        fixture_ids: fixtureIds,
        new_odds: allPlayerOdds
      })

      if (transactionError) {
        throw transactionError
      }
      
      console.log(`Successfully replaced ${allPlayerOdds.length} player odds for ${fixtureIds.length} fixtures`)
    }

    // Update sync_log
    await supabase
      .from("sync_log")
      .insert([{ last_synced: new Date().toISOString() }])
      .select()

    return NextResponse.json(
      { 
        message: `${allPlayerOdds.length} player odds synced successfully across ${fixtures.length} fixtures`,
        example: allPlayerOdds[0]
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Sync error:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: error
      },
      { status: 500 }
    )
  }
} 