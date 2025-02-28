import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { serverEnv } from "@/lib/env"

const SUPABASE_URL = 'https://hvegilvwwvdmivnphlyo.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWdpbHZ3d3ZkbWl2bnBobHlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTY1NjgxNCwiZXhwIjoyMDU1MjMyODE0fQ.6GV2B4ciNiMGOnnRXOMznwD1aNqYUQmHxuuWrdc3U44'

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

interface TeamInfo {
  id: string
  name: string
  numerical_id: number
  base_id: number
}

interface APIPlayer {
  id: string
  name: string
  position: string
  number: number
  numerical_id: number
  base_id: number
  is_active: boolean
  first_name: string
  last_name: string
  age: number
  height: number
  weight: number
  experience: number | null
  logo: string
  source_ids: Record<string, any>
  sport: SportInfo
  league: LeagueInfo
  team: TeamInfo
}

interface APIResponse {
  data: APIPlayer[]
}

export async function POST() {
  console.log("API route called")
  
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serverEnv.SUPABASE_SERVICE_KEY
    )
    let allPlayers: APIPlayer[] = []

    // Loop through pages 1 to 6 to get all players
    for (let page = 1; page <= 6; page++) {
      console.log(`Fetching page ${page}...`)
      const apiUrl = `https://api.opticodds.com/api/v3/players?sport=basketball&league=nba&page=${page}&key=${process.env.OPTIC_ODDS_API_KEY}`
      
      const response = await fetch(apiUrl)
      if (!response.ok) {
        console.error(`Failed to fetch page ${page}: ${response.statusText}`)
        continue // Skip this page on error
      }
      
      const json: APIResponse = await response.json()
      if (!json.data || !Array.isArray(json.data)) {
        console.error(`Invalid response format for page ${page}`)
        continue
      }

      allPlayers = [...allPlayers, ...json.data]
      console.log(`Added ${json.data.length} players from page ${page}`)
    }

    console.log(`Total players fetched: ${allPlayers.length}`)
    
    // Map the players to match our schema
    const playersToUpsert = allPlayers
      .filter(player => player.is_active)
      .map(player => ({
        id: player.id,
        full_name: player.name,
        first_name: player.first_name,
        last_name: player.last_name,
        position: player.position,
        number: player.number,
        age: player.age,
        height: player.height,
        weight: player.weight,
        experience: player.experience,
        logo: player.logo,
        is_active: player.is_active,
        source_ids: player.source_ids,
        sport_id: player.sport.id,
        league_id: player.league.id,
        team_id: player.team.id,
        created_at: new Date().toISOString()
      }))
    
    console.log("Example player data:", playersToUpsert[0])

    // Upsert players to Supabase
    const { data, error } = await supabase
      .from("players")
      .upsert(playersToUpsert, {
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
        message: `${data.length} players synced successfully`,
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