/**
 * Direct Sync - Fixture Results
 * 
 * Fetches detailed results for completed fixtures from the API 
 * and updates Supabase without going through Next.js API routes
 * 
 * Uses the fixtures_completed table to identify which fixtures to fetch
 */

require('dotenv').config({ path: '../../.env.local' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// External API configuration
const API_KEY = process.env.OPTIC_ODDS_API_KEY;
const API_BASE = 'https://api.opticodds.com/api/v3';

// Constants
const MAX_BATCH_SIZE = 10; // Process this many fixtures at a time
const DELAY_BETWEEN_REQUESTS = 500; // ms
const FIXTURES_COMPLETED_PAGE_SIZE = 1000; // How many completed fixtures to fetch per page

/**
 * Helper function to build URL with properly formatted parameters
 */
function buildApiUrl(endpoint, params) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  
  // Add the API key
  url.searchParams.append('key', API_KEY);
  
  // Add all other parameters
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      // For arrays, add multiple parameters with the same name
      value.forEach(item => {
        url.searchParams.append(key, item);
      });
    } else if (value !== undefined && value !== null) {
      // For scalar values, add a single parameter
      url.searchParams.append(key, value);
    }
  }
  
  return url.toString();
}

/**
 * Main sync function
 */
async function syncFixtureResults() {
  const syncName = 'fixture-results';
  let syncLogId;
  let totalProcessedCount = 0;
  let updatedCount = 0;
  
  try {
    // Log the start of the sync
    const { data: logData, error: logError } = await supabase.from('sync_log').insert({
      sync_type: syncName,
      started_at: new Date(),
      status: 'started',
      last_sync_date: new Date(),
      records_processed: 0
    }).select('id');
    
    if (logError) {
      console.error('Error logging sync start:', logError);
    } else if (logData && logData.length > 0) {
      syncLogId = logData[0].id;
    }
    
    console.log(`[${syncName}] started`);
    
    // Get the last successful sync time
    const { data: lastSyncData } = await supabase
      .from('sync_log')
      .select('completed_at')
      .eq('sync_type', syncName)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1);
    
    const lastSyncTime = lastSyncData && lastSyncData.length > 0 ? lastSyncData[0].completed_at : null;
    console.log(`Last successful sync: ${lastSyncTime || 'Never'}`);
    
    // Get existing fixture results to avoid duplicates
    const { data: existingResults } = await supabase
      .from('fixture_results')
      .select('id, fixture_id, last_synced_at');
    
    const existingResultsMap = {};
    if (existingResults) {
      existingResults.forEach(result => {
        existingResultsMap[result.fixture_id] = result;
      });
    }
    
    console.log(`Found ${existingResults ? existingResults.length : 0} existing fixture results in database`);
    
    // Fetch completed fixtures with pagination
    let allCompletedFixtures = [];
    let hasMoreFixtures = true;
    let page = 0;
    
    console.log(`Fetching completed fixtures with pagination (${FIXTURES_COMPLETED_PAGE_SIZE} per page)`);
    
    while (hasMoreFixtures) {
      // Get completed fixtures for the current page
      const { data: completedFixtures, error: fixturesError, count } = await supabase
        .from('fixtures_completed')
        .select('id, last_synced_at', { count: 'exact' })
        .order('last_synced_at', { ascending: true })
        .range(page * FIXTURES_COMPLETED_PAGE_SIZE, (page + 1) * FIXTURES_COMPLETED_PAGE_SIZE - 1);
      
      if (fixturesError) {
        throw new Error(`Error fetching completed fixtures: ${fixturesError.message}`);
      }
      
      if (!completedFixtures || completedFixtures.length === 0) {
        hasMoreFixtures = false;
      } else {
        console.log(`Fetched ${completedFixtures.length} completed fixtures (page ${page + 1})`);
        allCompletedFixtures = allCompletedFixtures.concat(completedFixtures);
        
        // Check if we need to fetch more pages
        hasMoreFixtures = completedFixtures.length === FIXTURES_COMPLETED_PAGE_SIZE;
        page++;
      }
    }
    
    if (allCompletedFixtures.length === 0) {
      console.log('No completed fixtures found to fetch results for');
      
      // Log completion (no fixtures to process)
      if (syncLogId) {
        const { error: updateError } = await supabase
          .from('sync_log')
          .update({
            completed_at: new Date(),
            status: 'completed',
            records_processed: 0
          })
          .eq('id', syncLogId);
        
        if (updateError) {
          console.error('Error updating sync log:', updateError);
        }
      }
      
      return { processed: 0, updated: 0 };
    }
    
    console.log(`Found ${allCompletedFixtures.length} total completed fixtures after pagination`);
    
    // Prioritize fixtures that don't have results yet
    const fixturesToProcess = allCompletedFixtures
      .filter(fixture => !existingResultsMap[fixture.id] || !existingResultsMap[fixture.id].last_synced_at)
      .concat(
        allCompletedFixtures.filter(fixture => existingResultsMap[fixture.id] && existingResultsMap[fixture.id].last_synced_at)
      );
    
    console.log(`Processing fixtures in batches of ${MAX_BATCH_SIZE}`);
    
    // Process fixtures in batches to avoid overwhelming the API
    for (let i = 0; i < fixturesToProcess.length; i += MAX_BATCH_SIZE) {
      const batch = fixturesToProcess.slice(i, i + MAX_BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / MAX_BATCH_SIZE) + 1} of ${Math.ceil(fixturesToProcess.length / MAX_BATCH_SIZE)}`);
      
      // Process each fixture in the batch
      for (const fixture of batch) {
        const fixtureId = fixture.id;
        
        // Skip if we've already synced this fixture recently (within 24 hours)
        const existingResult = existingResultsMap[fixtureId];
        if (existingResult && existingResult.last_synced_at) {
          const lastSynced = new Date(existingResult.last_synced_at);
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          
          if (lastSynced > oneDayAgo) {
            console.log(`Skipping fixture ${fixtureId} - synced recently on ${lastSynced.toISOString()}`);
            continue;
          }
        }
        
        console.log(`Fetching results for fixture: ${fixtureId}`);
        
        try {
          // Build the URL to fetch fixture results
          const url = buildApiUrl('fixtures/results', {
            fixture_id: fixtureId
          });
          
          // Fetch results from API
          const response = await axios.get(url);
          
          if (!response.data || !response.data.data || response.data.data.length === 0) {
            console.warn(`No results data returned for fixture ${fixtureId}`);
            continue;
          }
          
          const resultData = response.data.data[0];
          totalProcessedCount++;
          
          // Extract fixture info and scores
          const fixtureInfo = resultData.fixture || {};
          const scores = resultData.scores || { home: {}, away: {} };
          const homeStats = (resultData.stats?.home?.[0]?.stats) || {};
          const awayStats = (resultData.stats?.away?.[0]?.stats) || {};
          
          // Map API fields to database fields
          const resultRecord = {
            id: fixtureId, // Using fixture ID as the result ID
            fixture_id: fixtureId,
            game_id: fixtureInfo.game_id,
            start_date: fixtureInfo.start_date,
            home_team_id: fixtureInfo.home_competitors?.[0]?.id,
            away_team_id: fixtureInfo.away_competitors?.[0]?.id,
            home_team_display: fixtureInfo.home_team_display,
            away_team_display: fixtureInfo.away_team_display,
            season_type: fixtureInfo.season_type,
            season_year: fixtureInfo.season_year,
            venue_name: fixtureInfo.venue_name,
            
            // Home scores
            home_total: scores.home?.total,
            home_period_1: scores.home?.periods?.period_1,
            home_period_2: scores.home?.periods?.period_2,
            home_period_3: scores.home?.periods?.period_3,
            home_period_4: scores.home?.periods?.period_4,
            
            // Away scores
            away_total: scores.away?.total,
            away_period_1: scores.away?.periods?.period_1,
            away_period_2: scores.away?.periods?.period_2,
            away_period_3: scores.away?.periods?.period_3,
            away_period_4: scores.away?.periods?.period_4,
            
            // Home team stats
            home_dunks: homeStats.dunks,
            home_fouls: homeStats.fouls,
            home_blocks: homeStats.blocks,
            home_points: homeStats.points,
            home_steals: homeStats.steals,
            home_assists: homeStats.assists,
            home_turnovers: homeStats.turnovers,
            home_team_rebounds: homeStats.team_rebounds,
            home_total_rebounds: homeStats.total_rebounds,
            home_points_in_paint: homeStats.points_in_paint,
            home_field_goals_made: homeStats.field_goals_made,
            home_free_throws_made: homeStats.free_throws_made,
            home_fast_break_points: homeStats.fast_break_points,
            home_defensive_rebounds: homeStats.defensive_rebounds,
            home_offensive_rebounds: homeStats.offensive_rebounds,
            home_points_off_turnovers: homeStats.points_off_turnovers,
            home_second_chance_points: homeStats.second_chance_points,
            home_field_goals_attempted: homeStats.field_goals_attempted,
            home_free_throws_attempted: homeStats.free_throws_attempted,
            home_three_point_made: homeStats.three_point_field_goals_made,
            home_three_point_attempted: homeStats.three_point_field_goals_attempted,
            
            // Away team stats
            away_dunks: awayStats.dunks,
            away_fouls: awayStats.fouls,
            away_blocks: awayStats.blocks,
            away_points: awayStats.points,
            away_steals: awayStats.steals,
            away_assists: awayStats.assists,
            away_turnovers: awayStats.turnovers,
            away_team_rebounds: awayStats.team_rebounds,
            away_total_rebounds: awayStats.total_rebounds,
            away_points_in_paint: awayStats.points_in_paint,
            away_field_goals_made: awayStats.field_goals_made,
            away_free_throws_made: awayStats.free_throws_made,
            away_fast_break_points: awayStats.fast_break_points,
            away_defensive_rebounds: awayStats.defensive_rebounds,
            away_offensive_rebounds: awayStats.offensive_rebounds,
            away_points_off_turnovers: awayStats.points_off_turnovers,
            away_second_chance_points: awayStats.second_chance_points,
            away_field_goals_attempted: awayStats.field_goals_attempted,
            away_free_throws_attempted: awayStats.free_throws_attempted,
            away_three_point_made: awayStats.three_point_field_goals_made,
            away_three_point_attempted: awayStats.three_point_field_goals_attempted,
            
            // Tracking
            last_synced_at: new Date().toISOString()
          };
          
          // Use upsert to either insert or update
          const { data, error } = await supabase
            .from('fixture_results')
            .upsert(resultRecord);
          
          if (error) {
            console.error(`Error upserting fixture result ${fixtureId}:`, error);
          } else {
            updatedCount++;
            
            if (existingResult) {
              console.log(`Updated fixture result: ${fixtureId}`);
            } else {
              console.log(`Added new fixture result: ${fixtureId}`);
            }
          }
          
        } catch (error) {
          console.error(`Error fetching results for fixture ${fixtureId}:`, error.message);
          if (error.response) {
            console.error('API Response:', error.response.data);
          }
        }
        
        // Add a delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }
      
      console.log(`Completed batch ${Math.floor(i / MAX_BATCH_SIZE) + 1}`);
    }
    
    // Log completion
    if (syncLogId) {
      const { error: updateError } = await supabase
        .from('sync_log')
        .update({
          completed_at: new Date(),
          status: 'completed',
          records_processed: totalProcessedCount
        })
        .eq('id', syncLogId);
      
      if (updateError) {
        console.error('Error updating sync log:', updateError);
      }
    }
    
    console.log(`Sync completed: ${totalProcessedCount} fixture results processed, ${updatedCount} updated/added`);
    return { processed: totalProcessedCount, updated: updatedCount };
  } catch (error) {
    console.error(`Error syncing ${syncName}:`, error);
    
    if (syncLogId) {
      await supabase
        .from('sync_log')
        .update({
          status: 'error',
          error_message: error.message
        })
        .eq('id', syncLogId);
    }
    
    throw error;
  }
}

// Run the sync if this script is called directly
if (require.main === module) {
  syncFixtureResults()
    .then(result => {
      console.log('Fixture Results sync completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fixture Results sync failed:', error);
      process.exit(1);
    });
}

module.exports = {
  syncFixtureResults
}; 