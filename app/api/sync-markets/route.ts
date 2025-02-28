import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

const SUPABASE_URL = 'https://hvegilvwwvdmivnphlyo.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWdpbHZ3d3ZkbWl2bnBobHlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTY1NjgxNCwiZXhwIjoyMDU1MjMyODE0fQ.6GV2B4ciNiMGOnnRXOMznwD1aNqYUQmHxuuWrdc3U44'

interface Sportsbook {
  id: string
  name: string
}

interface League {
  id: string
  name: string
  numerical_id: number | null
  sportsbooks: Sportsbook[]
}

interface Sport {
  id: string
  name: string
  numerical_id: number | null
  leagues: League[]
}

interface APIMarket {
  id: string
  name: string
  numerical_id: number
  sports: Sport[]
}

interface APIResponse {
  data: APIMarket[]
}

export async function POST() {
  console.log("API route called")
  
  try {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // First, get all active sportsbooks
    const { data: sportsbooks, error: sbError } = await supabase
      .from("sportsbook")
      .select("id")
      .eq("is_active", true)

    if (sbError) {
      throw new Error(`Failed to fetch sportsbooks: ${sbError.message}`)
    }

    let totalMarkets = 0
    const allMarkets: any[] = []

    // Fetch markets for each sportsbook
    for (const sportsbook of sportsbooks) {
      console.log(`Fetching markets for ${sportsbook.id}...`)
      
      const apiUrl = `https://api.opticodds.com/api/v3/markets?sport=basketball&league=nba&sportsbook=${sportsbook.id}&key=${process.env.OPTIC_ODDS_API_KEY}`
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        console.error(`Failed to fetch markets for ${sportsbook.id}: ${response.statusText}`)
        continue
      }
      
      const json: APIResponse = await response.json()
      
      if (!json.data || !Array.isArray(json.data)) {
        console.error(`Invalid response format for ${sportsbook.id}`)
        continue
      }

      // Map markets for this sportsbook
      const marketsToAdd = json.data.map(market => ({
        id: market.id,
        sportsbook_id: sportsbook.id,
        name: market.name,
        numerical_id: market.numerical_id,
        sport_id: market.sports[0]?.id || null,
        league_id: market.sports[0]?.leagues[0]?.id || null,
        created_at: new Date().toISOString()
      }))

      allMarkets.push(...marketsToAdd)
      console.log(`Found ${marketsToAdd.length} markets for ${sportsbook.id}`)
      totalMarkets += marketsToAdd.length
    }

    if (allMarkets.length > 0) {
      console.log("Upserting all markets...")
      const { data, error } = await supabase
        .from("market")
        .upsert(allMarkets, {
          onConflict: 'id,sportsbook_id',
          ignoreDuplicates: false
        })
        .select()

      if (error) {
        console.error("Database error:", error)
        throw error
      }

      // Update sync_log
      await supabase
        .from("sync_log")
        .insert([{ last_synced: new Date().toISOString() }])
        .select()

      return NextResponse.json(
        { 
          message: `${totalMarkets} markets synced successfully across ${sportsbooks.length} sportsbooks`,
          example: data[0]
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { message: "No markets found to sync" },
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