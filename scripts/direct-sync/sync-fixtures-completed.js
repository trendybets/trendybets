/**
 * Direct Sync - Fixtures Completed
 * 
 * Fetches completed fixtures data directly from the API and updates Supabase
 * without going through Next.js API routes
 * 
 * Currently only syncs NBA basketball fixtures
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
const TARGET_SPORT = 'basketball';
const TARGET_LEAGUE = 'nba';
const CURRENT_SEASON_YEAR = '2024'; // Update as needed

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
async function syncFixturesCompleted() {
  const syncName = 'fixtures-completed';
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
    
    // Track all fixtures we process to clean up later
    const processedFixtureIds = new Set();
    
    // Get existing completed fixtures from the database
    const { data: existingFixtures } = await supabase
      .from('fixtures_completed')
      .select('id, last_synced_at');
    
    const existingFixturesMap = {};
    if (existingFixtures) {
      existingFixtures.forEach(fixture => {
        existingFixturesMap[fixture.id] = fixture;
      });
    }
    
    console.log(`Found ${existingFixtures ? existingFixtures.length : 0} existing completed fixtures in database`);
    
    // Season types to fetch
    const seasonTypes = ['regular season', 'postseason', 'preseason'];
    
    for (const seasonType of seasonTypes) {
      console.log(`Fetching ${seasonType} completed fixtures for ${TARGET_SPORT}/${TARGET_LEAGUE}`);
      
      let page = 1;
      let hasMoreData = true;
      const PAGE_SIZE = 100; // Adjust based on API limitations
      
      while (hasMoreData) {
        // Build the URL with properly formatted parameters including pagination
        const url = buildApiUrl('fixtures', {
          sport: TARGET_SPORT,
          league: TARGET_LEAGUE,
          season_year: CURRENT_SEASON_YEAR,
          season_type: seasonType,
          status: 'completed',
          limit: PAGE_SIZE,
          page: page
        });
        
        console.log(`Fetching completed fixtures page ${page} from: ${url}`);
        
        try {
          // Fetch completed fixtures from API
          const response = await axios.get(url);
          
          if (!response.data || !response.data.data || response.data.data.length === 0) {
            console.log(`No more data for ${seasonType} on page ${page}`);
            hasMoreData = false;
            continue;
          }
          
          const fixtures = response.data.data;
          console.log(`Found ${fixtures.length} completed fixtures on page ${page} for ${TARGET_SPORT}/${TARGET_LEAGUE} ${seasonType}`);
          
          // If we received fewer items than the page size, this is likely the last page
          if (fixtures.length < PAGE_SIZE) {
            hasMoreData = false;
          }
          
          // Process each fixture
          for (const fixture of fixtures) {
            if (!fixture.id) {
              console.warn('Skipping fixture without ID');
              continue;
            }
            
            totalProcessedCount++;
            processedFixtureIds.add(fixture.id);
            
            // Map API fields to database fields - just the ID for our simplified structure
            const fixtureData = {
              id: fixture.id,
              last_synced_at: new Date().toISOString()
            };
            
            // Check if fixture exists
            const existingFixture = existingFixturesMap[fixture.id];
            
            if (!existingFixture) {
              // Insert new fixture
              const { error: insertError } = await supabase
                .from('fixtures_completed')
                .insert(fixtureData);
              
              if (insertError) {
                console.error(`Error inserting completed fixture ${fixtureData.id}:`, insertError);
              } else {
                updatedCount++;
                console.log(`Added completed fixture ID: ${fixtureData.id}`);
              }
            } else {
              // Update last_synced_at for existing fixture
              const { error: updateError } = await supabase
                .from('fixtures_completed')
                .update({ last_synced_at: fixtureData.last_synced_at })
                .eq('id', fixture.id);
              
              if (updateError) {
                console.error(`Error updating completed fixture ${fixtureData.id}:`, updateError);
              }
            }
          }
          
          // Move to the next page
          page++;
          
          // Add a small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`Error fetching completed fixtures for ${TARGET_SPORT}/${TARGET_LEAGUE} ${seasonType} page ${page}:`, error.message);
          if (error.response) {
            console.error('API Response:', error.response.data);
          }
          
          // If we encounter an error, stop paginating for this season type
          hasMoreData = false;
        }
      }
    }
    
    // Clean up old completed fixtures that no longer appear in the API
    // This is optional and may not be necessary for historical data
    if (processedFixtureIds.size > 0 && false) { // Set to true if you want to enable cleanup
      const { data: allCompletedFixtures, error: allFixturesError } = await supabase
        .from('fixtures_completed')
        .select('id');
      
      if (allFixturesError) {
        console.error('Error fetching all completed fixtures for cleanup:', allFixturesError);
      } else if (allCompletedFixtures && allCompletedFixtures.length > 0) {
        // Find fixtures to remove (those not in processedFixtureIds)
        const fixturesToRemove = allCompletedFixtures
          .filter(fixture => !processedFixtureIds.has(fixture.id))
          .map(fixture => fixture.id);
        
        if (fixturesToRemove.length > 0) {
          console.log(`Found ${fixturesToRemove.length} old completed fixtures to remove`);
          
          // Delete these fixtures
          const { error: deleteError } = await supabase
            .from('fixtures_completed')
            .delete()
            .in('id', fixturesToRemove);
          
          if (deleteError) {
            console.error('Error deleting old completed fixtures:', deleteError);
          } else {
            removedCount = fixturesToRemove.length;
            console.log(`Deleted ${removedCount} old completed fixtures`);
          }
        } else {
          console.log('No old completed fixtures to remove');
        }
      }
    } else {
      console.log('Skipping cleanup of old completed fixtures to preserve historical data');
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
    
    console.log(`Sync completed: ${totalProcessedCount} completed fixtures processed, ${updatedCount} added, ${removedCount} removed/deleted`);
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
  syncFixturesCompleted()
    .then(result => {
      console.log('Fixtures Completed sync completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fixtures Completed sync failed:', error);
      process.exit(1);
    });
}

module.exports = {
  syncFixturesCompleted
}; 