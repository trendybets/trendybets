/**
 * Direct Sync - Player Odds
 * 
 * Fetches player proposition odds from the API
 * and updates Supabase without going through Next.js API routes
 * 
 * This syncs player-specific betting markets like points, assists, rebounds, etc.
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
const DELAY_BETWEEN_REQUESTS = 300; // ms - reduced delay to speed up sync
const MAX_FIXTURES_PER_BATCH = 10; // Increased batch size for faster processing
const UPSERT_BATCH_SIZE = 250; // Optimized batch size for database operations

// Target sportsbooks to sync
const TARGET_SPORTSBOOKS = [
  'betmgm',
  'draftkings',
  'caesars',
  'bet365'
];

// Target markets to sync
const TARGET_MARKETS = [
  'player points',
  'player assists',
  'player rebounds',
  'player made threes',
  'player points + rebounds',
  'player points + rebounds + assists',
  'player points + assists',
  'first basket',
  'player steals',
  'player blocks'
];

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
async function syncPlayerOdds() {
  const syncName = 'player-odds';
  let syncLogId;
  let totalProcessedCount = 0;
  let updatedCount = 0;
  let insertedCount = 0;
  let removedCount = 0;
  
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
    
    // Set a timestamp for tracking all odds processed in this sync run
    const thisSyncTime = new Date().toISOString();
    
    // First, get active fixtures to fetch player odds for
    console.log('Fetching active fixtures...');
    const { data: activeFixtures, error: fixturesError } = await supabase
      .from('fixtures')
      .select('id, league_id, start_date')
      .gt('start_date', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()) // Only fixtures starting within 12 hours ago
      .lt('start_date', new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString()) // Only fixtures starting in the next 36 hours
      .order('start_date', { ascending: true });
    
    if (fixturesError) {
      throw new Error(`Error fetching active fixtures: ${fixturesError.message}`);
    }
    
    if (!activeFixtures || activeFixtures.length === 0) {
      console.log('No active fixtures found to fetch player odds for');
      
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
      
      return { processed: 0, updated: 0, removed: 0 };
    }
    
    console.log(`Found ${activeFixtures.length} active fixtures to fetch player odds for`);
    
    // Process fixtures in batches to avoid overwhelming the API
    for (let i = 0; i < activeFixtures.length; i += MAX_FIXTURES_PER_BATCH) {
      const batch = activeFixtures.slice(i, i + MAX_FIXTURES_PER_BATCH);
      console.log(`Processing batch ${Math.floor(i / MAX_FIXTURES_PER_BATCH) + 1} of ${Math.ceil(activeFixtures.length / MAX_FIXTURES_PER_BATCH)}`);
      
      // Get all existing IDs for player odds first to avoid primary key conflicts
      const fixtureIds = batch.map(fixture => fixture.id);
      const { data: existingOddsIds } = await supabase
        .from('player_odds')
        .select('id')
        .in('fixture_id', fixtureIds);
      
      // Create a set of existing IDs for fast lookups
      const existingIdsSet = new Set();
      if (existingOddsIds && existingOddsIds.length > 0) {
        existingOddsIds.forEach(odd => existingIdsSet.add(odd.id));
      }
      console.log(`Found ${existingIdsSet.size} existing player odds IDs for this batch of fixtures`);
      
      for (const fixture of batch) {
        console.log(`Fetching player odds for fixture: ${fixture.id}`);
        
        // Build the params for the API request
        const params = {
          fixture_id: fixture.id,
          is_main: true,
          sportsbook: TARGET_SPORTSBOOKS,
          market: TARGET_MARKETS
        };
        
        try {
          // Build the URL
          const url = buildApiUrl('fixtures/odds', params);
          
          // Fetch odds from API
          const response = await axios.get(url);
          
          if (!response.data || !response.data.data || response.data.data.length === 0) {
            console.warn(`No player odds data returned for fixture ${fixture.id}`);
            continue;
          }
          
          // Get odds for this fixture
          const fixtureData = response.data.data[0];
          
          if (!fixtureData.odds || fixtureData.odds.length === 0) {
            console.warn(`No odds in response for fixture ${fixture.id}`);
            continue;
          }
          
          const leagueId = fixtureData.league?.id || fixture.league_id;
          const startDate = fixtureData.start_date || fixture.start_date;
          
          console.log(`Processing ${fixtureData.odds.length} player odds for fixture ${fixture.id}`);
          
          // Filter the odds to include only those for player markets
          const playerOdds = fixtureData.odds.filter(odd => 
            TARGET_MARKETS.some(market => 
              odd.market?.toLowerCase() === market.toLowerCase())
          );
          
          console.log(`Found ${playerOdds.length} player odds for target markets`);
          
          if (playerOdds.length === 0) {
            continue;
          }
          
          // Get composite key map for existing odds
          const { data: existingOdds } = await supabase
            .from('player_odds')
            .select('id, sportsbook, market_id, selection, selection_line, price, points')
            .eq('fixture_id', fixture.id);
          
          // Create lookup maps for existing odds
          const existingOddsCompositeMap = {};
          if (existingOdds && existingOdds.length > 0) {
            existingOdds.forEach(odd => {
              const key = `${odd.sportsbook}:${odd.market_id}:${odd.selection}:${odd.selection_line}`;
              existingOddsCompositeMap[key] = odd;
            });
          }
          
          // Prepare records for upsert - collect all odds for this fixture
          const recordsToUpsert = [];
          
          for (const odd of playerOdds) {
            // Check if this ID already exists (to avoid primary key violations)
            if (existingIdsSet.has(odd.id)) {
              // This exact ID exists, we'll need to create a new unique ID
              // Create a composite key to check if we have a record with the same business attributes
              const compositeKey = `${odd.sportsbook}:${odd.market_id}:${odd.selection}:${odd.selection_line}`;
              const existingOdd = existingOddsCompositeMap[compositeKey];
              
              if (existingOdd) {
                // If it exists by composite key, use that existing ID
                recordsToUpsert.push({
                  id: existingOdd.id,
                  fixture_id: fixture.id,
                  sportsbook: odd.sportsbook,
                  market: odd.market,
                  name: odd.name,
                  is_main: odd.is_main,
                  selection: odd.selection,
                  normalized_selection: odd.normalized_selection,
                  market_id: odd.market_id,
                  selection_line: odd.selection_line,
                  player_id: odd.player_id,
                  team_id: odd.team_id,
                  price: odd.price,
                  points: odd.points,
                  timestamp: odd.timestamp,
                  start_date: startDate,
                  league_id: leagueId,
                  last_synced_at: thisSyncTime
                });
                
                // If values changed, count as update, otherwise it's a "noop"
                if (existingOdd.price !== odd.price || existingOdd.points !== odd.points) {
                  updatedCount++;
                }
              } else {
                // It exists by ID but not by composite key - generate a unique ID
                const newId = `${odd.id}_${Date.now().toString(36)}`;
                recordsToUpsert.push({
                  id: newId,
                  fixture_id: fixture.id,
                  sportsbook: odd.sportsbook,
                  market: odd.market,
                  name: odd.name,
                  is_main: odd.is_main,
                  selection: odd.selection,
                  normalized_selection: odd.normalized_selection,
                  market_id: odd.market_id,
                  selection_line: odd.selection_line,
                  player_id: odd.player_id,
                  team_id: odd.team_id,
                  price: odd.price,
                  points: odd.points,
                  timestamp: odd.timestamp,
                  start_date: startDate,
                  league_id: leagueId,
                  last_synced_at: thisSyncTime
                });
                insertedCount++;
              }
            } else {
              // This ID doesn't exist yet, we can use it as-is
              // But check if there's a record with the same business attributes
              const compositeKey = `${odd.sportsbook}:${odd.market_id}:${odd.selection}:${odd.selection_line}`;
              const existingOdd = existingOddsCompositeMap[compositeKey];
              
              if (existingOdd) {
                // If it exists by composite key, use that existing ID
                recordsToUpsert.push({
                  id: existingOdd.id,
                  fixture_id: fixture.id,
                  sportsbook: odd.sportsbook,
                  market: odd.market,
                  name: odd.name,
                  is_main: odd.is_main,
                  selection: odd.selection,
                  normalized_selection: odd.normalized_selection,
                  market_id: odd.market_id,
                  selection_line: odd.selection_line,
                  player_id: odd.player_id,
                  team_id: odd.team_id,
                  price: odd.price,
                  points: odd.points,
                  timestamp: odd.timestamp,
                  start_date: startDate,
                  league_id: leagueId,
                  last_synced_at: thisSyncTime
                });
                
                // If values changed, count as update, otherwise it's a "noop"
                if (existingOdd.price !== odd.price || existingOdd.points !== odd.points) {
                  updatedCount++;
                }
              } else {
                // It's completely new
                recordsToUpsert.push({
                  id: odd.id,
                  fixture_id: fixture.id,
                  sportsbook: odd.sportsbook,
                  market: odd.market,
                  name: odd.name,
                  is_main: odd.is_main,
                  selection: odd.selection,
                  normalized_selection: odd.normalized_selection,
                  market_id: odd.market_id,
                  selection_line: odd.selection_line,
                  player_id: odd.player_id,
                  team_id: odd.team_id,
                  price: odd.price,
                  points: odd.points,
                  timestamp: odd.timestamp,
                  start_date: startDate,
                  league_id: leagueId,
                  last_synced_at: thisSyncTime
                });
                insertedCount++;
                
                // Add this ID to the set to avoid future conflicts
                existingIdsSet.add(odd.id);
              }
            }
          }
          
          // Process records in optimally sized batches
          console.log(`Upserting ${recordsToUpsert.length} player odds for fixture ${fixture.id}`);
          for (let i = 0; i < recordsToUpsert.length; i += UPSERT_BATCH_SIZE) {
            const batchToUpsert = recordsToUpsert.slice(i, i + UPSERT_BATCH_SIZE);
            
            // Upsert the batch
            const { error } = await supabase
              .from('player_odds')
              .upsert(batchToUpsert, { 
                onConflict: 'id',
                ignoreDuplicates: false // Update on conflict
              });
            
            if (error) {
              console.error(`Error upserting player odds batch ${Math.floor(i/UPSERT_BATCH_SIZE) + 1} for fixture ${fixture.id}:`, error);
            } else {
              console.log(`Successfully upserted batch ${Math.floor(i/UPSERT_BATCH_SIZE) + 1} of player odds for fixture ${fixture.id}`);
            }
          }
          
          totalProcessedCount += playerOdds.length;
          
          const newCount = insertedCount;
          const changedCount = updatedCount;
          
          console.log(`Processed ${playerOdds.length} player odds for fixture ${fixture.id} (${newCount} new, ${changedCount} updated with new values)`);
          
        } catch (error) {
          console.error(`Error fetching player odds for fixture ${fixture.id}:`, error.message);
          if (error.response) {
            console.error('API Response:', error.response.data);
          }
        }
        
        // Add a delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }
      
      console.log(`Completed batch ${Math.floor(i / MAX_FIXTURES_PER_BATCH) + 1}`);
    }
    
    // Clean up old player odds that are no longer present in the API
    // Only do this for fixtures that we just processed
    // and only for odds that weren't updated in this sync run
    console.log('Cleaning up old player odds...');
    
    const fixtureIds = activeFixtures.map(fixture => fixture.id);
    const { data: removedOdds, error: removeError } = await supabase
      .from('player_odds')
      .delete({ count: 'exact' })
      .in('fixture_id', fixtureIds)
      .neq('last_synced_at', thisSyncTime)
      .select('id');
    
    if (removeError) {
      console.error('Error removing old player odds:', removeError);
    } else {
      removedCount = removedOdds.length || 0;
      console.log(`Removed ${removedCount} old player odds`);
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
    
    console.log(`Sync completed: ${totalProcessedCount} player odds processed, ${insertedCount} new, ${updatedCount} updated with new values, ${removedCount} removed`);
    return { 
      processed: totalProcessedCount, 
      inserted: insertedCount,
      updated: updatedCount,
      removed: removedCount 
    };
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
  syncPlayerOdds()
    .then(result => {
      console.log('Player Odds sync completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Player Odds sync failed:', error);
      process.exit(1);
    });
}

module.exports = {
  syncPlayerOdds
}; 