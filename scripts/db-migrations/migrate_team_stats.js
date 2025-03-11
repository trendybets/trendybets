const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')

// Load environment variables from .env.local in project root
// First try the scripts directory
const scriptDirEnvPath = path.resolve(process.cwd(), '.env.local');
// Then try the project root (one level up if we're in scripts/ directory)
const projectRootEnvPath = path.resolve(process.cwd(), '..', '.env.local');

if (fs.existsSync(scriptDirEnvPath)) {
  require('dotenv').config({ path: scriptDirEnvPath });
  console.log('Loaded .env.local from scripts directory');
} else if (fs.existsSync(projectRootEnvPath)) {
  require('dotenv').config({ path: projectRootEnvPath });
  console.log('Loaded .env.local from project root directory');
} else {
  console.warn('No .env.local file found, looking for environment variables directly');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Missing Supabase credentials. Check your .env.local file')
  console.error('Required variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  console.error('Looked in:');
  console.error(`- ${scriptDirEnvPath}`);
  console.error(`- ${projectRootEnvPath}`);
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Check if a fixture exists in the fixtures table
async function doesFixtureExist(fixtureId) {
  const { data, error } = await supabase
    .from('fixtures')
    .select('id')
    .eq('id', fixtureId)
    .single();
  
  return !error && data;
}

// Add entry to the fixtures table if it doesn't exist
async function ensureFixtureExists(fixtureData) {
  // First check if it exists
  const exists = await doesFixtureExist(fixtureData.fixture_id);
  if (exists) return true;
  
  // We need minimal information to create a fixture
  if (!fixtureData.home_team_id || !fixtureData.away_team_id) {
    console.warn(`Cannot create fixture for ${fixtureData.fixture_id}: missing team IDs`);
    return false;
  }

  // Construct a minimal fixtures record from the result data
  const fixtureRecord = {
    id: fixtureData.fixture_id,
    game_id: fixtureData.game_id || fixtureData.fixture_id,
    start_date: fixtureData.start_date || new Date().toISOString(),
    status: 'completed', // Since we're working with completed fixtures
    is_live: false,
    home_team_display: fixtureData.home_team_display,
    away_team_display: fixtureData.away_team_display,
    created_at: new Date().toISOString(),
    home_team_id: fixtureData.home_team_id,
    away_team_id: fixtureData.away_team_id,
    sport_id: null, // We don't have this info from the fixture results
    league_id: null, // We don't have this info from the fixture results
    updated_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString()
  };
  
  const { error } = await supabase
    .from('fixtures')
    .insert(fixtureRecord);
  
  if (error) {
    console.error(`Error creating fixture record for ${fixtureData.fixture_id}:`, error);
    return false;
  }
  
  return true;
}

async function migrateTeamStats() {
  console.log('Starting team_stats migration...')
  
  // 1. Get all fixture results data
  const { data: fixtureResults, error: resultsError } = await supabase
    .from('fixture_results')
    .select('*')
  
  if (resultsError) {
    console.error('Error fetching fixture results:', resultsError)
    return { success: false, error: resultsError.message }
  }
  
  console.log(`Found ${fixtureResults.length} fixture results to migrate`)
  
  // 2. Process each fixture result and create team stats records
  const teamStats = []
  let processedFixtures = 0;
  
  for (const result of fixtureResults) {
    try {
      // Skip if we don't have the required IDs
      if (!result.fixture_id || !result.home_team_id || !result.away_team_id) {
        console.warn(`Skipping result ${result.id} due to missing team or fixture IDs`)
        continue
      }
      
      // Ensure the fixture exists in the fixtures table
      const fixtureCreated = await ensureFixtureExists(result);
      
      if (!fixtureCreated) {
        console.warn(`Skipping result ${result.id} - could not create fixture record`);
        continue;
      }
      
      processedFixtures++;
      
      // Home team stats
      teamStats.push({
        id: `ts_home_${result.id}`,
        fixture_id: result.fixture_id,
        team_id: result.home_team_id,
        is_home: true,
        
        // Offensive stats
        points: result.home_points,
        field_goals_made: result.home_field_goals_made,
        field_goals_attempted: result.home_field_goals_attempted,
        three_point_made: result.home_three_point_made,
        three_point_attempted: result.home_three_point_attempted,
        free_throws_made: result.home_free_throws_made,
        free_throws_attempted: result.home_free_throws_attempted,
        assists: result.home_assists,
        
        // Defensive stats
        total_rebounds: result.home_total_rebounds,
        offensive_rebounds: result.home_offensive_rebounds,
        defensive_rebounds: result.home_defensive_rebounds,
        steals: result.home_steals,
        blocks: result.home_blocks,
        
        // Other stats
        turnovers: result.home_turnovers,
        points_in_paint: result.home_points_in_paint,
        fast_break_points: result.home_fast_break_points,
        points_off_turnovers: result.home_points_off_turnovers,
        second_chance_points: result.home_second_chance_points,
        
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Away team stats
      teamStats.push({
        id: `ts_away_${result.id}`,
        fixture_id: result.fixture_id,
        team_id: result.away_team_id,
        is_home: false,
        
        // Offensive stats
        points: result.away_points,
        field_goals_made: result.away_field_goals_made,
        field_goals_attempted: result.away_field_goals_attempted,
        three_point_made: result.away_three_point_made,
        three_point_attempted: result.away_three_point_attempted,
        free_throws_made: result.away_free_throws_made,
        free_throws_attempted: result.away_free_throws_attempted,
        assists: result.away_assists,
        
        // Defensive stats
        total_rebounds: result.away_total_rebounds,
        offensive_rebounds: result.away_offensive_rebounds,
        defensive_rebounds: result.away_defensive_rebounds,
        steals: result.away_steals,
        blocks: result.away_blocks,
        
        // Other stats
        turnovers: result.away_turnovers,
        points_in_paint: result.away_points_in_paint,
        fast_break_points: result.away_fast_break_points,
        points_off_turnovers: result.away_points_off_turnovers,
        second_chance_points: result.away_second_chance_points,
        
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error processing fixture result ${result.id}:`, error);
    }
  }
  
  console.log(`Processed ${processedFixtures} fixtures with ${teamStats.length} team stats records, ready to insert`);
  
  // 3. Insert into team_stats table in batches to avoid size limits
  const batchSize = 50
  let successCount = 0
  
  for (let i = 0; i < teamStats.length; i += batchSize) {
    const batch = teamStats.slice(i, i + batchSize)
    const { error: insertError } = await supabase
      .from('team_stats')
      .insert(batch)
    
    if (insertError) {
      console.error(`Error inserting team stats batch ${Math.floor(i/batchSize) + 1}:`, insertError)
    } else {
      successCount += batch.length
      console.log(`Inserted batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(teamStats.length/batchSize)}`)
    }
  }
  
  console.log(`Successfully migrated ${successCount} of ${teamStats.length} team stats records`)
  return { success: true, migrated: successCount, total: teamStats.length }
}

// Run migration if script is executed directly
if (require.main === module) {
  migrateTeamStats()
    .then(result => {
      console.log('Team stats migration completed')
      if (result && result.success) {
        console.log(`Summary: Migrated ${result.migrated} of ${result.total} records`)
      }
    })
    .catch(err => console.error('Migration error:', err))
}

module.exports = { migrateTeamStats } 