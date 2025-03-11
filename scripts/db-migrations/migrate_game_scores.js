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
  const exists = await doesFixtureExist(fixtureData.id);
  if (exists) return true;
  
  // Construct a minimal fixtures record from the completed data
  const fixtureRecord = {
    id: fixtureData.id,
    numerical_id: fixtureData.numerical_id,
    game_id: fixtureData.game_id || fixtureData.id,
    start_date: fixtureData.start_date || new Date().toISOString(),
    status: 'completed', // Since we're working with completed fixtures
    is_live: false,
    home_team_display: fixtureData.home_team_display,
    away_team_display: fixtureData.away_team_display,
    venue_name: fixtureData.venue_name,
    venue_location: fixtureData.venue_location,
    broadcast: fixtureData.broadcast,
    created_at: new Date().toISOString(),
    // Attempt to extract home and away team IDs from competitors
    home_team_id: fixtureData.home_competitors?.[0]?.id || 'unknown',
    away_team_id: fixtureData.away_competitors?.[0]?.id || 'unknown',
    sport_id: null, // We don't have this info from the completed fixtures
    league_id: null, // We don't have this info from the completed fixtures
    updated_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString()
  };
  
  const { error } = await supabase
    .from('fixtures')
    .insert(fixtureRecord);
  
  if (error) {
    console.error(`Error creating fixture record for ${fixtureData.id}:`, error);
    return false;
  }
  
  return true;
}

async function migrateGameScores() {
  console.log('Starting game_scores migration...')
  
  // 1. Get all completed fixtures data
  const { data: fixtures, error: fixturesError } = await supabase
    .from('fixtures_completed')
    .select('*')
  
  if (fixturesError) {
    console.error('Error fetching fixtures:', fixturesError)
    return { success: false, error: fixturesError.message }
  }
  
  console.log(`Found ${fixtures.length} fixtures to migrate`)
  
  // 2. Transform data for game_scores table
  const gameScores = []
  
  // 3. Process each fixture and ensure it exists in fixtures table
  for (const fixture of fixtures) {
    try {
      // Ensure the fixture exists in the fixtures table
      const fixtureCreated = await ensureFixtureExists(fixture);
      
      if (!fixtureCreated) {
        console.warn(`Skipping fixture ${fixture.id} - could not create fixture record`);
        continue;
      }
      
      // Calculate overtime if needed by subtracting period scores from total
      let homeOT = 0;
      let awayOT = 0;
      
      if (fixture.home_score_total && 
          fixture.home_score_q1 !== null && 
          fixture.home_score_q2 !== null && 
          fixture.home_score_q3 !== null && 
          fixture.home_score_q4 !== null) {
        
        const regularTimeScore = (fixture.home_score_q1 || 0) + 
                                (fixture.home_score_q2 || 0) + 
                                (fixture.home_score_q3 || 0) + 
                                (fixture.home_score_q4 || 0);
                                
        homeOT = fixture.home_score_total - regularTimeScore;
        if (homeOT < 0) homeOT = 0; // Safety check
      }
      
      if (fixture.away_score_total && 
          fixture.away_score_q1 !== null && 
          fixture.away_score_q2 !== null && 
          fixture.away_score_q3 !== null && 
          fixture.away_score_q4 !== null) {
        
        const regularTimeScore = (fixture.away_score_q1 || 0) + 
                                (fixture.away_score_q2 || 0) + 
                                (fixture.away_score_q3 || 0) + 
                                (fixture.away_score_q4 || 0);
                                
        awayOT = fixture.away_score_total - regularTimeScore;
        if (awayOT < 0) awayOT = 0; // Safety check
      }
      
      // Add to the game scores array
      gameScores.push({
        id: `gs_${fixture.id}`,
        fixture_id: fixture.id,
        home_period_1: fixture.home_score_q1,
        home_period_2: fixture.home_score_q2,
        home_period_3: fixture.home_score_q3,
        home_period_4: fixture.home_score_q4,
        home_overtime: homeOT > 0 ? homeOT : null,
        away_period_1: fixture.away_score_q1,
        away_period_2: fixture.away_score_q2,
        away_period_3: fixture.away_score_q3,
        away_period_4: fixture.away_score_q4,
        away_overtime: awayOT > 0 ? awayOT : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error processing fixture ${fixture.id}:`, error);
    }
  }
  
  console.log(`Processed ${gameScores.length} game scores, ready to insert`);
  
  // 4. Insert into game_scores table in batches
  const batchSize = 50;
  let successCount = 0;
  
  for (let i = 0; i < gameScores.length; i += batchSize) {
    const batch = gameScores.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('game_scores')
      .insert(batch)
    
    if (insertError) {
      console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, insertError)
    } else {
      successCount += batch.length;
      console.log(`Inserted batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(gameScores.length/batchSize)}`)
    }
  }
  
  console.log(`Successfully migrated ${successCount} of ${gameScores.length} game scores`)
  return { success: true, migrated: successCount, total: gameScores.length }
}

// Run migration if script is executed directly
if (require.main === module) {
  migrateGameScores()
    .then(result => {
      console.log('Game scores migration completed')
      if (result && result.success) {
        console.log(`Summary: Migrated ${result.migrated} of ${result.total} records`)
      }
    })
    .catch(err => console.error('Migration error:', err))
}

module.exports = { migrateGameScores } 