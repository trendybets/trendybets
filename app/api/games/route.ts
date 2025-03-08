import { NextResponse } from "next/server"
import { serverEnv } from "@/lib/env"
import { withCache } from "@/lib/redis"

// Add this line to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic'

// At the top of the file, add default sportsbook
const DEFAULT_SPORTSBOOK = 'draftkings'
// Redis cache TTL (5 minutes in seconds)
const CACHE_TTL = 5 * 60;

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
  
  const cacheKey = `games:active-fixtures`;
  
  return withCache(
    cacheKey,
    async () => {
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          cache: 'no-store' // Ensure we're not using cached data
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
    },
    CACHE_TTL
  );
}

// Fetch team data
async function fetchTeams() {
  const url = `https://api.opticodds.com/api/v3/teams?` +
    `sport=basketball&` +
    `league=nba&` +
    `key=${serverEnv.OPTIC_ODDS_API_KEY}`

  const cacheKey = `games:teams`;
  
  return withCache(
    cacheKey,
    async () => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch teams')
      const data = await response.json()
      return data.data || []
    },
    CACHE_TTL
  );
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

  console.log(`Fetching odds for fixture ${fixtureId}`)
  
  const cacheKey = `games:fixture-odds:${fixtureId}`;
  
  return withCache(
    cacheKey,
    async () => {
      try {
        const response = await fetch(url, {
          cache: 'no-store' // Ensure we're not using cached data
        })
        
        if (!response.ok) {
          console.error(`Failed to fetch odds for fixture ${fixtureId}:`, {
            status: response.status,
            statusText: response.statusText
          })
          return []
        }
        
        const data = await response.json()
        
        // Log the raw odds data
        console.log(`Raw odds data for fixture ${fixtureId}:`, {
          count: data.data?.length || 0,
        })
        
        return data.data || []
      } catch (error) {
        console.error(`Error fetching odds for fixture ${fixtureId}:`, error)
        return []
      }
    },
    CACHE_TTL
  );
}

// Fetch unplayed fixtures
async function fetchUnplayedFixtures() {
  const url = `https://api.opticodds.com/api/v3/fixtures?` +
    `sport=basketball&` +
    `league=nba&` +
    `status=unplayed&` +
    `key=${serverEnv.OPTIC_ODDS_API_KEY}`
  
  console.log('Fetching unplayed fixtures from:', url.replace(serverEnv.OPTIC_ODDS_API_KEY, '[REDACTED]'))
  
  const cacheKey = `games:unplayed-fixtures`;
  
  return withCache(
    cacheKey,
    async () => {
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          cache: 'no-store' // Ensure we're not using cached data
        })
        
        if (!response.ok) {
          console.error('Failed to fetch unplayed fixtures:', {
            status: response.status,
            statusText: response.statusText
          })
          return []
        }
        
        const data = await response.json()
        const fixtures = data.data || []
        console.log(`Found ${fixtures.length} unplayed fixtures`)
        
        return fixtures
      } catch (error) {
        console.error('Error fetching unplayed fixtures:', error)
        return []
      }
    },
    CACHE_TTL
  );
}

// Fetch scheduled fixtures for the next week
async function fetchScheduledFixtures() {
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
  
  const cacheKey = `games:scheduled-fixtures:${todayFormatted}-${nextWeekFormatted}`;
  
  return withCache(
    cacheKey,
    async () => {
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          cache: 'no-store' // Ensure we're not using cached data
        })
        
        if (!response.ok) {
          console.error('Failed to fetch scheduled fixtures:', {
            status: response.status,
            statusText: response.statusText
          })
          return []
        }
        
        const data = await response.json()
        const fixtures = data.data || []
        console.log(`Found ${fixtures.length} scheduled fixtures`)
        
        return fixtures
      } catch (error) {
        console.error('Error fetching scheduled fixtures:', error)
        return []
      }
    },
    CACHE_TTL
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get('refresh') === 'true';
  const cacheKey = 'games:all-games';
  
  try {
    let gamesData;
    
    // If forceRefresh is true, we'll bypass the cache
    if (forceRefresh) {
      gamesData = await processGamesData();
    } else {
      // Use Redis caching for the data
      gamesData = await withCache(
        cacheKey,
        processGamesData,
        CACHE_TTL
      );
    }
    
    return NextResponse.json(gamesData);
  } catch (error) {
    console.error('Error in /api/games:', error);
    return NextResponse.json({ error: 'Failed to fetch games data' }, { status: 500 });
  }
}

async function processGamesData() {
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
    const additionalFixtures = await fetchUnplayedFixtures()
    
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

    // Try one more source - fetch scheduled games with date range
    const scheduledFixtures = await fetchScheduledFixtures()
    
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

    // Filter out games that have already started, but be more lenient with the time check
    // to account for potential clock differences between environments
    const now = new Date()
    // Subtract 15 minutes to be more lenient with games that just started
    now.setMinutes(now.getMinutes() - 15)
    
    const upcomingFixtures = allFixtures.filter((fixture: Fixture) => {
      const startDate = new Date(fixture.start_date)
      const isUpcoming = startDate > now
      if (!isUpcoming) {
        console.log(`Filtering out game that has already started: ${fixture.id} - ${fixture.home_team_display} vs ${fixture.away_team_display} (${fixture.start_date})`)
      }
      return isUpcoming
    })
    
    console.log(`Filtered out ${allFixtures.length - upcomingFixtures.length} games that have already started, ${upcomingFixtures.length} upcoming games remaining`)

    // Process games with odds in parallel
    const gamesWithOddsPromises = upcomingFixtures.map(async (fixture: Fixture) => {
      try {
        const odds = await fetchFixtureOdds(fixture.id)
        const homeTeam = fixture.home_competitors?.[0]
        const awayTeam = fixture.away_competitors?.[0]

        // Process odds data
        const processedOdds = odds.reduce((acc: any, game: Game) => {
          if (!game.odds || game.odds.length === 0) {
            console.log(`No odds found for game ${fixture.id} in odds data`)
            return acc
          }
          
          game.odds.forEach((odd: Odd) => {
            const market = odd.market_id?.toLowerCase()
            if (!market) {
              console.log(`Missing market_id for odd in game ${fixture.id}`)
              return
            }

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
      } catch (error) {
        console.error(`Error processing fixture ${fixture.id}:`, error)
        // Return a minimal game object without odds in case of error
        return {
          id: fixture.id,
          start_date: fixture.start_date,
          home_team: {
            id: fixture.home_competitors?.[0]?.id || '',
            name: fixture.home_team_display,
            logo: fixture.home_competitors?.[0]?.logo || ''
          },
          away_team: {
            id: fixture.away_competitors?.[0]?.id || '',
            name: fixture.away_team_display,
            logo: fixture.away_competitors?.[0]?.logo || ''
          },
          home_record: fixture.home_record || null,
          away_record: fixture.away_record || null,
          odds: {
            moneyline: [],
            spread: [],
            total: []
          }
        }
      }
    })

    const gamesWithOdds = await Promise.all(gamesWithOddsPromises)
    
    // Filter out games with no odds data
    const gamesWithValidOdds = gamesWithOdds.filter(game => {
      const hasOdds = (
        (game.odds.moneyline && game.odds.moneyline.length > 0) ||
        (game.odds.spread && game.odds.spread.length > 0) ||
        (game.odds.total && game.odds.total.length > 0)
      )
      
      if (!hasOdds) {
        console.log(`Filtering out game with no odds: ${game.id} - ${game.home_team.name} vs ${game.away_team.name}`)
      }
      
      return true // Return all games, even those without odds
    })

    console.log('Final processed games:', gamesWithValidOdds.length)
    return gamesWithValidOdds
  } catch (error) {
    console.error('Error processing games data:', error)
    throw error
  }
} 