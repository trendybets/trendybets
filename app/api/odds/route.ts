import { NextResponse } from "next/server"
import { serverEnv } from "@/lib/env"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { normalizeTeamName, normalizePlayerId } from "@/lib/utils"
import { performance } from 'perf_hooks'
import { withCache } from "@/lib/redis"

// Add this line to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic'
// Increase the maximum duration for this route to handle loading all fixtures
export const maxDuration = 300; // 5 minutes timeout

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to calculate hit rates
const calculateHitRate = (arr: number[], line: number) =>
  arr.length ? arr.filter(stat => stat > line).length / arr.length : 0

// Redis cache TTL (5 minutes in seconds)
const CACHE_TTL = 5 * 60;

// Helper function to get cached data or fetch new data
async function getCachedOrFetch(url: string, options: RequestInit = {}) {
  const cacheKey = `api:${url}`;
  
  return withCache(
    cacheKey,
    async () => {
      console.log(`Fetching fresh data for ${url}`);
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      return response.json();
    },
    CACHE_TTL
  );
}

export async function GET(request: Request) {
  const totalStartTime = performance.now();
  try {
    // Get query parameters
    const url = new URL(request.url);
    const fixtureId = url.searchParams.get('fixture_id');
    const limit = parseInt(url.searchParams.get('limit') || '0'); // Default to 0 (no limit)
    const page = parseInt(url.searchParams.get('page') || '1'); // Default to page 1
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20'); // Default to 20 items per page
    
    console.log(`API request received with fixtureId=${fixtureId}, limit=${limit}, page=${page}, pageSize=${pageSize}`);
    
    // Fetch active fixtures from OpticOdds API using the active endpoint
    console.log('Fetching active fixtures from OpticOdds API');
    
    const fixturesUrl = `https://api.opticodds.com/api/v3/fixtures/active?` +
      `sport=basketball&` +
      `league=nba&` +
      `season_type=regular%20season&` +
      `is_live=false&` +
      `key=${serverEnv.OPTIC_ODDS_API_KEY}`;

    // Use cached data if available
    const fixturesData = await getCachedOrFetch(fixturesUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
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
        
        // Use cached data if available
        const oddsData = await getCachedOrFetch(oddsUrl, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        
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
    
    // Create multiple formats of player IDs to ensure we find records regardless of case
    const playerIdFormats = playerIds.flatMap(id => [
      id,                   // Original format
      id.toUpperCase(),     // Uppercase format
      id.toLowerCase()      // Lowercase format
    ]);
    
    // Remove duplicates
    const uniquePlayerIdFormats = Array.from(new Set(playerIdFormats));
    
    console.log(`Querying players table with ${uniquePlayerIdFormats.length} ID format variations`);
    
    // Fetch player details from Supabase players table
    const { data: playerDetails, error: playerDetailsError } = await supabase
      .from('players')
      .select('*, team:teams(name)')
      .in('id', uniquePlayerIdFormats);
    
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
    
    // REMOVE the initial failed batch query and replace with an optimized approach
    // Initialize playerHistoryMap to store player history
    const playerHistoryMap = new Map();
    console.log(`Fetching player history for ${playerIds.length} players (optimized approach)`);
    
    // Process players in batches to avoid hitting request limits
    const BATCH_SIZE = 20;
    const batchesCount = Math.ceil(playerIds.length / BATCH_SIZE);
    console.log(`Will process player history in ${batchesCount} batches of ${BATCH_SIZE} players each`);
    
    // Create a function to fetch history for a batch of players
    // This uses the successful direct query approach for all players
    const fetchHistoryBatch = async (playerIdsBatch: string[]) => {
      const batchFormats = playerIdsBatch.flatMap(id => [
        id,                   // Original format
        id.toUpperCase(),     // Uppercase format
        id.toLowerCase()      // Lowercase format
      ]);
      
      // Remove duplicates
      const uniqueBatchFormats = Array.from(new Set(batchFormats));
      
      const { data: batchHistory, error: batchError } = await supabase
        .from('player_history')
        .select('*')
        .in('player_id', uniqueBatchFormats)
        .order('start_date', { ascending: false });
        
      if (batchError) {
        console.warn(`Failed to fetch history batch: ${batchError.message}`);
        return [];
      }
      
      return batchHistory || [];
    };
    
    // Process all batches
    let totalHistoryRecords = 0;
    
    for (let i = 0; i < batchesCount; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, playerIds.length);
      const currentBatch = playerIds.slice(start, end);
      
      console.log(`Processing history batch ${i+1}/${batchesCount} with ${currentBatch.length} players`);
      const batchResults = await fetchHistoryBatch(currentBatch);
      totalHistoryRecords += batchResults.length;
      
      // Group the history records by player and stat type
      batchResults.forEach(history => {
        // Normalize player ID for consistent lookup
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
    }
    
    console.log(`Successfully fetched ${totalHistoryRecords} player history records for ${playerIds.length} players`);
    
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
      
      // Log if we don't have history for this player (but don't attempt to fetch again)
      if (playerGameStats.length === 0) {
        console.log(`No history found for ${odd.selection || 'Unknown'} (${odd.player_id}) after batch processing`);
      }
      
      // Sort stats by date (most recent first)
      playerGameStats.sort((a: any, b: any) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime());
      
      // Limit to most recent 20 games for consistency
      playerGameStats = playerGameStats.slice(0, 20);
      
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

    // Before pagination, analyze and log game count data
    const gameCountAnalysis: Record<number, number> = {};
    const processedData = playerOdds || [];
    processedData.forEach((playerData: any) => {
      const gameCount = playerData.games?.length || 0;
      gameCountAnalysis[gameCount] = (gameCountAnalysis[gameCount] || 0) + 1;
    });
    
    console.log('Game count distribution:', gameCountAnalysis);
    
    // Log players with fewer than 5 games
    const playersWithFewGames = processedData
      .filter((playerData: any) => (playerData.games?.length || 0) < 5)
      .map((playerData: any) => ({
        name: playerData.player.name,
        gameCount: playerData.games?.length || 0,
        statType: playerData.stat_type
      }));
      
    if (playersWithFewGames.length > 0) {
      console.log(`Found ${playersWithFewGames.length} players with fewer than 5 games. Sample:`, 
        playersWithFewGames.slice(0, 5));
    }
    
    // Calculate percentages for analytics
    const totalPlayers = processedData.length;
    const playersWithAtLeast5Games = processedData.filter((p: any) => (p.games?.length || 0) >= 5).length;
    const playersWithAtLeast10Games = processedData.filter((p: any) => (p.games?.length || 0) >= 10).length;
    const playersWithAtLeast20Games = processedData.filter((p: any) => (p.games?.length || 0) >= 20).length;
    
    console.log('Player game availability statistics:');
    console.log(`- ${(playersWithAtLeast5Games / totalPlayers * 100).toFixed(1)}% have at least 5 games`);
    console.log(`- ${(playersWithAtLeast10Games / totalPlayers * 100).toFixed(1)}% have at least 10 games`);
    console.log(`- ${(playersWithAtLeast20Games / totalPlayers * 100).toFixed(1)}% have at least 20 games`);
    
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
    
    const totalEndTime = performance.now();
    console.log(`Total API execution time: ${totalEndTime - totalStartTime}ms`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in odds API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch odds data' },
      { status: 500 }
    );
  }
} 