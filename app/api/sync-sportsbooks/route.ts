import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

const SUPABASE_URL = 'https://hvegilvwwvdmivnphlyo.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWdpbHZ3d3ZkbWl2bnBobHlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTY1NjgxNCwiZXhwIjoyMDU1MjMyODE0fQ.6GV2B4ciNiMGOnnRXOMznwD1aNqYUQmHxuuWrdc3U44'

interface APISportsbook {
  id: string
  name: string
  logo: string
  is_onshore: boolean
  is_active: boolean
}

interface APIResponse {
  data: APISportsbook[]
}

export async function POST() {
  console.log("API route called")
  
  try {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Fetch sportsbooks from API
    const apiUrl = `https://api.opticodds.com/api/v3/sportsbooks/active?sport=basketball&league=nba&key=${process.env.OPTIC_ODDS_API_KEY}`
    console.log("Fetching from API...")
    
    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    
    const json: APIResponse = await response.json()
    if (!json.data || !Array.isArray(json.data)) {
      throw new Error("Invalid API response format")
    }

    console.log(`Fetched ${json.data.length} sportsbooks`)
    
    // Map the sportsbooks to match our schema
    const sportsbooksToUpsert = json.data.map(sportsbook => ({
      id: sportsbook.id,
      name: sportsbook.name,
      logo: sportsbook.logo,
      is_onshore: sportsbook.is_onshore,
      is_active: sportsbook.is_active,
      created_at: new Date().toISOString()
    }))
    
    console.log("Example sportsbook data:", sportsbooksToUpsert[0])

    // Upsert sportsbooks to Supabase
    const { data, error } = await supabase
      .from("sportsbook")
      .upsert(sportsbooksToUpsert, {
        onConflict: 'id',
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
        message: `${data.length} sportsbooks synced successfully`,
        example: data[0]
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