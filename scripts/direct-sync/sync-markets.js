/**
 * Direct Sync - Markets
 * 
 * Fetches market data directly from the API and updates Supabase
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
async function syncMarkets() {
  const syncName = 'markets';
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
    
    // Fetch all sportsbooks from the database
    const { data: sportsbooks, error: sportsbooksError } = await supabase
      .from('sportsbook')
      .select('id, name');
    
    if (sportsbooksError) {
      throw new Error(`Error fetching sportsbooks: ${sportsbooksError.message}`);
    }
    
    if (!sportsbooks || sportsbooks.length === 0) {
      console.log('No sportsbooks found to sync markets for');
      
      // Log completion (no sportsbooks to process)
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
    
    console.log(`Found ${sportsbooks.length} sportsbooks to sync markets for`);
    
    // Track all markets we process to clean up later
    const processedMarketKeys = new Set();
    
    // Process each sport and league combination
    for (const sport of TARGET_SPORTS) {
      for (const league of TARGET_LEAGUES) {
        // Only process relevant sport-league combinations
        // Basketball: NBA, NCAAB
        // Baseball: MLB
        if (
          (sport.toLowerCase() === 'basketball' && !['nba', 'ncaab'].includes(league.toLowerCase())) ||
          (sport.toLowerCase() === 'baseball' && league.toLowerCase() !== 'mlb')
        ) {
          continue;
        }
        
        console.log(`Processing markets for ${sport} - ${league}`);
        
        // Process each sportsbook
        for (const sportsbook of sportsbooks) {
          console.log(`Fetching markets for ${sport} - ${league} - ${sportsbook.name}`);
          
          // Build the URL with properly formatted parameters
          const url = buildApiUrl('markets', {
            sport: sport.toLowerCase(),
            league: league.toLowerCase(),
            sportsbook: sportsbook.id.toLowerCase()
          });
          
          console.log(`Fetching markets from: ${url}`);
          
          try {
            // Fetch markets from API
            const response = await axios.get(url);
            
            if (!response.data || !response.data.data || response.data.data.length === 0) {
              console.warn(`No markets data returned for ${sport} - ${league} - ${sportsbook.name}`);
              continue;
            }
            
            const markets = response.data.data;
            console.log(`Found ${markets.length} markets for ${sport} - ${league} - ${sportsbook.name}`);
            
            // Get existing markets for this sportsbook from the database
            const { data: existingMarkets } = await supabase
              .from('market')
              .select('id, sportsbook_id')
              .eq('sportsbook_id', sportsbook.id)
              .eq('sport_id', sport)
              .eq('league_id', league);
            
            const existingMarketsMap = {};
            if (existingMarkets) {
              existingMarkets.forEach(market => {
                existingMarketsMap[`${market.id}:${market.sportsbook_id}`] = market;
              });
            }
            
            console.log(`Found ${existingMarkets ? existingMarkets.length : 0} existing markets in database for ${sport} - ${league} - ${sportsbook.name}`);
            
            // Process each market
            for (const market of markets) {
              totalProcessedCount++;
              
              // Create a unique key for this market to track for cleanup
              const marketKey = `${market.id}:${sportsbook.id}:${sport}:${league}`;
              processedMarketKeys.add(marketKey);
              
              // Map API fields to database fields
              const marketData = {
                id: market.id,
                sportsbook_id: sportsbook.id,
                name: market.name,
                numerical_id: market.numerical_id,
                sport_id: sport,
                league_id: league,
                last_synced_at: new Date().toISOString()
              };
              
              // Check if market exists
              const existingMarketKey = `${market.id}:${sportsbook.id}`;
              const existingMarket = existingMarketsMap[existingMarketKey];
              
              // Use upsert to either insert or update
              const { data, error } = await supabase
                .from('market')
                .upsert(marketData);
              
              if (error) {
                console.error(`Error updating market ${marketData.id} for ${sportsbook.id}:`, error);
              } else {
                updatedCount++;
                if (!existingMarket) {
                  console.log(`Added new market: ${marketData.id} - ${marketData.name} for ${sportsbook.name}`);
                } else {
                  console.log(`Updated market: ${marketData.id} - ${marketData.name} for ${sportsbook.name}`);
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching markets for ${sport} - ${league} - ${sportsbook.name}:`, error.message);
            if (error.response) {
              console.error('API Response:', error.response.data);
            }
          }
        }
      }
    }
    
    // Clean up old markets that no longer appear in the API
    // Get all existing markets
    const { data: allMarkets, error: allMarketsError } = await supabase
      .from('market')
      .select('id, sportsbook_id, sport_id, league_id');
    
    if (allMarketsError) {
      console.error('Error fetching all markets for cleanup:', allMarketsError);
    } else if (allMarkets && allMarkets.length > 0) {
      // Find markets to remove (those not in processedMarketKeys)
      const marketsToRemove = allMarkets
        .filter(market => {
          // Only consider removing markets for our target sports/leagues
          if (!TARGET_SPORTS.map(s => s.toLowerCase()).includes(market.sport_id?.toLowerCase()) ||
              !TARGET_LEAGUES.map(l => l.toLowerCase()).includes(market.league_id?.toLowerCase())) {
            return false;
          }
          
          const marketKey = `${market.id}:${market.sportsbook_id}:${market.sport_id}:${market.league_id}`;
          return !processedMarketKeys.has(marketKey);
        });
      
      if (marketsToRemove.length > 0) {
        console.log(`Found ${marketsToRemove.length} markets to remove`);
        
        // Delete these markets one by one or in batches
        for (const market of marketsToRemove) {
          const { error: deleteError } = await supabase
            .from('market')
            .delete()
            .eq('id', market.id)
            .eq('sportsbook_id', market.sportsbook_id);
          
          if (deleteError) {
            console.error(`Error deleting old market ${market.id} for ${market.sportsbook_id}:`, deleteError);
          } else {
            removedCount++;
            console.log(`Deleted old market: ${market.id} for ${market.sportsbook_id}`);
          }
        }
        
        console.log(`Deleted ${removedCount} old markets`);
      } else {
        console.log('No old markets to remove');
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
    
    console.log(`Sync completed: ${totalProcessedCount} markets processed, ${updatedCount} updated, ${removedCount} removed/deleted`);
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
  syncMarkets()
    .then(result => {
      console.log('Markets sync completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Markets sync failed:', error);
      process.exit(1);
    });
}

module.exports = {
  syncMarkets
}; 