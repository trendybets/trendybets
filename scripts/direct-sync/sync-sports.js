/**
 * Direct Sync - Sports
 * 
 * Fetches sports data directly from the API and updates Supabase
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

// Target sports we want to sync
const TARGET_SPORTS = ['baseball', 'basketball'];

// Main sync function
async function syncSports() {
  const syncName = 'sports';
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
    
    // Fetch current sports from database
    const { data: existingSports } = await supabase.from('sports').select('*');
    const existingSportsMap = {};
    if (existingSports) {
      existingSports.forEach(sport => {
        existingSportsMap[sport.id] = sport;
      });
    }
    
    // Fetch sports from API
    console.log('Fetching sports data...');
    const sportsResponse = await axios.get(`${API_BASE}/sports/active`, {
      params: { key: API_KEY }
    });
    
    if (!sportsResponse.data || !sportsResponse.data.data) {
      throw new Error('Invalid response from sports API');
    }
    
    const allSports = sportsResponse.data.data;
    
    // Filter sports to only include baseball and basketball
    const sports = allSports.filter(sport => 
      TARGET_SPORTS.some(targetSport => 
        sport.id.toLowerCase() === targetSport.toLowerCase() || 
        sport.name.toLowerCase().includes(targetSport.toLowerCase())
      )
    );
    
    console.log(`Found ${allSports.length} total sports, filtered to ${sports.length} target sports (${TARGET_SPORTS.join(', ')})`);
    
    // Update sports in Supabase with the correct database structure
    for (const sport of sports) {
      totalProcessedCount++;
      
      const sportData = {
        id: sport.id,
        name: sport.name,
        numerical_id: sport.numerical_id,
        main_markets: sport.main_markets,
        last_synced_at: new Date().toISOString()
      };
      
      // Check if sport exists and has changed
      const existingSport = existingSportsMap[sport.id];
      const hasChanged = !existingSport || 
                         existingSport.name !== sportData.name || 
                         existingSport.numerical_id !== sportData.numerical_id || 
                         JSON.stringify(existingSport.main_markets) !== JSON.stringify(sportData.main_markets);
      
      if (hasChanged) {
        const { error } = await supabase
          .from('sports')
          .upsert(sportData);
          
        if (error) {
          console.error(`Error updating sport ${sport.name}:`, error);
        } else {
          changedCount++;
        }
      }
    }
    
    console.log(`Sync completed: ${sports.length} sports processed, ${changedCount} updated`);
    
    // Update the sync log entry with completion status
    if (syncLogId) {
      const { error: updateError } = await supabase
        .from('sync_log')
        .update({
          completed_at: new Date(),
          status: 'completed',
          records_processed: totalProcessedCount,
          metadata: { 
            changed: changedCount,
            target_sports: TARGET_SPORTS
          }
        })
        .eq('id', syncLogId);
        
      if (updateError) {
        console.error('Error updating sync log completion:', updateError);
      }
    }
    
    return `Processed ${totalProcessedCount} sports, ${changedCount} changed`;
    
  } catch (error) {
    console.error('Error syncing sports:', error);
    
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
  syncSports()
    .then(() => {
      console.log('Sports sync completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Sports sync failed:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = { syncSports }; 