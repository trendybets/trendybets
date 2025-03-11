/**
 * Direct Sync - Leagues
 * 
 * Fetches leagues data directly from the API and updates Supabase
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

// Target leagues we want to sync (case insensitive)
const TARGET_LEAGUES = ['mlb', 'nba', 'ncaab'];

// Main sync function
async function syncLeagues() {
  const syncName = 'leagues';
  let syncLogId;
  let totalProcessedCount = 0;
  let changedCount = 0;

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
    
    // First, get all sports from our database
    const { data: dbSports, error: sportsError } = await supabase
      .from('sports')
      .select('*');
      
    if (sportsError) {
      throw new Error(`Error fetching sports: ${sportsError.message}`);
    }
    
    if (!dbSports || dbSports.length === 0) {
      throw new Error('No sports found in database. Run sync-sports first.');
    }
    
    console.log(`Found ${dbSports.length} sports in database`);
    
    // Get existing leagues from database
    const { data: existingLeagues } = await supabase.from('leagues').select('*');
    const existingLeaguesMap = {};
    if (existingLeagues) {
      existingLeagues.forEach(league => {
        existingLeaguesMap[league.id] = league;
      });
    }
    
    // Process each sport to get its leagues
    let totalLeagues = 0;
    let updatedLeagues = 0;
    
    for (const sport of dbSports) {
      console.log(`Fetching leagues for sport: ${sport.name}`);
      
      try {
        // Fetch leagues for this sport
        const leaguesResponse = await axios.get(`${API_BASE}/leagues`, {
          params: { 
            key: API_KEY,
            sport_id: sport.id,
            active: 1
          }
        });
        
        if (!leaguesResponse.data || !leaguesResponse.data.data) {
          console.error(`Invalid response for leagues of sport ${sport.name}`);
          continue;
        }
        
        const leagues = leaguesResponse.data.data;
        console.log(`Found ${leagues.length} leagues for ${sport.name}`);
        
        // Filter for only our target leagues
        const filteredLeagues = leagues.filter(league => 
          TARGET_LEAGUES.some(targetLeague => 
            league.id.toLowerCase() === targetLeague.toLowerCase() || 
            league.name.toLowerCase() === targetLeague.toLowerCase()
          )
        );
        
        console.log(`Filtered to ${filteredLeagues.length} target leagues for ${sport.name}`);
        totalLeagues += filteredLeagues.length;
        
        // Update leagues in Supabase
        for (const league of filteredLeagues) {
          totalProcessedCount++;
          
          const leagueData = {
            id: league.id,
            name: league.name,
            sport_id: sport.id,
            numerical_id: league.numerical_id,
            last_synced_at: new Date().toISOString()
          };
          
          // Check if league exists and has changed
          const existingLeague = existingLeaguesMap[league.id];
          const hasChanged = !existingLeague || 
                            existingLeague.name !== leagueData.name || 
                            existingLeague.sport_id !== leagueData.sport_id || 
                            existingLeague.numerical_id !== leagueData.numerical_id;
          
          if (hasChanged) {
            const { error } = await supabase
              .from('leagues')
              .upsert(leagueData);
              
            if (error) {
              console.error(`Error updating league ${league.name}:`, error);
            } else {
              updatedLeagues++;
              changedCount++;
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching leagues for sport ${sport.name}:`, error);
      }
    }
    
    console.log(`Sync completed: ${totalProcessedCount} leagues processed, ${changedCount} updated`);
    
    // Update the sync log entry with completion status
    if (syncLogId) {
      const { error: updateError } = await supabase
        .from('sync_log')
        .update({
          completed_at: new Date(),
          status: 'completed',
          records_processed: totalProcessedCount,
          metadata: { changed: changedCount }
        })
        .eq('id', syncLogId);
        
      if (updateError) {
        console.error('Error updating sync log completion:', updateError);
      }
    }
    
    return `Processed ${totalProcessedCount} leagues, ${changedCount} changed`;
    
  } catch (error) {
    console.error('Error syncing leagues:', error);
    
    // Update the sync log entry with failure status
    if (syncLogId) {
      const { error: updateError } = await supabase
        .from('sync_log')
        .update({
          completed_at: new Date(),
          status: 'failed',
          error: error.message
        })
        .eq('id', syncLogId);
        
      if (updateError) {
        console.error('Error updating sync log failure:', updateError);
      }
    }
    
    throw error;
  }
}

// Run the sync if this script is executed directly
if (require.main === module) {
  syncLeagues()
    .then(() => {
      console.log('Leagues sync completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Leagues sync failed:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = { syncLeagues }; 