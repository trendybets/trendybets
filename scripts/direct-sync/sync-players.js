/**
 * Direct Sync - Players
 * 
 * Fetches players data directly from the API and updates Supabase
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

// Limited list of sports and leagues to sync
const TARGET_SPORTS = ['baseball', 'basketball'];
const TARGET_LEAGUES = ['mlb', 'nba', 'ncaab'];

// Main sync function
async function syncPlayers() {
  const syncName = 'players';
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
    
    // Get target sports from our database
    const { data: sports, error: sportsError } = await supabase
      .from('sports')
      .select('*');
    
    if (sportsError) {
      throw new Error(`Failed to fetch sports: ${sportsError.message}`);
    }
    
    if (!sports || sports.length === 0) {
      throw new Error('No sports found in database');
    }
    
    // Filter sports manually to match baseball and basketball
    const filteredSports = sports.filter(sport => 
      TARGET_SPORTS.some(targetSport => 
        sport.name.toLowerCase().includes(targetSport.toLowerCase())
      )
    );
    
    if (filteredSports.length === 0) {
      throw new Error('No target sports found in database');
    }
    
    console.log(`Found ${filteredSports.length} target sports: ${filteredSports.map(s => s.name).join(', ')}`);
    
    // Get target leagues from our database
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('*')
      .in('sport_id', filteredSports.map(s => s.id));
    
    if (leaguesError) {
      throw new Error(`Failed to fetch leagues: ${leaguesError.message}`);
    }
    
    if (!leagues || leagues.length === 0) {
      throw new Error('No leagues found in database');
    }
    
    // Filter leagues manually to match MLB, NBA, NCAAB
    const filteredLeagues = leagues.filter(league => 
      TARGET_LEAGUES.some(targetLeague => 
        league.name.toLowerCase() === targetLeague.toLowerCase()
      )
    );
    
    if (filteredLeagues.length === 0) {
      throw new Error('No target leagues found in database');
    }
    
    console.log(`Found ${filteredLeagues.length} target leagues: ${filteredLeagues.map(l => l.name).join(', ')}`);
    
    // Get existing players from the database
    const { data: existingPlayers } = await supabase.from('players').select('*');
    const existingPlayersMap = {};
    if (existingPlayers) {
      existingPlayers.forEach(player => {
        existingPlayersMap[player.id] = player;
      });
    }
    
    // Process leagues with a delay between each to avoid overwhelming the API
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    let totalPlayers = 0;
    let updatedPlayers = 0;
    
    for (const league of filteredLeagues) {
      try {
        // Get the sport object for this league to ensure correct sport_id
        const sportObj = filteredSports.find(s => s.id === league.sport_id);
        console.log(`Fetching players for ${sportObj ? sportObj.name : 'Unknown Sport'} - ${league.name}`);
        
        let page = 1;
        let hasMorePages = true;
        
        while (hasMorePages) {
          // Fetch players for this league with pagination
          const response = await axios.get(`${API_BASE}/players`, {
            params: { 
              key: API_KEY,
              league: league.id,
              page: page,
              per_page: 100 // Fetch 100 players per request
            }
          });
          
          if (!response.data || !response.data.data) {
            console.error(`Invalid response for players in ${league.sport} - ${league.name}`);
            break;
          }
          
          const players = response.data.data;
          console.log(`Found ${players.length} players in ${league.sport} - ${league.name} (page ${page})`);
          
          if (players.length === 0) {
            break;
          }
          
          // Store total pages info for pagination
          const totalPages = response.data.total_pages || 1;
          
          // Function to process a batch of players
          const processPlayers = async (playersData) => {
            for (const player of playersData) {
              try {
                totalProcessedCount++;
                
                // Map API fields to database fields
                const playerData = {
                  id: player.id,
                  full_name: player.name,
                  first_name: player.first_name,
                  last_name: player.last_name,
                  position: player.position,
                  jersey_number: player.jersey_number,
                  birth_date: player.birth_date,
                  weight: player.weight,
                  height: player.height,
                  league_id: league.id,
                  sport_id: league.sport_id,
                  team_id: player.team?.id || null,
                  is_active: true,
                  last_synced_at: new Date().toISOString()
                };
                
                // Check if player exists and has changed
                const existingPlayer = existingPlayersMap[player.id];
                const hasChanged = !existingPlayer || 
                                  existingPlayer.full_name !== playerData.full_name || 
                                  existingPlayer.first_name !== playerData.first_name || 
                                  existingPlayer.last_name !== playerData.last_name || 
                                  existingPlayer.position !== playerData.position || 
                                  existingPlayer.jersey_number !== playerData.jersey_number || 
                                  existingPlayer.birth_date !== playerData.birth_date || 
                                  existingPlayer.weight !== playerData.weight || 
                                  existingPlayer.height !== playerData.height || 
                                  existingPlayer.league_id !== playerData.league_id || 
                                  existingPlayer.sport_id !== playerData.sport_id || 
                                  existingPlayer.team_id !== playerData.team_id;
                
                if (hasChanged) {
                  // Update player record
                  const { error: upsertError } = await supabase
                    .from('players')
                    .upsert(playerData);
                    
                  if (upsertError) {
                    console.error(`Error updating player ${player.name}:`, upsertError);
                    throw upsertError;
                  } else {
                    updatedPlayers++;
                    changedCount++;
                  }
                }
              } catch (error) {
                console.error(`Error processing player ${player.name}:`, error);
              }
            }
          };
          
          // Process the players
          await processPlayers(players);
          totalPlayers += players.length;
          
          // Check if there are more pages
          hasMorePages = page < totalPages;
          
          // Move to the next page if available
          if (hasMorePages) {
            page++;
            console.log(`Waiting 1 second before fetching next page...`);
            await delay(1000);
          }
        }
        
        // Wait between leagues to avoid rate limiting
        console.log(`Waiting 3 seconds before next league...`);
        await delay(3000);
        
      } catch (error) {
        console.error(`Error fetching players for ${league.sport} - ${league.name}:`, error);
      }
    }
    
    console.log(`Sync completed: ${totalProcessedCount} players processed, ${changedCount} updated`);
    
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
    
    return `Processed ${totalProcessedCount} players, ${changedCount} changed`;
    
  } catch (error) {
    console.error('Error syncing players:', error);
    
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
  syncPlayers()
    .then(() => {
      console.log('Players sync completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Players sync failed:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = { syncPlayers }; 