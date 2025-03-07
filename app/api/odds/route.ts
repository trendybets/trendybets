import { NextResponse } from "next/server"
import { serverEnv } from "@/lib/env"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Add this line to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic'
// Increase the maximum duration for this route to handle loading all fixtures
export const maxDuration = 300; // 5 minutes timeout

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to normalize team names for comparison
const normalizeTeamName = (name: string) => {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/\./g, '')  // Remove periods
    .replace(/-/g, '')   // Remove hyphens
    .replace(/^the/i, ''); // Remove leading "the"
};

// Helper function to normalize player IDs for consistent lookup
const normalizePlayerId = (id: string) => {
  if (!id) return '';
  return id.toUpperCase(); // Convert to uppercase for consistency
};

// Helper function to calculate hit rates
    const calculateHitRate = (arr: number[], line: number) =>
      arr.length ? arr.filter(stat => stat > line).length / arr.length : 0

export async function GET(request: Request) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const fixtureId = url.searchParams.get('fixture_id');
    const limit = parseInt(url.searchParams.get('limit') || '0'); // Default to 0 (no limit)
    
    console.log(`API request received with fixtureId=${fixtureId}, limit=${limit}`);
    
    // Fetch active fixtures from OpticOdds API using the active endpoint
    console.log('Fetching active fixtures from OpticOdds API');
    
    const fixturesUrl = `https://api.opticodds.com/api/v3/fixtures/active?` +
      `sport=basketball&` +
      `league=nba&` +
      `season_type=regular%20season&` +
      `is_live=false&` +
      `key=${serverEnv.OPTIC_ODDS_API_KEY}`;

    const fixturesResponse = await fetch(fixturesUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store' // Disable caching to ensure fresh data
    });

    if (!fixturesResponse.ok) {
      throw new Error(`Failed to fetch fixtures: ${fixturesResponse.status}`);
    }
    
    const fixturesData = await fixturesResponse.json();
    const fixtures = fixturesData.data || [];
    
    console.log('Number of fixtures found:', fixtures.length || 0);
    
    if (!fixtures || fixtures.length === 0) {
      console.warn('No fixtures found, returning empty array');
      return NextResponse.json({ data: [], meta: { total_fixtures: 0 } });
    }

    // Determine which fixtures to process
    let limitedFixtures: any[];
    if (fixtureId) {
      // If a specific fixture ID is requested, filter to just that one
      limitedFixtures = fixtures.filter((f: any) => f.id === fixtureId);
      console.log(`Filtering to specific fixture ID: ${fixtureId}`);
    } else if (limit > 0) {
      // If a positive limit is specified, limit the number of fixtures
      limitedFixtures = fixtures.slice(0, limit);
      console.log(`Limiting to ${limit} fixtures`);
    } else {
      // Otherwise, process ALL fixtures
      limitedFixtures = [...fixtures];
      console.log(`Processing all ${fixtures.length} fixtures`);
    }

    // Use Promise.all to fetch odds for all fixtures in parallel
    const fixtureOddsPromises = limitedFixtures.map(async (fixture: any) => {
      console.log(`Processing fixture ${fixture.id} - ${fixture.home_team_display} vs ${fixture.away_team_display}`);
      
      try {
        // Fetch player odds from OpticOdds API with the correct format
      const oddsUrl = `https://api.opticodds.com/api/v3/fixtures/odds?` +
          `fixture_id=${fixture.id}&` +
        `sportsbook=draftkings&` +
          `market=player%20points&` +
          `market=player%20assists&` +
          `market=player%20rebounds&` +
        `is_main=true&` +
          `key=${serverEnv.OPTIC_ODDS_API_KEY}`;
        
        const oddsResponse = await fetch(oddsUrl, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          cache: 'no-store' // Disable caching to ensure fresh data
        });
        
        if (!oddsResponse.ok) {
          throw new Error(`Failed to fetch odds: ${oddsResponse.status}`);
        }
        
        const oddsData = await oddsResponse.json();
        
        // The API returns a nested structure where odds are inside the first data item's "odds" array
        // Check if we have data and if the first item has an odds array
        const fixtureData = oddsData.data?.[0] || {};
        const fixtureOdds = fixtureData.odds || [];
        
        console.log(`Found ${fixtureOdds.length} odds for fixture ${fixture.id}`);
        
        if (fixtureOdds.length === 0) {
          console.warn(`No player odds found for fixture ${fixture.id} - ${fixture.home_team_display} vs ${fixture.away_team_display}`);
          return [];
        }
        
        return fixtureOdds.map((odd: any) => ({
          ...odd,
          fixture_id: fixture.id,
          home_team_display: fixture.home_team_display,
          away_team_display: fixture.away_team_display
        }));
      } catch (error) {
        console.error(`Error fetching odds for fixture ${fixture.id}:`, error);
        return [];
      }
    });

    const allFixtureOddsArrays = await Promise.all(fixtureOddsPromises);
    const allFixtureOdds = allFixtureOddsArrays.flat();
    
    // Create a map to store unique props by grouping key
    const uniqueProps = new Map();
    
    // Filter odds to only include player points, rebounds, and assists
    const filteredOdds = allFixtureOdds
      .filter((odd: any) => 
        odd.market_id === 'player_points' || 
        odd.market_id === 'player_rebounds' || 
        odd.market_id === 'player_assists'
      );
    
    console.log(`Found ${allFixtureOdds.length} total odds, processing ${filteredOdds.length} after filtering by market type`);
    
    // If we have no filtered odds but have fixture odds, log a sample to debug
    if (filteredOdds.length === 0 && allFixtureOdds.length > 0) {
      console.log('No odds matched our filter criteria. Sample odd:', allFixtureOdds[0]);
      console.log('Market IDs in data:', Array.from(new Set(allFixtureOdds.map((odd: any) => odd.market_id))));
    }
    
    // Get unique player IDs
    const playerIds = Array.from(new Set(filteredOdds.map((odd: any) => odd.player_id)));
    console.log(`Processing ${playerIds.length} unique players`);
    
    // Normalize player IDs for consistent lookup
    const normalizedPlayerIds = playerIds.map(id => normalizePlayerId(id));
    
    // Add debug logging to see what's in the first few odds
    if (allFixtureOdds.length > 0) {
      console.log('Sample odds data:', allFixtureOdds.slice(0, 2));
    }
    
    // Fetch player details from Supabase players table
    const { data: playerDetails, error: playerDetailsError } = await supabase
      .from('players')
      .select('*, team:teams(name)')
      .in('id', normalizedPlayerIds);
    
    if (playerDetailsError) {
      console.warn(`Failed to fetch player details from Supabase: ${playerDetailsError.message}`);
    }
    
    console.log(`Fetched ${playerDetails?.length || 0} player details from Supabase out of ${playerIds.length} unique players`);
    if (playerIds.length > 0 && (!playerDetails || playerDetails.length === 0)) {
      console.warn('No player details found in Supabase. Sample player IDs:', playerIds.slice(0, 5));
    }
    
    // Create a map for quick player lookup
    const playerDetailsMap = new Map();
    playerDetails?.forEach(player => {
      playerDetailsMap.set(normalizePlayerId(player.id), player);
    });
    
    // Fetch player history from Supabase player_history table
    const { data: playerHistory, error: playerHistoryError } = await supabase
      .from('player_history')
      .select('*')
      .in('player_id', normalizedPlayerIds);
    
    if (playerHistoryError) {
      console.warn(`Failed to fetch player history from Supabase: ${playerHistoryError.message}`);
    }
    
    console.log(`Fetched ${playerHistory?.length || 0} player history records from Supabase`);
    if (playerIds.length > 0 && (!playerHistory || playerHistory.length === 0)) {
      console.warn('No player history found in Supabase. Sample player IDs:', playerIds.slice(0, 5));
    } else if (playerHistory && playerHistory.length > 0) {
      // Log sample of player history to debug
      console.log('Sample player history record:', playerHistory[0]);
      
      // Count history records per player
      const playerHistoryCounts = new Map();
      playerHistory.forEach(history => {
        const playerId = history.player_id;
        playerHistoryCounts.set(playerId, (playerHistoryCounts.get(playerId) || 0) + 1);
      });
      
      // Log players with most and least history
      const playerCountsArray = Array.from(playerHistoryCounts.entries());
      const playersWithMostHistory = playerCountsArray
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      const playersWithLeastHistory = playerCountsArray
        .sort((a, b) => a[1] - b[1])
        .slice(0, 5);
      
      console.log('Players with most history records:', 
        playersWithMostHistory.map(([id, count]) => ({
          id,
          name: playerDetailsMap.get(id)?.full_name || 'Unknown',
          count
        }))
      );
      
      console.log('Players with least history records:', 
        playersWithLeastHistory.map(([id, count]) => ({
          id,
          name: playerDetailsMap.get(id)?.full_name || 'Unknown',
          count
        }))
      );
      
      // Check for players with no history
      const playersWithNoHistory = playerIds.filter(id => !playerHistoryCounts.has(id));
      if (playersWithNoHistory.length > 0) {
        console.log('Players with no history records:', 
          playersWithNoHistory.slice(0, 10).map(id => ({
            id,
            name: playerDetailsMap.get(id)?.full_name || 'Unknown'
          }))
        );
      }
    }
    
    // Group player history by player and stat type
    const playerHistoryMap = new Map();
    playerHistory?.forEach(history => {
      // Normalize player ID
      const normalizedPlayerId = normalizePlayerId(history.player_id);
      
      // Create keys for different stat types
      const pointsKey = `${normalizedPlayerId}:points`;
      const assistsKey = `${normalizedPlayerId}:assists`;
      const reboundsKey = `${normalizedPlayerId}:rebounds`;
      
      // Initialize arrays if they don't exist
      if (!playerHistoryMap.has(pointsKey)) {
        playerHistoryMap.set(pointsKey, []);
      }
      if (!playerHistoryMap.has(assistsKey)) {
        playerHistoryMap.set(assistsKey, []);
      }
      if (!playerHistoryMap.has(reboundsKey)) {
        playerHistoryMap.set(reboundsKey, []);
      }
      
      // Add the stats to their respective arrays
      playerHistoryMap.get(pointsKey).push({
        game_date: history.start_date,
        stat_value: history.points
      });
      
      playerHistoryMap.get(assistsKey).push({
        game_date: history.start_date,
        stat_value: history.assists
      });
      
      playerHistoryMap.get(reboundsKey).push({
        game_date: history.start_date,
        stat_value: history.total_rebounds
      });
    });
    
    // Log stats for a few players to debug
    if (playerIds.length > 0) {
      const samplePlayerIds = playerIds.slice(0, 3);
      samplePlayerIds.forEach(playerId => {
        const normalizedPlayerId = normalizePlayerId(playerId);
        const playerName = playerDetailsMap.get(normalizedPlayerId)?.full_name || 'Unknown';
        const pointsHistory = playerHistoryMap.get(`${normalizedPlayerId}:points`) || [];
        const assistsHistory = playerHistoryMap.get(`${normalizedPlayerId}:assists`) || [];
        const reboundsHistory = playerHistoryMap.get(`${normalizedPlayerId}:rebounds`) || [];
        
        console.log(`Stats for ${playerName} (${playerId}):`, {
          pointsCount: pointsHistory.length,
          assistsCount: assistsHistory.length,
          reboundsCount: reboundsHistory.length
        });
      });
      
      // Check for missing history by stat type
      const statTypes = ['points', 'assists', 'rebounds'];
      const missingHistoryByStatType = new Map();
      
      statTypes.forEach(statType => {
        const playersWithNoHistoryForStat = playerIds.filter(id => {
          const normalizedId = normalizePlayerId(id);
          const historyKey = `${normalizedId}:${statType}`;
          const history = playerHistoryMap.get(historyKey) || [];
          return history.length === 0;
        });
        
        missingHistoryByStatType.set(statType, playersWithNoHistoryForStat.length);
        
        if (playersWithNoHistoryForStat.length > 0) {
          console.log(`Players missing ${statType} history: ${playersWithNoHistoryForStat.length} out of ${playerIds.length}`);
          console.log('Sample players missing history:', playersWithNoHistoryForStat.slice(0, 5).map(id => {
            const normalizedId = normalizePlayerId(id);
            return {
              id,
              name: playerDetailsMap.get(normalizedId)?.full_name || 'Unknown'
            };
          }));
        }
      });
    }
    
    // Even if we don't have player history, we should still return player odds
    // Let's create a minimal set of player data to return
    const oddsToProcess = filteredOdds.map(async (odd: any) => {
      const key = `${odd.player_id}:${odd.market_id}:${odd.points}`;
      if (uniqueProps.has(key)) return null;
      
      const normalizedPlayerId = normalizePlayerId(odd.player_id);
      const playerDetail = playerDetailsMap.get(normalizedPlayerId);
      
      // Map market_id to stat type
      let statType = 'Points';
      if (odd.market_id === 'player_rebounds') {
        statType = 'Rebounds';
      } else if (odd.market_id === 'player_assists') {
        statType = 'Assists';
      }
      
      // Get player history stats (may be empty if no history found)
      const historyKey = `${normalizedPlayerId}:${statType.toLowerCase()}`;
      let playerGameStats = playerHistoryMap.get(historyKey) || [];
      
      // If we don't have history for this player, try to fetch it directly
      if (playerGameStats.length === 0) {
        try {
          console.log(`No history found for ${odd.selection || 'Unknown'} (${odd.player_id}), fetching directly...`);
          
          // Try different formats of the player ID
          const possiblePlayerIds = [
            odd.player_id,                    // Original ID
            normalizePlayerId(odd.player_id), // Normalized ID (uppercase)
            odd.player_id.toLowerCase(),      // Lowercase ID
            odd.player_id.replace(/[^a-zA-Z0-9]/g, '') // Alphanumeric only
          ];
          
          // Log the possible IDs we're trying
          console.log(`Trying possible player IDs for ${odd.selection || 'Unknown'}:`, possiblePlayerIds);
          
          // Fetch player history directly from the database for this specific player
          const { data: directHistory, error: directHistoryError } = await supabase
            .from('player_history')
            .select('*')
            .in('player_id', possiblePlayerIds)
            .order('start_date', { ascending: false })
            .limit(20);
          
          if (directHistoryError) {
            console.warn(`Failed to fetch direct history for ${odd.player_id}: ${directHistoryError.message}`);
          } else if (directHistory && directHistory.length > 0) {
            console.log(`Found ${directHistory.length} direct history records for ${odd.selection || 'Unknown'} (${odd.player_id})`);
            
            // Map the history to the correct format based on stat type
            playerGameStats = directHistory.map((game: any) => ({
              game_date: game.start_date,
              stat_value: statType === 'Points' ? game.points : 
                         statType === 'Assists' ? game.assists : 
                         game.total_rebounds
            }));
          } else {
            // If we still don't have history, try to find the player by name
            if (odd.selection) {
              console.log(`Trying to find player by name: ${odd.selection}`);
              
              // First, try to find the player in the players table
              const { data: playerByName, error: playerByNameError } = await supabase
                .from('players')
                .select('id, full_name')
                .ilike('full_name', `%${odd.selection}%`)
                .limit(5);
              
              if (playerByNameError) {
                console.warn(`Failed to find player by name: ${playerByNameError.message}`);
              } else if (playerByName && playerByName.length > 0) {
                console.log(`Found ${playerByName.length} players matching name "${odd.selection}":`, 
                  playerByName.map(p => ({ id: p.id, name: p.full_name }))
                );
                
                // Try to fetch history for the first matching player
                const matchedPlayerId = playerByName[0].id;
                
                const { data: nameMatchHistory, error: nameMatchHistoryError } = await supabase
                  .from('player_history')
                  .select('*')
                  .eq('player_id', matchedPlayerId)
                  .order('start_date', { ascending: false })
                  .limit(20);
                
                if (nameMatchHistoryError) {
                  console.warn(`Failed to fetch history for matched player ${matchedPlayerId}: ${nameMatchHistoryError.message}`);
                } else if (nameMatchHistory && nameMatchHistory.length > 0) {
                  console.log(`Found ${nameMatchHistory.length} history records for matched player ${playerByName[0].full_name} (${matchedPlayerId})`);
                  
                  // Map the history to the correct format based on stat type
                  playerGameStats = nameMatchHistory.map((game: any) => ({
                    game_date: game.start_date,
                    stat_value: statType === 'Points' ? game.points : 
                               statType === 'Assists' ? game.assists : 
                               game.total_rebounds
                  }));
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching direct history for ${odd.player_id}:`, error);
        }
      }
      
      // Sort stats by date (most recent first)
      playerGameStats.sort((a: any, b: any) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime());
      
      // Extract stat values
      const gameStats = playerGameStats.map((game: any) => game.stat_value);
      const last5Games = gameStats.slice(0, 5);
      const last10Games = gameStats.slice(0, 10);
      const allGames = gameStats;
      
      // Calculate averages
      const calculateAverage = (arr: number[]) => {
        if (arr.length === 0) return 0;
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
      };
      
      const averages = {
        last5: calculateAverage(last5Games),
        last10: calculateAverage(last10Games),
        season: calculateAverage(allGames)
      };
      
      // Calculate hit rates
      const hitRates = {
        last5: calculateHitRate(last5Games, odd.points),
        last10: calculateHitRate(last10Games, odd.points),
        season: calculateHitRate(allGames, odd.points)
      };
      
      // Find the fixture for this odd
      const fixture = limitedFixtures.find((f: any) => f.id === odd.fixture_id);
      const fixtureDate = fixture?.start_date || new Date().toISOString();
      
      // Get home and away teams
      const homeTeam = fixture?.home_team_display || '';
      const awayTeam = fixture?.away_team_display || '';
      
      // If we don't have player details, try to fetch from OpticOdds API as fallback
      if (!playerDetail) {
        try {
          console.log(`No player details found in Supabase for ${odd.player_id}, using selection name: ${odd.selection}`);
        } catch (error) {
          console.error(`Failed to fetch details for player ${odd.player_id}:`, error);
        }
      }
      
      // Get updated player detail (might have been fetched from API)
      const updatedPlayerDetail = playerDetailsMap.get(normalizedPlayerId);

        return {
          key,
          data: {
            id: odd.id,
            player: {
              id: odd.player_id,
            name: updatedPlayerDetail?.full_name || odd.selection || 'Unknown',
            team: updatedPlayerDetail?.team?.name || odd.team_id || 
                  (fixture && odd.selection_line === 'over' && 
                   normalizeTeamName(homeTeam) === normalizeTeamName(odd.normalized_selection) ? homeTeam : 
                   normalizeTeamName(awayTeam) === normalizeTeamName(odd.normalized_selection) ? awayTeam : 'Unknown'),
            position: updatedPlayerDetail?.position || 'Unknown',
            image_url: updatedPlayerDetail?.logo || `https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/${odd.player_id}.png`,
            },
            stat_type: statType,
            line: parseFloat(odd.points) || 0,
            averages: {
            last5: parseFloat(averages.last5.toFixed(1)) || 0,
            last10: parseFloat(averages.last10.toFixed(1)) || 0,
            season: parseFloat(averages.season.toFixed(1)) || 0,
            },
            hit_rates: {
              last5: parseFloat(hitRates.last5.toFixed(3)) || 0,
              last10: parseFloat(hitRates.last10.toFixed(3)) || 0,
              season: parseFloat(hitRates.season.toFixed(3)) || 0,
            },
          current_streak: 0, // Default to 0 if we don't have history
            recommended_bet: {
            type: 'over', // Default to over if we don't have history
            confidence: 'low',
            reason: playerGameStats.length > 0 ? 
              `${Math.round((hitRates.last5 || 0) * 100)}% hit rate in L5` : 
              'No historical data available',
            },
            next_game: {
              fixture_id: odd.fixture_id,
            opponent: awayTeam, // Default to away team as opponent
              date: fixtureDate,
              home_team: homeTeam,
              away_team: awayTeam
            },
          trend_strength: playerGameStats.length > 0 ? 
            parseFloat((Math.abs((averages.last5 - odd.points) / odd.points)).toFixed(3)) || 0 : 
            0,
          games: playerGameStats.slice(0, 20).map((game: any) => {
              const gameData = {
                points: 0,
                assists: 0,
                total_rebounds: 0,
              date: game.game_date
            };
              
              switch (statType.toLowerCase()) {
                case 'points':
                gameData.points = game.stat_value;
                break;
                case 'assists':
                gameData.assists = game.stat_value;
                break;
                case 'rebounds':
                gameData.total_rebounds = game.stat_value;
                break;
              }
              
            return gameData;
            }),
        }
      };
    });

    // Wait for all player stats to be processed
    const processedOdds = await Promise.all(oddsToProcess);
    
    // Add processed odds to the uniqueProps map
    processedOdds
      .filter((odd: any): odd is { key: string, data: any } => odd !== null)
      .forEach((odd: any) => uniqueProps.set(odd.key, odd.data));
    
    const playerOdds = Array.from(uniqueProps.values());
    console.log(`Successfully processed ${playerOdds.length} player props`);

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
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/odds:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch player odds',
        details: error instanceof Error ? error.stack : undefined,
        data: [] // Return empty data array to prevent frontend errors
      },
      { status: 500 }
    );
  }
} 