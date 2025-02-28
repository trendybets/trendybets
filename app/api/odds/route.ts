import { NextResponse } from "next/server"
import { serverEnv } from "@/lib/env"

// Helper function to calculate averages from player results
async function fetchPlayerResults(playerId: string, statType: string): Promise<{
  last5: number;
  last10: number;
  season: number;
  hitRates: {
    last5: number;
    last10: number;
    season: number;
  };
  currentStreak: number;
  gameStats: number[];
}> {
  try {
    // Change the season start date to a more lenient date for testing
    const SEASON_START_DATE = new Date('2023-10-22T23:30:00.000Z')
    
    const resultsUrl = `https://api.opticodds.com/api/v3/fixtures/player-results?` +
      `player_id=${playerId}&` +
      `key=${serverEnv.OPTIC_ODDS_API_KEY}`

    console.log(`Fetching results for player ${playerId} - stat type: ${statType}`)

    const response = await fetch(resultsUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch player results: ${response.status}`)
    }

    const data = await response.json()
    const games = data.data || []

    // Add debug logging for the API response
    console.log('Player results API response structure:', {
      totalGames: games.length,
      sampleGame: games[0] ? {
        keys: Object.keys(games[0]),
        startDate: games[0].start_date,
        startTime: games[0].start_time,
        timestamp: games[0].timestamp,
        // Log any other potential date fields
        allFields: games[0]
      } : 'No games found'
    })

    // Get the relevant stat based on market type
    const statKey = statType.toLowerCase() === 'points' ? 'points' : 
                   statType.toLowerCase() === 'rebounds' ? 'total_rebounds' : 
                   'assists'

    console.log(`Using stat key '${statKey}' for stat type '${statType}'`)

    // Extract stats from completed games and filter by season start date
    const gameStats = games
      .filter((game: any) => {
        try {
          // Get date from the fixture object
          const dateStr = game.fixture?.start_date
          console.log('Processing game date:', {
            originalDate: dateStr,
            gameFields: Object.keys(game),
            fixtureFields: game.fixture ? Object.keys(game.fixture) : []
          })

          if (!dateStr) {
            console.log('No valid date field found in game data:', {
              fixture: game.fixture,
              game: game
            })
            return false
          }

          const gameDate = new Date(dateStr)
          const isCompleted = game.results?.[0]?.status === 'completed'
          const isValidDate = !isNaN(gameDate.getTime())
          const isAfterSeasonStart = isValidDate && gameDate >= SEASON_START_DATE
          
          console.log('Game date validation:', {
            dateStr,
            parsedDate: gameDate.toISOString(),
            isCompleted,
            isValidDate,
            isAfterSeasonStart,
            seasonStartDate: SEASON_START_DATE.toISOString()
          })
          
          return isCompleted && isValidDate && isAfterSeasonStart
        } catch (error) {
          console.error('Error processing game date:', error)
          return false
        }
      })
      .map((game: any) => {
        try {
          const allPeriodStats = game.results[0].stats.find((s: any) => s.period === 'all')
          let statValue = 0
          
          switch (statType.toLowerCase()) {
            case 'points':
              statValue = parseFloat(allPeriodStats?.stats?.points) || 0
              break
            case 'assists':
              statValue = parseFloat(allPeriodStats?.stats?.assists ?? 0)
              break
            case 'rebounds':
              statValue = parseFloat(allPeriodStats?.stats?.total_rebounds ?? 0)
              break
          }
          
          console.log(`Game stat for ${statType}: ${statValue}`)
          return statValue
        } catch (error) {
          console.error('Error processing game stats:', error)
          return 0
        }
      })
      .filter((stat: number) => !isNaN(stat))

    console.log(`Found ${gameStats.length} valid games for player ${playerId}`)
    console.log('Game stats:', gameStats)

    // Calculate averages
    const last5Games = gameStats.slice(0, 5)
    const last10Games = gameStats.slice(0, 10)
    const allGames = gameStats

    const calculateAverage = (arr: number[]) => {
      if (arr.length === 0) return 0
      const sum = arr.reduce((a, b) => a + b, 0)
      const avg = sum / arr.length
      console.log(`Calculating average for ${arr.length} games:`, { sum, avg, games: arr })
      return avg
    }

    const averages = {
      last5: calculateAverage(last5Games),
      last10: calculateAverage(last10Games),
      season: calculateAverage(allGames)
    }

    console.log('Calculated averages:', averages)

    // Calculate hit rates (we'll need the line value for this later)
    const calculateHitRate = (arr: number[], line: number) =>
      arr.length ? arr.filter(stat => stat > line).length / arr.length : 0

    // Calculate current streak
    let streak = 0
    for (let i = 0; i < gameStats.length; i++) {
      if (i === 0 || (streak > 0 && gameStats[i] > gameStats[i-1]) || 
         (streak < 0 && gameStats[i] < gameStats[i-1])) {
        streak += Math.sign(gameStats[i] - (i === 0 ? gameStats[i] : gameStats[i-1]))
      } else {
        break
      }
    }

    return {
      last5: averages.last5,
      last10: averages.last10,
      season: averages.season,
      hitRates: {
        last5: 0, // Will be calculated later when we have the line
        last10: 0,
        season: 0
      },
      currentStreak: streak,
      gameStats: gameStats
    }
  } catch (error) {
    console.error(`Error fetching results for player ${playerId}:`, error)
    return {
      last5: 0,
      last10: 0,
      season: 0,
      hitRates: {
        last5: 0,
        last10: 0,
        season: 0
      },
      currentStreak: 0,
      gameStats: []
    }
  }
}

export async function GET() {
  try {
    console.log('API Key:', serverEnv.OPTIC_ODDS_API_KEY ? 'Present' : 'Missing')
    
    // First get active fixtures
    const fixturesUrl = `https://api.opticodds.com/api/v3/fixtures?` +
      `league=nba&` +
      `status=unplayed&` +
      `key=${serverEnv.OPTIC_ODDS_API_KEY}`
    
    console.log('Fetching fixtures from:', fixturesUrl.replace(serverEnv.OPTIC_ODDS_API_KEY, '[REDACTED]'))

    const fixturesResponse = await fetch(fixturesUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    })

    if (!fixturesResponse.ok) {
      console.error('Fixtures response error:', {
        status: fixturesResponse.status,
        statusText: fixturesResponse.statusText,
        headers: Object.fromEntries(fixturesResponse.headers.entries()),
      })
      throw new Error(`Failed to fetch fixtures: ${fixturesResponse.status} ${fixturesResponse.statusText}`)
    }

    const fixturesData = await fixturesResponse.json()
    console.log('Number of fixtures found:', fixturesData.data?.length || 0)
    
    const fixtures = fixturesData.data || []
    if (fixtures.length === 0) {
      console.warn('No fixtures found, returning empty array')
      return NextResponse.json([])
    }

    // Then get odds for each fixture
    const allPlayerOdds = []
    for (const fixture of fixtures) {
      console.log(`Processing fixture ${fixture.id} - ${fixture.home_team} vs ${fixture.away_team}`)
      
      const oddsUrl = `https://api.opticodds.com/api/v3/fixtures/odds?` +
        `sportsbook=draftkings&` +
        `fixture_id=${fixture.id}&` +
        `market=player_points&` +
        `market=player_rebounds&` +
        `market=player_assists&` +
        `is_main=true&` +
        `key=${serverEnv.OPTIC_ODDS_API_KEY}`

      const response = await fetch(oddsUrl)
      
      if (!response.ok) {
        console.error(`Failed to fetch odds for fixture ${fixture.id}:`, response.status)
        continue
      }

      const data = await response.json()
      const fixtureOdds = data.data?.[0]?.odds || []
      console.log(`Found ${fixtureOdds.length} odds for fixture ${fixture.id}`)
      
      if (fixtureOdds.length === 0) {
        console.warn(`No odds found for fixture ${fixture.id}, skipping`)
        continue
      }

      // Create a map to store unique props by grouping key
      const uniqueProps = new Map()
      
      // Fetch player details for all unique players first
      const playerIds = new Set(fixtureOdds.map((odd: any) => odd.player_id)) as Set<string>
      const playerDetails = new Map()
      
      for (const playerId of Array.from(playerIds)) {
        try {
          const playerUrl = `https://api.opticodds.com/api/v3/players?` +
            `sport=basketball&` +
            `league=nba&` +
            `id=${playerId}&` +
            `key=${serverEnv.OPTIC_ODDS_API_KEY}`
          
          const playerResponse = await fetch(playerUrl, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            next: { revalidate: 3600 } // Cache for 1 hour
          })
          
          if (playerResponse.ok) {
            const playerData = await playerResponse.json()
            if (playerData.data?.[0]) {
              playerDetails.set(playerId, playerData.data[0])
            }
          }
        } catch (error) {
          console.error(`Failed to fetch details for player ${playerId}:`, error)
        }
      }
      
      // Process all odds first to get unique props
      const oddsToProcess = fixtureOdds
        .filter((odd: any) => 
          odd.market_id === 'player_points' || 
          odd.market_id === 'player_rebounds' || 
          odd.market_id === 'player_assists'
        )
        .map(async (odd: any) => {
          const key = odd.grouping_key || `${odd.normalized_selection}:${odd.points}`
          if (uniqueProps.has(key)) return null

          const playerDetail = playerDetails.get(odd.player_id)
          const statType = odd.market_id.replace('player_', '').charAt(0).toUpperCase() + 
                          odd.market_id.replace('player_', '').slice(1)

          // Fetch player results and calculate averages
          const playerStats = await fetchPlayerResults(odd.player_id, statType)
          
          // Calculate hit rates now that we have the line
          const gameStats = playerStats.gameStats || []
          const last5Games = gameStats.slice(0, 5)
          const last10Games = gameStats.slice(0, 10)
          const allGames = gameStats

          const calculateHitRate = (arr: number[], line: number) =>
            arr.length ? arr.filter(stat => stat > line).length / arr.length : 0

          const hitRates = {
            last5: calculateHitRate(last5Games, odd.points),
            last10: calculateHitRate(last10Games, odd.points),
            season: calculateHitRate(allGames, odd.points)
          }

          return {
            key,
            data: {
              id: odd.id,
              player: {
                id: odd.player_id,
                name: playerDetail?.name || odd.selection || 'Unknown',
                team: playerDetail?.team?.name || odd.team_id || 'Unknown',
                position: playerDetail?.position || 'Unknown',
                image_url: playerDetail?.logo || `https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/${odd.player_id}.png`,
              },
              stat_type: statType,
              line: parseFloat(odd.points) || 0,
              averages: {
                last5: parseFloat(playerStats.last5.toFixed(1)) || 0,
                last10: parseFloat(playerStats.last10.toFixed(1)) || 0,
                season: parseFloat(playerStats.season.toFixed(1)) || 0,
              },
              hit_rates: {
                last5: parseFloat(hitRates.last5.toFixed(3)) || 0,
                last10: parseFloat(hitRates.last10.toFixed(3)) || 0,
                season: parseFloat(hitRates.season.toFixed(3)) || 0,
              },
              current_streak: parseInt(playerStats.currentStreak.toString()) || 0,
              recommended_bet: {
                type: playerStats.last5 > odd.points ? 'over' : 'under',
                confidence: hitRates.last5 > 0.7 ? 'high' : 
                           hitRates.last5 > 0.6 ? 'medium' : 'low',
                reason: `${Math.round((hitRates.last5 || 0) * 100)}% hit rate in L5`,
              },
              next_game: {
                opponent: fixture.away_team_display,
                date: fixture.start_date,
              },
              trend_strength: parseFloat((Math.abs((playerStats.last5 - odd.points) / odd.points)).toFixed(3)) || 0,
              games: gameStats.map(stat => {
                const gameData = {
                  points: 0,
                  assists: 0,
                  total_rebounds: 0,
                  date: fixture.start_date
                }
                
                switch (statType.toLowerCase()) {
                  case 'points':
                    gameData.points = stat
                    break
                  case 'assists':
                    gameData.assists = stat
                    break
                  case 'rebounds':
                    gameData.total_rebounds = stat
                    break
                }
                
                return gameData
              }),
            }
          }
        })

      // Wait for all player stats to be processed
      const processedOdds = await Promise.all(oddsToProcess.filter((odd: any) => {
        // Filter out any 1H markets
        return !odd.market?.toLowerCase().includes('1st half')
      }))
      
      // Add processed odds to the uniqueProps map
      processedOdds
        .filter(Boolean)
        .forEach(odd => uniqueProps.set(odd.key, odd.data))

      const playerOdds = Array.from(uniqueProps.values())
      console.log(`Successfully processed ${playerOdds.length} player props for fixture ${fixture.id}`)
      allPlayerOdds.push(...playerOdds)
    }

    console.log('Total player odds collected:', allPlayerOdds.length)
    if (allPlayerOdds.length === 0) {
      console.warn('No player odds were collected from any fixtures')
    }
    return NextResponse.json(allPlayerOdds)
  } catch (error) {
    console.error('Detailed error in /api/odds:', error)
    if (error instanceof Error) {
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch player odds',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 