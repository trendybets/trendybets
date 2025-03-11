/**
 * Direct Sync - Odds
 * 
 * Fetches odds data directly from the API and updates Supabase
 * without going through Next.js API routes
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

// Target sports and leagues to sync
const TARGET_SPORTS = ['Baseball', 'Basketball'];
const TARGET_LEAGUES = ['MLB', 'NBA', 'NCAAB'];

// Target sportsbooks
const TARGET_SPORTSBOOKS = ['draftkings', 'betmgm', 'caesars', 'bet365'];

// Sport-specific market types
const SPORT_MARKETS = {
  'basketball': ['moneyline', 'point_spread', 'total_points'],
  'baseball': ['moneyline', 'run_line', 'total_runs']
};

/**
 * Helper function to build URL with properly formatted parameters
 * The OpticOdds API expects repeated parameters rather than array notation
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

// Main sync function
async function syncOdds() {
  const syncName = 'odds';
  let syncLogId;
  let totalProcessedCount = 0;
  let updatedCount = 0;
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
    
    // Get active fixtures from the database (unplayed fixtures only)
    const { data: activeFixtures, error: fixturesError } = await supabase
      .from('fixtures')
      .select('id, sport_id, league_id')
      .eq('status', 'unplayed');
    
    if (fixturesError) {
      throw new Error(`Error fetching active fixtures: ${fixturesError.message}`);
    }
    
    if (!activeFixtures || activeFixtures.length === 0) {
      console.log('No active fixtures found to sync odds for');
      
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
    
    // Filter fixtures by target sports and leagues
    const filteredFixtures = activeFixtures.filter(fixture => {
      const sportId = fixture.sport_id ? fixture.sport_id.toLowerCase() : '';
      const leagueId = fixture.league_id ? fixture.league_id.toLowerCase() : '';
      
      return TARGET_SPORTS.map(s => s.toLowerCase()).includes(sportId) &&
             TARGET_LEAGUES.map(l => l.toLowerCase()).includes(leagueId);
    });
    
    console.log(`Found ${filteredFixtures.length} active fixtures in target sports/leagues to sync odds for`);
    
    // Track all odds we process to clean up later
    const processedOddsIds = new Set();
    
    // Group fixtures by sport for efficient processing
    const fixturesBySport = {};
    filteredFixtures.forEach(fixture => {
      const sportId = fixture.sport_id ? fixture.sport_id.toLowerCase() : '';
      if (!fixturesBySport[sportId]) {
        fixturesBySport[sportId] = [];
      }
      fixturesBySport[sportId].push(fixture);
    });
    
    // Process each sport and its fixtures
    for (const sportId in fixturesBySport) {
      const sportFixtures = fixturesBySport[sportId];
      const markets = SPORT_MARKETS[sportId] || ['moneyline'];
      
      console.log(`Processing ${sportFixtures.length} fixtures for sport: ${sportId}`);
      console.log(`Using markets for ${sportId}: ${markets.join(', ')}`);
      
      // Process each fixture for this sport
      for (const fixture of sportFixtures) {
        console.log(`Processing odds for fixture: ${fixture.id}`);
        
        // Build the URL with properly formatted parameters
        const url = buildApiUrl('fixtures/odds', {
          fixture_id: fixture.id,
          sportsbook: TARGET_SPORTSBOOKS,
          market: markets,
          is_main: true
        });
        
        console.log(`Fetching odds from: ${url}`);
        
        // Fetch odds from API for this fixture with sport-specific markets
        try {
          const response = await axios.get(url);
          
          if (!response.data || !response.data.data || response.data.data.length === 0) {
            console.warn(`No odds data returned for fixture ${fixture.id}`);
            continue;
          }
          
          // The API returns a nested structure where odds are inside the first data item's "odds" array
          const fixtureData = response.data.data[0] || {};
          const fixtureOdds = fixtureData.odds || [];
          
          console.log(`Found ${fixtureOdds.length} odds for fixture ${fixture.id}`);
          
          if (fixtureOdds.length === 0) {
            console.warn(`No odds found for fixture ${fixture.id}`);
            continue;
          }
          
          // Get existing odds for this fixture from the database
          const { data: existingOdds } = await supabase
            .from('odds')
            .select('*')
            .eq('fixture_id', fixture.id);
          
          const existingOddsMap = {};
          if (existingOdds) {
            existingOdds.forEach(odd => {
              existingOddsMap[odd.id] = odd;
            });
          }
          
          console.log(`Found ${existingOdds ? existingOdds.length : 0} existing odds in database for fixture ${fixture.id}`);
          
          // Process each odd
          for (const odd of fixtureOdds) {
            totalProcessedCount++;
            
            // Skip if odd doesn't have an ID
            if (!odd.id) {
              console.warn(`Skipping odd without ID for fixture ${fixture.id}`);
              continue;
            }
            
            // Add to our processed IDs set
            processedOddsIds.add(odd.id);
            
            // Map API fields to database fields
            const oddData = {
              id: odd.id,
              fixture_id: fixture.id,
              sportsbook: typeof odd.sportsbook === 'string' ? odd.sportsbook.toLowerCase() : odd.sportsbook.toLowerCase(),
              market: odd.market,
              name: odd.name,
              is_main: odd.is_main,
              selection: odd.selection,
              normalized_selection: odd.normalized_selection,
              market_id: odd.market_id,
              selection_line: odd.selection_line || (odd.market_id === 'total_points' || odd.market_id === 'total_runs' ? odd.selection : 'ml'),
              player_id: odd.player_id,
              team_id: odd.team_id,
              price: Math.round(odd.price), // Convert to integer
              points: odd.points,
              timestamp: odd.timestamp,
              start_date: fixtureData.start_date,
              last_synced_at: new Date().toISOString()
            };
            
            // Check if odd exists and has changed
            const existingOdd = existingOddsMap[odd.id];
            const hasChanged = !existingOdd || 
                             existingOdd.price !== oddData.price || 
                             existingOdd.points !== oddData.points || 
                             existingOdd.selection_line !== oddData.selection_line ||
                             existingOdd.market !== oddData.market;
            
            if (hasChanged) {
              // Use upsert to either insert or update
              const { data, error } = await supabase
                .from('odds')
                .upsert(oddData);
              
              if (error) {
                console.error(`Error updating odd ${oddData.id}:`, error);
              } else {
                updatedCount++;
                console.log(`Updated odd ID: ${oddData.id}`);
              }
            } else {
              // Just update the last_synced_at timestamp
              const { error } = await supabase
                .from('odds')
                .update({ last_synced_at: oddData.last_synced_at })
                .eq('id', odd.id);
              
              if (error) {
                console.error(`Error updating timestamp for odd ${oddData.id}:`, error);
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching odds for fixture ${fixture.id}:`, error.message);
          if (error.response) {
            console.error('API Response:', error.response.data);
          }
        }
      }
    }
    
    // Clean up old odds that no longer appear in the API
    // Get all existing odds for active fixtures
    const { data: allOdds, error: allOddsError } = await supabase
      .from('odds')
      .select('id, fixture_id')
      .in('fixture_id', filteredFixtures.map(f => f.id));
    
    if (allOddsError) {
      console.error('Error fetching all odds for cleanup:', allOddsError);
    } else if (allOdds && allOdds.length > 0) {
      // Find odds to remove (those not in processedOddsIds)
      const oddsToRemove = allOdds
        .filter(odd => !processedOddsIds.has(odd.id))
        .map(odd => odd.id);
      
      if (oddsToRemove.length > 0) {
        console.log(`Found ${oddsToRemove.length} odds to remove`);
        
        // Delete these odds
        const { error: deleteError } = await supabase
          .from('odds')
          .delete()
          .in('id', oddsToRemove);
        
        if (deleteError) {
          console.error('Error deleting old odds:', deleteError);
        } else {
          removedCount = oddsToRemove.length;
          console.log(`Deleted ${removedCount} old odds`);
        }
      } else {
        console.log('No old odds to remove');
      }
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
    
    console.log(`Sync completed: ${totalProcessedCount} odds processed, ${updatedCount} updated, ${removedCount} removed/deleted`);
    return { processed: totalProcessedCount, updated: updatedCount, removed: removedCount };
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
  syncOdds()
    .then(result => {
      console.log('Odds sync completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Odds sync failed:', error);
      process.exit(1);
    });
}

module.exports = {
  syncOdds
}; 