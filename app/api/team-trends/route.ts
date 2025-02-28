import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { cache } from 'react'

// Cache the team trends data
const getTeamTrendsData = cache(async (teamName: string, games: number) => {
  const supabase = createRouteHandlerClient({ cookies })
  const { data, error } = await supabase
    .rpc('get_team_trends', { 
      p_team_name: teamName,
      p_last_n_games: games 
    })

  if (error) throw error
  return data
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teamName = searchParams.get('team')
  const games = parseInt(searchParams.get('games') || '5')
  
  if (!teamName) {
    return NextResponse.json(
      { error: 'Team name is required' },
      { status: 400 }
    )
  }

  try {
    const data = await getTeamTrendsData(teamName, games)

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'No data found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching team trends:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 