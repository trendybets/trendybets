import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Define constants for environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface SportInfo {
  id: string
  name: string
  numerical_id: number
}

interface LeagueInfo {
  id: string
  name: string
  numerical_id: number
}

interface APITeam {
  id: string
  name: string
  numerical_id: number
  base_id: number
  is_active: boolean
  city: string
  mascot: string
  nickname: string
  abbreviation: string
  division: string
  conference: string
  logo: string
  source_ids: Record<string, any>
  sport: SportInfo
  league: LeagueInfo
}

interface APIResponse {
  data: APITeam[]
}

export async function POST() {
  console.log("API route called")
  
  try {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Fetch teams from API
    const apiUrl = `https://api.opticodds.com/api/v3/teams?sport=basketball&league=nba&key=${process.env.OPTIC_ODDS_API_KEY}`
    console.log("Fetching from API...")
    
    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    
    const json: APIResponse = await response.json()
    if (!json.data || !Array.isArray(json.data)) {
      throw new Error("Invalid API response format")
    }

    console.log(`Fetched ${json.data.length} teams`)
    
    // Map the teams to match our schema
    const teamsToUpsert = json.data
      .filter(team => team.is_active)
      .map(team => ({
        id: team.id,
        name: team.name,
        numerical_id: team.numerical_id,
        base_id: team.base_id,
        city: team.city,
        mascot: team.mascot,
        nickname: team.nickname,
        abbreviation: team.abbreviation,
        division: team.division,
        conference: team.conference,
        logo: team.logo,
        source_ids: team.source_ids,
        created_at: new Date().toISOString()
      }))
    
    console.log("Example team data:", teamsToUpsert[0])

    // Upsert teams to Supabase
    const { data, error } = await supabase
      .from("teams")
      .upsert(teamsToUpsert, { 
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
        message: `${data.length} teams synced successfully`,
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

