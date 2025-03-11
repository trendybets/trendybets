/**
 * Direct Sync - Sportsbooks
 * 
 * Fetches sportsbooks data directly from the API and updates Supabase
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

// Main sync function
async function syncSportsbooks() {
  const syncName = 'sportsbooks';
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
    
    // Get existing sportsbooks from the database
    const { data: existingSportsbooks } = await supabase.from('sportsbooks').select('*');
    const existingSportsbooksMap = {};
    if (existingSportsbooks) {
      existingSportsbooks.forEach(sportsbook => {
        existingSportsbooksMap[sportsbook.id] = sportsbook;
      });
    }
    
    console.log(`Found ${Object.keys(existingSportsbooksMap).length} existing sportsbooks`);
    
    // Fetch sportsbooks from API
    const response = await axios.get(`${API_BASE}/sportsbooks`, {
      params: {
        key: API_KEY
      }
    });
    
    if (!response.data || !response.data.data) {
      throw new Error('Invalid response for sportsbooks');
    }
    
    const sportsbooks = response.data.data;
    console.log(`Found ${sportsbooks.length} sportsbooks in API`);
    
    // Process sportsbooks
    for (const sportsbook of sportsbooks) {
      totalProcessedCount++;
      
      // Map API fields to database fields
      const sportsbookData = {
        id: sportsbook.id,
        name: sportsbook.name,
        logo: sportsbook.logo,
        is_onshore: sportsbook.is_onshore,
        is_active: sportsbook.is_active,
        last_synced_at: new Date().toISOString()
      };
      
      // Check if sportsbook exists and has changed
      const existingSportsbook = existingSportsbooksMap[sportsbook.id];
      const hasChanged = !existingSportsbook || 
                        existingSportsbook.name !== sportsbookData.name || 
                        existingSportsbook.logo !== sportsbookData.logo ||
                        existingSportsbook.is_onshore !== sportsbookData.is_onshore ||
                        existingSportsbook.is_active !== sportsbookData.is_active;
      
      if (hasChanged) {
        // Use upsert to either insert or update
        const { data, error } = await supabase
          .from('sportsbooks')
          .upsert(sportsbookData);
        
        if (error) {
          console.error(`Error updating sportsbook ${sportsbookData.name}:`, error);
        } else {
          updatedCount++;
          console.log(`Updated sportsbook: ${sportsbookData.name}`);
        }
      } else {
        // Just update the last_synced_at timestamp
        const { error } = await supabase
          .from('sportsbooks')
          .update({ last_synced_at: sportsbookData.last_synced_at })
          .eq('id', sportsbook.id);
        
        if (error) {
          console.error(`Error updating timestamp for sportsbook ${sportsbookData.name}:`, error);
        }
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
    
    console.log(`Sync completed: ${totalProcessedCount} sportsbooks processed, ${updatedCount} updated`);
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
  syncSportsbooks()
    .then(result => {
      console.log('Sportsbooks sync completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Sportsbooks sync failed:', error);
      process.exit(1);
    });
}

module.exports = {
  syncSportsbooks
}; 