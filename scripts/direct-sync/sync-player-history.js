/**
 * Direct Sync - Player History
 * 
 * Fetches player game history for NBA players directly from the API and updates Supabase
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

// Target league for player history
const TARGET_LEAGUE = 'nba';

// Main sync function
async function syncPlayerHistory() {
  const syncName = 'player-history';
  let syncLogId;
  let totalProcessedCount = 0;
  let updatedCount = 0;
  let existingCount = 0;  // Track existing entries
  
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
    
    // Determine if this is a full sync or an incremental one
    const isFirstSync = !lastSyncTime;
    const syncStartTime = new Date().toISOString();
    
    // For incremental syncs, we'll only look at games after the last sync
    // or within the last 7 days (whichever is more recent)
    let fromDate = null;
    if (!isFirstSync) {
      // For subsequent syncs, look at games in the last 7 days or since last sync
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Use either last sync time or 7 days ago, whichever is more recent
      const lastSyncDate = new Date(lastSyncTime);
      fromDate = lastSyncDate > sevenDaysAgo ? lastSyncDate.toISOString().split('T')[0] : sevenDaysAgo.toISOString().split('T')[0];
      
      console.log(`Incremental sync: Only fetching games since ${fromDate}`);
    } else {
      console.log(`Full sync: Fetching all historical games (this will take a while)`);
    }
    
    // 1. Get NBA league from database
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('*')
      .ilike('name', TARGET_LEAGUE);
    
    if (leaguesError) {
      throw new Error(`Error fetching NBA league: ${leaguesError.message}`);
    }
    
    if (!leagues || leagues.length === 0) {
      throw new Error(`NBA league not found in database. Run sync-leagues first.`);
    }
    
    const nbaLeague = leagues[0];
    console.log(`Found NBA league: ${nbaLeague.name} (${nbaLeague.id})`);
    
    // 2. Get all NBA players from database
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('league_id', nbaLeague.id)
      .eq('is_active', true); // Only fetch active players to reduce API load
    
    if (playersError) {
      throw new Error(`Error fetching NBA players: ${playersError.message}`);
    }
    
    if (!players || players.length === 0) {
      throw new Error(`No NBA players found in database. Run sync-players first.`);
    }
    
    console.log(`Found ${players.length} NBA players`);
    
    // 3. Get existing player history entries to check for updates
    const { data: existingHistory } = await supabase.from('player_history').select('*');
    const existingHistoryMap = {};
    
    if (existingHistory) {
      existingHistory.forEach(entry => {
        // Create a unique key for each entry using player_id and fixture_id
        const key = `${entry.player_id}:${entry.fixture_id}`;
        existingHistoryMap[key] = entry;
      });
    }
    
    console.log(`Found ${Object.keys(existingHistoryMap).length} existing player history entries`);
    
    // 4. Process players in batches
    const batchSize = 5; // Process 5 players at a time to avoid overwhelming the API
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(players.length / batchSize)} (${batch.length} players)`);
      
      // Process each player in the batch sequentially
      for (const player of batch) {
        try {
          console.log(`Fetching history for player: ${player.full_name} (${player.id})`);
          
          // Fetch player history from API
          const params = {
            key: API_KEY,
            player_id: player.id,
            status: 'completed'
          };
          
          // For incremental syncs, add from_date parameter to limit results
          if (fromDate) {
            params.from_date = fromDate;
          }
          
          const response = await axios.get(`${API_BASE}/fixtures/player-results`, {
            params: params
          });
          
          if (!response.data || !response.data.data) {
            console.log(`No history data found for player ${player.full_name}`);
            continue;
          }
          
          const historyEntries = response.data.data;
          console.log(`Found ${historyEntries.length} history entries for ${player.full_name}`);
          
          // Process each history entry
          for (const entry of historyEntries) {
            try {
              // Only process NBA games
              if (entry.league.id.toLowerCase() !== TARGET_LEAGUE.toLowerCase()) {
                continue;
              }
              
              // Skip games that happened before our from_date
              if (fromDate && new Date(entry.fixture.start_date) < new Date(fromDate)) {
                continue;
              }
              
              totalProcessedCount++;
              
              // Extract the "all" period stats from the results
              const playerResult = entry.results[0];
              const allPeriodStats = playerResult.stats.find(stat => stat.period === 'all')?.stats;
              
              if (!allPeriodStats) {
                console.log(`No all-period stats found for player ${player.full_name} in fixture ${entry.fixture.id}`);
                continue;
              }
              
              // Prepare the history entry data
              const historyData = {
                player_id: player.id,
                fixture_id: entry.fixture.id,
                game_id: entry.fixture.game_id,
                start_date: entry.fixture.start_date,
                fouls: allPeriodStats.fouls || 0,
                blocks: allPeriodStats.blocks || 0,
                points: allPeriodStats.points || 0,
                steals: allPeriodStats.steals || 0,
                assists: allPeriodStats.assists || 0,
                minutes: allPeriodStats.minutes || 0,
                seconds: allPeriodStats.seconds || 0,
                turnovers: allPeriodStats.turnovers || 0,
                plus_minus: allPeriodStats.plus_minus || 0,
                first_basket: allPeriodStats.first_basket || 0,
                flagrant_fouls: allPeriodStats.flagrant_fouls || 0,
                total_rebounds: allPeriodStats.total_rebounds || 0,
                blocks_received: allPeriodStats.blocks_received || 0,
                technical_fouls: allPeriodStats.technical_fouls || 0,
                field_goals_made: allPeriodStats.field_goals_made || 0,
                free_throws_made: allPeriodStats.free_throws_made || 0,
                first_team_basket: allPeriodStats.first_team_basket || 0,
                defensive_rebounds: allPeriodStats.defensive_rebounds || 0,
                offensive_rebounds: allPeriodStats.offensive_rebounds || 0,
                points_off_turnovers: allPeriodStats.points_off_turnovers || 0,
                field_goals_attempted: allPeriodStats.field_goals_attempted || 0,
                free_throws_attempted: allPeriodStats.free_throws_attempted || 0,
                first_basket_including_ft: allPeriodStats.first_basket_including_ft || 0,
                two_point_field_goals_made: allPeriodStats.two_point_field_goals_made || 0,
                three_point_field_goals_made: allPeriodStats.three_point_field_goals_made || 0,
                first_team_basket_including_ft: allPeriodStats.first_team_basket_including_ft || 0,
                two_point_field_goals_attempted: allPeriodStats.two_point_field_goals_attempted || 0,
                three_point_field_goals_attempted: allPeriodStats.three_point_field_goals_attempted || 0,
                last_synced_at: syncStartTime
              };
              
              // Check if this entry already exists
              const entryKey = `${player.id}:${entry.fixture.id}`;
              const existingEntry = existingHistoryMap[entryKey];
              
              if (existingEntry) {
                // Update if it exists
                const { data, error } = await supabase
                  .from('player_history')
                  .update(historyData)
                  .eq('id', existingEntry.id);
                
                if (error) {
                  console.error(`Error updating history for player ${player.full_name} in fixture ${entry.fixture.id}:`, error);
                } else {
                  updatedCount++;
                  console.log(`Updated history for player ${player.full_name} in fixture ${entry.fixture.id}`);
                }
              } else {
                // Insert if it's new
                const { data, error } = await supabase
                  .from('player_history')
                  .insert(historyData);
                
                if (error) {
                  // Don't treat duplicate key errors as real errors - the data is already there
                  if (error.code === '23505') {
                    console.log(`History for player ${player.full_name} in fixture ${entry.fixture.id} already exists`);
                    existingCount++;  // Increment counter for existing entries
                  } else {
                    console.error(`Error inserting history for player ${player.full_name} in fixture ${entry.fixture.id}:`, error);
                  }
                } else {
                  updatedCount++;
                  console.log(`Inserted history for player ${player.full_name} in fixture ${entry.fixture.id}`);
                }
              }
            } catch (entryError) {
              console.error(`Error processing entry for player ${player.full_name} in fixture ${entry.fixture?.id}:`, entryError);
            }
          }
        } catch (playerError) {
          console.error(`Error fetching history for player ${player.full_name}:`, playerError);
        }
        
        // Add a small delay between player requests to avoid rate limiting
        await delay(1000);
      }
      
      // Add a delay between batches
      await delay(3000);
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
    
    // If this was the first sync, update all player history entries that didn't get updated
    // to have the last_synced_at time
    if (isFirstSync) {
      console.log('Updating last_synced_at for any existing records that didn\'t get updated...');
      
      const { data, error } = await supabase
        .from('player_history')
        .update({ last_synced_at: syncStartTime })
        .is('last_synced_at', null);
      
      if (error) {
        console.error('Error updating last_synced_at for existing records:', error);
      } else {
        console.log('Updated last_synced_at for existing records');
      }
    }
    
    console.log(`Sync completed: ${totalProcessedCount} history entries processed, ${updatedCount} updated or inserted, ${existingCount} already existed`);
    return { processed: totalProcessedCount, updated: updatedCount, existing: existingCount };
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
  syncPlayerHistory()
    .then(result => {
      console.log('Player History sync completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Player History sync failed:', error);
      process.exit(1);
    });
}

module.exports = {
  syncPlayerHistory
}; 