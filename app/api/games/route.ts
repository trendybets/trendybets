import { NextResponse } from "next/server"
import { serverEnv } from "@/lib/env"

// At the top of the file, add default sportsbook
const DEFAULT_SPORTSBOOK = 'draftkings'

interface Fixture {
  id: string
  start_date: string
  home_competitors?: Array<{ id: string; name: string; logo: string }>
  away_competitors?: Array<{ id: string; name: string; logo: string }>
  home_team_display: string
  away_team_display: string
  home_record?: string | null
  away_record?: string | null
}

interface Odd {
  market_id?: string
  sportsbook: string
  team_id: string
  price: number
  points?: number
  selection_line?: string
  is_main: boolean
}

interface Game {
  home_competitors?: Array<{ id: string; name: string; logo: string }>
  away_competitors?: Array<{ id: string; name: string; logo: string }>
  odds?: Odd[]
}

// Fetch active fixtures
async function fetchActiveFixtures() {
  const url = `https://api.opticodds.com/api/v3/fixtures/active?` +
    `sport=basketball&` +
    `league=nba&` +
    `is_live=false&` +
    `status=unplayed&` +
    `key=${serverEnv.OPTIC_ODDS_API_KEY}`

  console.log('Fetching active fixtures from:', url.replace(serverEnv.OPTIC_ODDS_API_KEY, '[REDACTED]'))
  
  try {
    const response = await fetch(url, {
      cache: 'no-store',  // Disable caching to ensure fresh data
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('Failed to fetch fixtures:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })
      throw new Error(`Failed to fetch fixtures: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('Active fixtures response:', {
      count: data.count || 0,
      dataLength: data.data?.length || 0,
      fixtures: data.data?.map((f: any) => ({
        id: f.id,
        startDate: f.start_date,
        home: f.home_team_display,
        away: f.away_team_display
      })) || []
    })
    
    return data.data || []
  } catch (error) {
    console.error('Error fetching active fixtures:', error)
    throw error
  }
}

// Fetch team data
async function fetchTeams() {
  const url = `https://api.opticodds.com/api/v3/teams?` +
    `sport=basketball&` +
    `league=nba&` +
    `key=${serverEnv.OPTIC_ODDS_API_KEY}`

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch teams')
  const data = await response.json()
  return data.data || []
}

// Fetch odds for a fixture
async function fetchFixtureOdds(fixtureId: string) {
  const url = `https://api.opticodds.com/api/v3/fixtures/odds?` +
    `sportsbook=draftkings&` +
    `sportsbook=caesars&` +
    `sportsbook=bet365&` +
    `sportsbook=betmgm&` +
    `fixture_id=${fixtureId}&` +
    `market=moneyline&` +
    `market=point_spread&` +
    `market=total_points&` +
    `is_main=true&` +
    `key=${serverEnv.OPTIC_ODDS_API_KEY}`

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch odds')
  const data = await response.json()
  
  // Log the raw odds data
  console.log('Raw odds data for fixture:', fixtureId, JSON.stringify(data.data, null, 2))
  
  return data.data || []
}

export async function GET() {
  try {
    const teams = await fetchTeams()
    const fixtures = await fetchActiveFixtures()
    
    console.log(`Processing ${fixtures.length} fixtures`)
    
    // Add dates debug log
    if (fixtures.length > 0) {
      const uniqueDates = Array.from(new Set(fixtures.map((f: Fixture) => {
        const date = new Date(f.start_date)
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: 'America/Los_Angeles'
        })
      })))
      
      console.log('Available game dates:', {
        count: uniqueDates.length,
        dates: uniqueDates
      })
    }

    // In case the active fixtures API doesn't return upcoming games,
    // let's also fetch from the unplayed endpoint
    let additionalFixtures: any[] = []
    try {
      const url = `https://api.opticodds.com/api/v3/fixtures?` +
        `sport=basketball&` +
        `league=nba&` +
        `status=unplayed&` +
        `key=${serverEnv.OPTIC_ODDS_API_KEY}`
      
      console.log('Fetching unplayed fixtures from:', url.replace(serverEnv.OPTIC_ODDS_API_KEY, '[REDACTED]'))
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        additionalFixtures = data.data || []
        console.log(`Found ${additionalFixtures.length} additional unplayed fixtures`)
        
        // Log dates from additional fixtures
        if (additionalFixtures.length > 0) {
          const uniqueDates = Array.from(new Set(additionalFixtures.map((f: Fixture) => {
            const date = new Date(f.start_date)
            return date.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              timeZone: 'America/Los_Angeles'
            })
          })))
          
          console.log('Additional game dates:', {
            count: uniqueDates.length,
            dates: uniqueDates
          })
        }
      }
    } catch (error) {
      console.error('Error fetching additional fixtures:', error)
    }

    // Try one more source - fetch scheduled games with date range
    let scheduledFixtures: any[] = []
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date()
      const todayFormatted = today.toISOString().split('T')[0]
      
      // Get one week from today
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)
      const nextWeekFormatted = nextWeek.toISOString().split('T')[0]
      
      const url = `https://api.opticodds.com/api/v3/fixtures?` +
        `sport=basketball&` +
        `league=nba&` +
        `from_start_date=${todayFormatted}&` +
        `to_start_date=${nextWeekFormatted}&` +
        `key=${serverEnv.OPTIC_ODDS_API_KEY}`
      
      console.log('Fetching scheduled fixtures from:', url.replace(serverEnv.OPTIC_ODDS_API_KEY, '[REDACTED]'))
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        scheduledFixtures = data.data || []
        console.log(`Found ${scheduledFixtures.length} scheduled fixtures`)
        
        // Log dates from scheduled fixtures
        if (scheduledFixtures.length > 0) {
          const uniqueDates = Array.from(new Set(scheduledFixtures.map((f: Fixture) => {
            const date = new Date(f.start_date)
            return date.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              timeZone: 'America/Los_Angeles'
            })
          })))
          
          console.log('Scheduled game dates:', {
            count: uniqueDates.length,
            dates: uniqueDates
          })
        }
      }
    } catch (error) {
      console.error('Error fetching scheduled fixtures:', error)
    }

    // Combine and de-duplicate fixtures
    const allFixtures = fixtures.slice()
    const fixtureIds = new Set(fixtures.map((f: Fixture) => f.id))
    
    // Add additional fixtures
    for (const fixture of additionalFixtures) {
      if (!fixtureIds.has(fixture.id)) {
        allFixtures.push(fixture)
        fixtureIds.add(fixture.id)
      }
    }

    // Add scheduled fixtures
    for (const fixture of scheduledFixtures) {
      if (!fixtureIds.has(fixture.id)) {
        allFixtures.push(fixture)
        fixtureIds.add(fixture.id)
      }
    }
    
    console.log(`Combined ${fixtures.length} active fixtures, ${additionalFixtures.length} unplayed fixtures, and ${scheduledFixtures.length} scheduled fixtures for a total of ${allFixtures.length} unique fixtures`)

    // Filter out games that have already started
    const now = new Date()
    const upcomingFixtures = allFixtures.filter((fixture: Fixture) => {
      const startDate = new Date(fixture.start_date)
      const isUpcoming = startDate > now
      if (!isUpcoming) {
        console.log(`Filtering out game that has already started: ${fixture.id} - ${fixture.home_team_display} vs ${fixture.away_team_display} (${fixture.start_date})`)
      }
      return isUpcoming
    })
    
    console.log(`Filtered out ${allFixtures.length - upcomingFixtures.length} games that have already started, ${upcomingFixtures.length} upcoming games remaining`)

    const gamesWithOdds = await Promise.all(
      upcomingFixtures.map(async (fixture: Fixture) => {
        const odds = await fetchFixtureOdds(fixture.id)
        const homeTeam = fixture.home_competitors?.[0]
        const awayTeam = fixture.away_competitors?.[0]

        // Process odds data
        const processedOdds = odds.reduce((acc: any, game: Game) => {
          game.odds?.forEach((odd: Odd) => {
            const market = odd.market_id?.toLowerCase()
            if (!market) return

            // Create market arrays if they don't exist
            if (!acc.moneyline) acc.moneyline = []
            if (!acc.spread) acc.spread = []
            if (!acc.total) acc.total = []

            // Skip non-main markets
            if (!odd.is_main) return

            // Process based on market type
            switch (market) {
              case 'moneyline':
                acc.moneyline.push({
                  sportsbook: odd.sportsbook.toLowerCase(),
                  team_id: odd.team_id,
                  price: odd.price,
                  is_home: odd.team_id === game.home_competitors?.[0]?.id
                })
                break

              case 'point_spread':
                acc.spread.push({
                  sportsbook: odd.sportsbook.toLowerCase(),
                  team_id: odd.team_id,
                  price: odd.price,
                  points: odd.points,
                  is_home: odd.team_id === game.home_competitors?.[0]?.id
                })
                break

              case 'total_points':
                acc.total.push({
                  sportsbook: odd.sportsbook.toLowerCase(),
                  price: odd.price,
                  points: odd.points,
                  selection_line: odd.selection_line?.toLowerCase()
                })
                break
            }
          })
          return acc
        }, {} as Record<string, any[]>)

        // Add debug logging for all odds
        console.log('All available odds:', {
          fixtureId: fixture.id,
          moneylineCount: processedOdds.moneyline?.length || 0,
          spreadCount: processedOdds.spread?.length || 0,
          totalCount: processedOdds.total?.length || 0,
          sportsbooks: {
            moneyline: Array.from(new Set(processedOdds.moneyline?.map((o: any) => o.sportsbook) || [])),
            spread: Array.from(new Set(processedOdds.spread?.map((o: any) => o.sportsbook) || [])),
            total: Array.from(new Set(processedOdds.total?.map((o: any) => o.sportsbook) || []))
          }
        })

        return {
          id: fixture.id,
          start_date: fixture.start_date,
          home_team: {
            id: homeTeam?.id || '',
            name: homeTeam?.name || fixture.home_team_display,
            logo: homeTeam?.logo || ''
          },
          away_team: {
            id: awayTeam?.id || '',
            name: awayTeam?.name || fixture.away_team_display,
            logo: awayTeam?.logo || ''
          },
          home_record: fixture.home_record || null,
          away_record: fixture.away_record || null,
          odds: {
            moneyline: processedOdds.moneyline || [],
            spread: processedOdds.spread || [],
            total: processedOdds.total || []
          }
        }
      })
    )

    console.log('Final processed games:', gamesWithOdds.length)
    return NextResponse.json(gamesWithOdds)
  } catch (error) {
    console.error('Error in /api/games:', error)
    return NextResponse.json({ error: 'Failed to fetch games data' }, { status: 500 })
  }
} 