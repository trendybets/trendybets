import { NextResponse } from "next/server"
import { serverEnv } from "@/lib/env"

// Add this line to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic'
// Increase the maximum duration for this route to handle loading all fixtures
export const maxDuration = 300; // 5 minutes timeout (increased from 2 minutes)

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
          
          if (!dateStr) {
            return false
          }

          const gameDate = new Date(dateStr)
          const isCompleted = game.results?.[0]?.status === 'completed'
          const isValidDate = !isNaN(gameDate.getTime())
          const isAfterSeasonStart = isValidDate && gameDate >= SEASON_START_DATE
          
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
          
          return statValue
        } catch (error) {
          console.error('Error processing game stats:', error)
          return 0
        }
      })
      .filter((stat: number) => !isNaN(stat))

    console.log(`Found ${gameStats.length} valid games for player ${playerId}`)

    // Calculate averages
    const last5Games = gameStats.slice(0, 5)
    const last10Games = gameStats.slice(0, 10)
    const allGames = gameStats

    const calculateAverage = (arr: number[]) => {
      if (arr.length === 0) return 0
      const sum = arr.reduce((a, b) => a + b, 0)
      const avg = sum / arr.length
      return avg
    }

    const averages = {
      last5: calculateAverage(last5Games),
      last10: calculateAverage(last10Games),
      season: calculateAverage(allGames)
    }

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

export async function GET(request: Request) {
  try {
    console.log('API Key:', serverEnv.OPTIC_ODDS_API_KEY ? 'Present' : 'Missing')
    
    // Get query parameters
    const url = new URL(request.url);
    const fixtureId = url.searchParams.get('fixture_id');
    // Remove default limit - always process all fixtures unless specifically requested
    const limit = parseInt(url.searchParams.get('limit') || '0'); // Default to 0 (no limit)
    
    console.log(`API request received with fixtureId=${fixtureId}, limit=${limit}`);
    
    // First get active fixtures - updated to match the provided endpoint
    const fixturesUrl = `https://api.opticodds.com/api/v3/fixtures/active?` +
      `sport=basketball&` +
      `league=nba&` +
      `is_live=false&` +
      (fixtureId ? `fixture_id=${fixtureId}&` : '') +
      `key=${serverEnv.OPTIC_ODDS_API_KEY}`
    
    console.log('Fetching fixtures from:', fixturesUrl.replace(serverEnv.OPTIC_ODDS_API_KEY, '[REDACTED]'))

    const fixturesResponse = await fetch(fixturesUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store' // Disable caching to ensure fresh data
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

    // Log all available fixtures to help debug
    console.log('All available fixtures:', fixtures.map((f: any) => 
      `${f.id}: ${f.home_team_display} vs ${f.away_team_display} (${f.status})`
    ));

    // Add more detailed logging about the fixtures
    console.log('Detailed fixtures data:', fixtures.map((f: any) => ({
      id: f.id,
      home: f.home_team_display,
      away: f.away_team_display,
      status: f.status,
      start_date: f.start_date,
      has_odds: f.has_odds
    })));

    // IMPORTANT: Process ALL fixtures by default
    let limitedFixtures;
    if (fixtureId) {
      // If a specific fixture ID is requested, filter to just that one
      limitedFixtures = fixtures.filter((f: any) => f.id === fixtureId);
      console.log(`Filtering to specific fixture ID: ${fixtureId}`);
    } else if (limit > 0) {
      // If a positive limit is specified, limit the number of fixtures
      limitedFixtures = fixtures.slice(0, limit);
      console.log(`Limiting to ${limit} fixtures`);
    } else {
      // Otherwise, process ALL fixtures (limit=0 or negative)
      limitedFixtures = [...fixtures]; // Create a copy to avoid reference issues
      console.log(`Processing ALL ${fixtures.length} fixtures (no limit)`);
    }
    
    console.log(`Processing ${limitedFixtures.length} fixtures out of ${fixtures.length} total fixtures`);
    console.log('Fixtures to process:', limitedFixtures.map((f: any) => 
      `${f.id}: ${f.home_team_display} vs ${f.away_team_display} (${f.status})`
    ));
    
    // Add more detailed warnings if we're not processing all fixtures
    if (limitedFixtures.length < fixtures.length) {
      console.warn(`WARNING: Only processing ${limitedFixtures.length} out of ${fixtures.length} available fixtures.`);
      console.warn('This might be intentional if a limit or specific fixture ID was requested.');
      console.warn('Fixtures being processed:', limitedFixtures.map((f: any) => 
        `${f.id}: ${f.home_team_display} vs ${f.away_team_display}`
      ));
      console.warn('Fixtures being skipped:', fixtures
        .filter((f: any) => !limitedFixtures.some((lf: any) => lf.id === f.id))
        .map((f: any) => `${f.id}: ${f.home_team_display} vs ${f.away_team_display}`)
      );
    }

    // Use Promise.all to fetch odds for all fixtures in parallel
    const fixtureOddsPromises = limitedFixtures.map(async (fixture: any) => {
      console.log(`Processing fixture ${fixture.id} - ${fixture.home_team_display} vs ${fixture.away_team_display}`)
      
      // Try multiple sportsbooks to increase chances of finding odds
      const oddsUrl = `https://api.opticodds.com/api/v3/fixtures/odds?` +
        `sportsbook=draftkings&` +
        `sportsbook=caesars&` +
        `sportsbook=betmgm&` +
        `sportsbook=fanduel&` +
        `sportsbook=bet365&` +
        `fixture_id=${fixture.id}&` +
        `market=player_points&` +
        `market=player_rebounds&` +
        `market=player_assists&` +
        `is_main=true&` +
        `key=${serverEnv.OPTIC_ODDS_API_KEY}`

      try {
        const response = await fetch(oddsUrl, {
          cache: 'no-store' // Disable caching to ensure fresh data
        })
        
        if (!response.ok) {
          console.error(`Failed to fetch odds for fixture ${fixture.id}:`, response.status)
          return []
        }

        const data = await response.json()
        const fixtureOdds = data.data?.[0]?.odds || []
        console.log(`Found ${fixtureOdds.length} odds for fixture ${fixture.id}`)
        
        // Add more detailed logging about the odds
        if (fixtureOdds.length === 0) {
          console.warn(`No player odds found for fixture ${fixture.id} - ${fixture.home_team_display} vs ${fixture.away_team_display}`)
          
          // If no odds are found, create dummy data for this fixture to ensure it appears in the UI
          // This is just for debugging - we'll remove this later
          return [
            {
              fixture_id: fixture.id,
              home_team_display: fixture.home_team_display,
              away_team_display: fixture.away_team_display,
              player_id: `dummy_${fixture.id}`,
              selection: `Player from ${fixture.home_team_display}`,
              team_id: fixture.home_team_display,
              market_id: 'player_points',
              points: 10,
              price: -110,
              is_main: true
            },
            {
              fixture_id: fixture.id,
              home_team_display: fixture.home_team_display,
              away_team_display: fixture.away_team_display,
              player_id: `dummy2_${fixture.id}`,
              selection: `Player from ${fixture.away_team_display}`,
              team_id: fixture.away_team_display,
              market_id: 'player_points',
              points: 10,
              price: -110,
              is_main: true
            }
          ]
        } else {
          // Log sample of player odds
          const sampleOdds = fixtureOdds.slice(0, 3);
          console.log(`Sample odds for fixture ${fixture.id}:`, sampleOdds.map((odd: any) => ({
            player_id: odd.player_id,
            selection: odd.selection,
            market_id: odd.market_id,
            points: odd.points
          })));
        }
        
        return fixtureOdds.map((odd: any) => ({
          ...odd,
          fixture_id: fixture.id,
          home_team_display: fixture.home_team_display,
          away_team_display: fixture.away_team_display
        }))
      } catch (error) {
        console.error(`Error fetching odds for fixture ${fixture.id}:`, error)
        return []
      }
    })

    const allFixtureOddsArrays = await Promise.all(fixtureOddsPromises)
    const allFixtureOdds = allFixtureOddsArrays.flat()
    
    // Create a map to store unique props by grouping key
    const uniqueProps = new Map()
    
    // Fetch player details for all unique players first
    const playerIds = new Set(allFixtureOdds.map((odd: any) => odd.player_id)) as Set<string>
    const playerDetails = new Map()
    
    // Process ALL players - no limit
    console.log(`Processing all ${playerIds.size} unique players`);
    
    // Use all player IDs without limiting
    const allPlayerIds = Array.from(playerIds);
    console.log(`Found ${playerIds.size} unique players, processing all of them`);
    
    for (const playerId of allPlayerIds) {
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
    // No limit on odds to process - process ALL odds
    console.log(`Processing all ${allFixtureOdds.length} odds`);
    
    const filteredOdds = allFixtureOdds
      .filter((odd: any) => 
        odd.market_id === 'player_points' || 
        odd.market_id === 'player_rebounds' || 
        odd.market_id === 'player_assists'
      );
    
    console.log(`Found ${allFixtureOdds.length} total odds, processing ${filteredOdds.length} after filtering by market type`);
    
    const oddsToProcess = filteredOdds.map(async (odd: any) => {
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
        
        // Find the fixture for this odd
        const fixtureForOdd = limitedFixtures.find((f: any) => f.id === odd.fixture_id) || limitedFixtures[0]
        const fixtureDate = fixtureForOdd?.start_date || new Date().toISOString()
        
        // Correctly determine the opponent based on the player's team
        let fixtureOpponent = '';
        let homeTeam = '';
        let awayTeam = '';
        
        if (fixtureForOdd) {
          homeTeam = fixtureForOdd.home_team_display;
          awayTeam = fixtureForOdd.away_team_display;
          
          // Determine if the player's team is home or away, then set opponent accordingly
          const playerTeam = playerDetail?.team?.name || odd.team_id || 'Unknown';
          
          // Helper function to normalize team names for comparison
          const normalizeTeamName = (name: string) => {
            if (!name) return '';
            return name.toLowerCase()
              .replace(/\s+/g, '') // Remove spaces
              .replace(/\./g, '')  // Remove periods
              .replace(/-/g, '')   // Remove hyphens
              .replace(/^the/i, ''); // Remove leading "the"
          };
          
          // Compare normalized team names
          const isHomeTeam = normalizeTeamName(playerTeam) === normalizeTeamName(homeTeam);
          const isAwayTeam = normalizeTeamName(playerTeam) === normalizeTeamName(awayTeam);
          
          if (isHomeTeam) {
            fixtureOpponent = awayTeam;
          } else if (isAwayTeam) {
            fixtureOpponent = homeTeam;
          } else {
            // If we can't determine, use the default away_team_display
            fixtureOpponent = fixtureForOdd.away_team_display;
            console.log(`Could not match player team "${playerTeam}" to either home "${homeTeam}" or away "${awayTeam}"`);
          }
          
          console.log(`Player ${playerDetail?.name || odd.selection || 'Unknown'} - Team: ${playerTeam}, Opponent: ${fixtureOpponent}, Home: ${homeTeam}, Away: ${awayTeam}`);
        } else {
          fixtureOpponent = 'Unknown';
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
              fixture_id: odd.fixture_id,
              opponent: fixtureOpponent,
              date: fixtureDate,
              home_team: homeTeam,
              away_team: awayTeam
            },
            trend_strength: parseFloat((Math.abs((playerStats.last5 - odd.points) / odd.points)).toFixed(3)) || 0,
            games: gameStats.slice(0, 20).map(stat => { // Increase limit to 20 games for Last 20 filter
              const gameData = {
                points: 0,
                assists: 0,
                total_rebounds: 0,
                date: fixtureDate
              }
              
              switch (statType.toLowerCase()) {
                case 'points':
                  gameData.points = stat
                  break
                case 'assists':
                  gameData.assists = stat
                  break
                case 'rebounds':
                case 'total_rebounds': // Add this case to handle both formats
                  gameData.total_rebounds = stat
                  break
              }
              
              return gameData
            }),
          }
        }
      })

    // Wait for all player stats to be processed
    const processedOdds = await Promise.all(oddsToProcess)
    
    // Add processed odds to the uniqueProps map
    processedOdds
      .filter((odd): odd is { key: string, data: any } => odd !== null)
      .forEach(odd => uniqueProps.set(odd.key, odd.data))

    const playerOdds = Array.from(uniqueProps.values())
    console.log(`Successfully processed ${playerOdds.length} player props`)
    
    // Log unique teams to help debug
    const teams = new Set(playerOdds.map((player: any) => player.player?.team || 'Unknown'));
    console.log('Unique teams found:', Array.from(teams));
    
    // Log unique fixtures in the processed data
    const processedFixtures = new Set(playerOdds
      .filter((player: any) => player.next_game && player.next_game.home_team && player.next_game.away_team)
      .map((player: any) => `${player.next_game.home_team} vs ${player.next_game.away_team}`));
    console.log('Unique fixtures in processed data:', Array.from(processedFixtures));
    
    // Count players per fixture
    const fixturePlayerCounts: Record<string, number> = {};
    playerOdds.forEach((player: any) => {
      if (player.next_game && player.next_game.home_team && player.next_game.away_team) {
        const fixtureString = `${player.next_game.home_team} vs ${player.next_game.away_team}`;
        fixturePlayerCounts[fixtureString] = (fixturePlayerCounts[fixtureString] || 0) + 1;
      }
    });
    console.log('Players per fixture:', fixturePlayerCounts);
    
    // Check if we're only returning players from one fixture
    if (processedFixtures.size === 1 && limitedFixtures.length > 1) {
      console.warn('WARNING: Only returning players from 1 fixture despite processing multiple fixtures.');
      console.warn('This might indicate a filtering issue in the data processing logic.');
    }

    // Add pagination metadata
    const response = {
      data: playerOdds,
      meta: {
        total_fixtures: fixtures.length,
        processed_fixtures: limitedFixtures.length,
        total_odds: playerOdds.length,
        has_more: limitedFixtures.length < fixtures.length
      }
    };
    
    return NextResponse.json(response)
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