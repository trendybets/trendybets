/**
 * Direct Sync - Fixtures
 * 
 * Fetches fixtures data directly from the API and updates Supabase
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

// Main sync function
async function syncFixtures() {
  const syncName = 'fixtures';
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
    
    // Get sports from database
    const { data: sports, error: sportsError } = await supabase
      .from('sports')
      .select('*')
      .in('name', TARGET_SPORTS);
    
    if (sportsError) {
      throw new Error(`Error fetching sports: ${sportsError.message}`);
    }
    
    if (!sports || sports.length === 0) {
      throw new Error('No target sports found in database');
    }
    
    console.log(`Found ${sports.length} target sports: ${sports.map(s => s.name).join(', ')}`);
    
    // Get leagues from database
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('*')
      .in('name', TARGET_LEAGUES);
    
    if (leaguesError) {
      throw new Error(`Error fetching leagues: ${leaguesError.message}`);
    }
    
    if (!leagues || leagues.length === 0) {
      throw new Error('No target leagues found in database');
    }
    
    console.log(`Found ${leagues.length} target leagues: ${leagues.map(l => l.name).join(', ')}`);
    
    // Get existing fixtures from the database
    const { data: existingFixtures } = await supabase.from('fixtures').select('*');
    const existingFixturesMap = {};
    
    if (existingFixtures) {
      existingFixtures.forEach(fixture => {
        existingFixturesMap[fixture.id] = fixture;
      });
    }
    
    console.log(`Found ${Object.keys(existingFixturesMap).length} existing fixtures in database`);
    
    // Track which fixtures we've processed to determine which ones to remove later
    const processedFixtureIds = new Set();
    
    // Process each league
    for (const league of leagues) {
      console.log(`Processing league: ${league.name}`);
      
      // Find the corresponding sport
      const sport = sports.find(s => s.id === league.sport_id);
      if (!sport) {
        console.warn(`Could not find sport for league ${league.name}, skipping`);
        continue;
      }
      
      // Fetch fixtures from API for this league
      const response = await axios.get(`${API_BASE}/fixtures/active`, {
        params: {
          key: API_KEY,
          sport: sport.id.toLowerCase(),
          league: league.id.toLowerCase(),
          status: 'unplayed',
          is_live: false
        }
      });
      
      if (!response.data || !response.data.data) {
        console.warn(`No fixtures data returned for league ${league.name}`);
        continue;
      }
      
      const fixtures = response.data.data;
      console.log(`Found ${fixtures.length} upcoming fixtures for ${league.name} in API`);
      
      // Process fixtures
      for (const fixture of fixtures) {
        totalProcessedCount++;
        
        // Extract team IDs from the competitors
        const homeTeamId = fixture.home_competitors[0]?.id;
        const awayTeamId = fixture.away_competitors[0]?.id;
        
        if (!homeTeamId || !awayTeamId) {
          console.warn(`Missing team IDs for fixture ${fixture.id}, skipping`);
          continue;
        }
        
        // Map API fields to database fields
        const fixtureData = {
          id: fixture.id,
          numerical_id: fixture.numerical_id,
          game_id: fixture.game_id,
          start_date: fixture.start_date,
          status: fixture.status,
          is_live: fixture.is_live,
          home_team_display: fixture.home_team_display,
          away_team_display: fixture.away_team_display,
          venue_name: fixture.venue_name,
          venue_location: fixture.venue_location,
          broadcast: fixture.broadcast,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          home_team_abbreviation: fixture.home_competitors[0]?.abbreviation,
          away_team_abbreviation: fixture.away_competitors[0]?.abbreviation,
          home_record: fixture.home_record,
          away_record: fixture.away_record,
          start_time: fixture.start_date, // Using start_date as start_time
          sport_id: league.sport_id,
          league_id: league.id,
          venue: fixture.venue_name,
          source_ids: fixture.source_ids,
          last_synced_at: new Date().toISOString()
        };
        
        // Add this fixture to our processed set
        processedFixtureIds.add(fixture.id);
        
        // Check if fixture exists and has changed
        const existingFixture = existingFixturesMap[fixture.id];
        const hasChanged = !existingFixture || 
                          existingFixture.numerical_id !== fixtureData.numerical_id || 
                          existingFixture.game_id !== fixtureData.game_id || 
                          existingFixture.start_date !== fixtureData.start_date ||
                          existingFixture.status !== fixtureData.status ||
                          existingFixture.is_live !== fixtureData.is_live ||
                          existingFixture.home_team_display !== fixtureData.home_team_display ||
                          existingFixture.away_team_display !== fixtureData.away_team_display ||
                          existingFixture.home_team_id !== fixtureData.home_team_id ||
                          existingFixture.away_team_id !== fixtureData.away_team_id ||
                          existingFixture.venue_name !== fixtureData.venue_name ||
                          existingFixture.broadcast !== fixtureData.broadcast;
        
        if (hasChanged) {
          // Use upsert to either insert or update
          const { data, error } = await supabase
            .from('fixtures')
            .upsert(fixtureData);
          
          if (error) {
            console.error(`Error updating fixture ${fixtureData.id}:`, error);
          } else {
            updatedCount++;
            console.log(`Updated fixture ID: ${fixtureData.id}`);
          }
        } else {
          // Just update the last_synced_at timestamp
          const { error } = await supabase
            .from('fixtures')
            .update({ last_synced_at: fixtureData.last_synced_at })
            .eq('id', fixture.id);
          
          if (error) {
            console.error(`Error updating timestamp for fixture ${fixtureData.id}:`, error);
          }
        }
      }
    }
    
    // Clean up old fixtures that no longer appear in the API
    // Only consider fixtures for our target sports and leagues
    const sportIds = sports.map(s => s.id);
    const leagueIds = leagues.map(l => l.id);
    
    // Find fixtures to remove (those not in processedFixtureIds)
    const fixturesToRemove = [];
    
    for (const fixtureId in existingFixturesMap) {
      const fixture = existingFixturesMap[fixtureId];
      
      // Only consider fixtures from our target sports and leagues 
      if (sportIds.includes(fixture.sport_id) && 
          leagueIds.includes(fixture.league_id) && 
          !processedFixtureIds.has(fixtureId) &&
          fixture.status === 'unplayed') {  // Only remove unplayed fixtures
        
        fixturesToRemove.push(fixtureId);
      }
    }
    
    if (fixturesToRemove.length > 0) {
      console.log(`Found ${fixturesToRemove.length} fixtures to remove`);
      
      // Now actually delete these fixtures since we have ON DELETE CASCADE set up
      const { error: deleteError } = await supabase
        .from('fixtures')
        .delete()
        .in('id', fixturesToRemove);
      
      if (deleteError) {
        console.error('Error deleting old fixtures:', deleteError);
      } else {
        removedCount = fixturesToRemove.length;
        console.log(`Deleted ${removedCount} old fixtures (and their associated odds via cascade)`);
      }
    } else {
      console.log('No old fixtures to remove');
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
    
    console.log(`Sync completed: ${totalProcessedCount} fixtures processed, ${updatedCount} updated, ${removedCount} removed/deleted`);
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
  syncFixtures()
    .then(result => {
      console.log('Fixtures sync completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fixtures sync failed:', error);
      process.exit(1);
    });
}

module.exports = {
  syncFixtures
}; 