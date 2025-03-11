/**
 * Direct Sync - Teams
 * 
 * Fetches teams data directly from the API and updates Supabase
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

// Target leagues to sync
const TARGET_LEAGUES = ['mlb', 'nba', 'ncaab'];

// Main sync function
async function syncTeams() {
  const syncName = 'teams';
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
    
    // First get all leagues from our database
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('*');
      
    if (leaguesError) {
      throw new Error(`Error fetching leagues: ${leaguesError.message}`);
    }
    
    if (!leagues || leagues.length === 0) {
      throw new Error('No leagues found in database. Run sync-leagues first.');
    }
    
    // Filter leagues manually to match target leagues
    const targetLeagues = leagues.filter(league => 
      TARGET_LEAGUES.some(targetLeague => 
        league.name.toLowerCase() === targetLeague.toLowerCase()
      )
    );
    
    if (targetLeagues.length === 0) {
      throw new Error('No target leagues found in database');
    }
    
    console.log(`Found ${leagues.length} total leagues, filtered to ${targetLeagues.length} target leagues: ${targetLeagues.map(l => l.name).join(', ')}`);
    
    // Get all existing teams from the database
    const { data: existingTeams } = await supabase.from('teams').select('*');
    const existingTeamsMap = {};
    if (existingTeams) {
      existingTeams.forEach(team => {
        existingTeamsMap[team.id] = team;
      });
    }
    
    // Process leagues in batches to avoid overwhelming the API
    const batchSize = 3;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    let totalTeams = 0;
    let updatedTeams = 0;
    let batchCount = 0;
    
    // Process leagues in batches
    for (let i = 0; i < targetLeagues.length; i += batchSize) {
      batchCount++;
      const batchLeagues = targetLeagues.slice(i, i + batchSize);
      console.log(`Processing batch ${batchCount} of ${Math.ceil(targetLeagues.length / batchSize)}`);
      
      // Process leagues in this batch concurrently
      const batchResults = await Promise.all(batchLeagues.map(async league => {
        try {
          console.log(`Fetching teams for league: ${league.name}`);
          
          let page = 1;
          let hasMorePages = true;
          let allTeams = [];
          
          // Fetch all pages of teams
          while (hasMorePages) {
            console.log(`Fetching teams for league: ${league.name} - Page ${page}`);
            
            // Fetch teams for this league with pagination
            const teamsResponse = await axios.get(`${API_BASE}/teams`, {
              params: { 
                key: API_KEY,
                league: league.id,
                page: page,
                per_page: 100 // Fetch 100 teams per request
              }
            });
            
            if (!teamsResponse.data || !teamsResponse.data.data) {
              console.error(`Invalid response for teams in league ${league.name}`);
              break;
            }
            
            const teams = teamsResponse.data.data;
            console.log(`Found ${teams.length} teams in ${league.name} (page ${page})`);
            
            // Add teams from this page to our collection
            allTeams = allTeams.concat(teams);
            
            // Check if there are more pages
            const totalPages = teamsResponse.data.total_pages || 1;
            if (page < totalPages) {
              page++;
              // Add a small delay to avoid overwhelming the API
              await delay(1000);
            } else {
              hasMorePages = false;
            }
          }
          
          console.log(`Total of ${allTeams.length} teams found in ${league.name}`);
          let leagueUpdatedCount = 0;
          
          // Update teams in Supabase
          for (const team of allTeams) {
            totalProcessedCount++;
            
            const teamData = {
              id: team.id,
              name: team.name,
              numerical_id: team.numerical_id || null,
              base_id: team.base_id || null,
              city: team.city || null,
              mascot: team.mascot || null,
              nickname: team.nickname || null,
              abbreviation: team.abbreviation || null,
              division: team.division || null,
              conference: team.conference || null,
              logo: team.logo || null,
              league_id: league.id,
              sport_id: league.sport_id,
              last_synced_at: new Date().toISOString()
            };
            
            // Check if team exists and has changed
            const existingTeam = existingTeamsMap[team.id];
            const hasChanged = !existingTeam || 
                              existingTeam.name !== teamData.name || 
                              existingTeam.nickname !== teamData.nickname || 
                              existingTeam.numerical_id !== teamData.numerical_id || 
                              existingTeam.base_id !== teamData.base_id || 
                              existingTeam.city !== teamData.city || 
                              existingTeam.mascot !== teamData.mascot || 
                              existingTeam.abbreviation !== teamData.abbreviation || 
                              existingTeam.division !== teamData.division || 
                              existingTeam.conference !== teamData.conference || 
                              existingTeam.logo !== teamData.logo || 
                              existingTeam.league_id !== teamData.league_id || 
                              existingTeam.sport_id !== teamData.sport_id;
            
            if (hasChanged) {
              const { error: upsertError } = await supabase
                .from('teams')
                .upsert(teamData);
                
              if (upsertError) {
                console.error(`Error updating team ${team.name}:`, upsertError);
              } else {
                updatedTeams++;
                leagueUpdatedCount++;
                changedCount++;
              }
            }
          }
          
          console.log(`Processed ${allTeams.length} teams for league ${league.name}, updated ${leagueUpdatedCount}`);
          
          return { count: allTeams.length, updated: leagueUpdatedCount, league: league.name };
        } catch (error) {
          console.error(`Error processing league ${league.name}:`, error);
          return { count: 0, updated: 0, league: league.name, error: error.message };
        }
      }));
      
      // Update totals
      batchResults.forEach(result => {
        totalTeams += result.count;
      });
      
      // Wait between batches to avoid rate limiting
      if (i + batchSize < targetLeagues.length) {
        console.log(`Waiting 3 seconds before next batch...`);
        await delay(3000);
      }
    }
    
    console.log(`Sync completed: ${totalProcessedCount} teams processed, ${changedCount} updated`);
    
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
    
    return `Processed ${totalProcessedCount} teams, ${changedCount} changed`;
    
  } catch (error) {
    console.error('Error syncing teams:', error);
    
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
  syncTeams()
    .then(() => {
      console.log('Teams sync completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Teams sync failed:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = { syncTeams }; 