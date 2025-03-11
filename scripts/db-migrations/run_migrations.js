const { migrateGameScores } = require('./migrate_game_scores');
const { migrateTeamStats } = require('./migrate_team_stats');

async function runAllMigrations() {
  console.log('=== Starting database migrations ===');
  
  // Step 1: Migrate game scores
  console.log('Step 1: Migrating game scores...');
  try {
    const gameScoresResult = await migrateGameScores();
    
    if (gameScoresResult && gameScoresResult.success) {
      console.log(`✅ Game scores migration successful: ${gameScoresResult.migrated} of ${gameScoresResult.total} records processed`);
    } else {
      console.error('❌ Game scores migration failed:', gameScoresResult?.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Game scores migration failed with exception:', error);
  }
  
  // Step 2: Migrate team stats
  console.log('\nStep 2: Migrating team stats...');
  try {
    const teamStatsResult = await migrateTeamStats();
    
    if (teamStatsResult && teamStatsResult.success) {
      console.log(`✅ Team stats migration successful: ${teamStatsResult.migrated} of ${teamStatsResult.total} records processed`);
    } else {
      console.error('❌ Team stats migration failed:', teamStatsResult?.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Team stats migration failed with exception:', error);
  }
  
  console.log('\n=== All migrations completed ===');
}

console.log('Running migrations with Supabase credentials from .env.local...');

runAllMigrations()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration process failed:', error);
    process.exit(1);
  }); 