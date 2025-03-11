/**
 * Simple Direct Sync Scheduler
 * 
 * A streamlined scheduler that directly runs sync functions on a cron schedule
 * without going through API endpoints.
 */

require('dotenv').config({ path: '../../.env.local' });
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

// Import sync functions
const { syncSports } = require('./sync-sports');
const { syncLeagues } = require('./sync-leagues');
const { syncTeams } = require('./sync-teams');
const { syncPlayers } = require('./sync-players');
const { syncPlayerHistory } = require('./sync-player-history');
const { syncSportsbooks } = require('./sync-sportsbooks');
const { syncFixtures } = require('./sync-fixtures');
const { syncOdds } = require('./sync-odds');
const { syncMarkets } = require('./sync-markets');
const { syncFixturesCompleted } = require('./sync-fixtures-completed');
const { syncFixtureResults } = require('./sync-fixture-results');
const { syncPlayerOdds } = require('./sync-player-odds');

// Supabase connection for logging
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Sync job definitions with their schedules and functions
const syncJobs = [
  {
    name: 'sports',
    schedule: '0 0 * * 0',  // Weekly on Sunday at midnight
    function: syncSports,
    description: 'Syncs sports reference data',
    isRunning: false,
    dependencies: []
  },
  {
    name: 'leagues',
    schedule: '0 1 * * 0',  // Weekly on Sunday at 1 AM
    function: syncLeagues,
    description: 'Syncs leagues reference data',
    isRunning: false,
    dependencies: ['sports']
  },
  {
    name: 'teams',
    schedule: '0 2 * * *',  // Daily at 2 AM
    function: syncTeams,
    description: 'Syncs teams data for all active leagues',
    isRunning: false,
    dependencies: ['leagues']
  },
  {
    name: 'players',
    schedule: '0 3 * * *',  // Daily at 3 AM
    function: syncPlayers,
    description: 'Syncs players data for all sports and leagues',
    isRunning: false,
    dependencies: ['teams']
  },
  {
    name: 'player-history',
    schedule: '10 3 * * *',  // Daily at 3:10 AM (10 minutes after players)
    function: syncPlayerHistory,
    description: 'Syncs NBA player game history data',
    isRunning: false,
    dependencies: ['players']
  },
  {
    name: 'sportsbooks',
    schedule: '0 4 * * *',  // Daily at 4 AM
    function: syncSportsbooks,
    description: 'Syncs available sportsbooks data',
    isRunning: false,
    dependencies: []
  },
  {
    name: 'fixtures',
    schedule: '0 * * * *',  // Every hour, at the beginning of the hour
    function: syncFixtures,
    description: 'Syncs upcoming fixtures data',
    isRunning: false,
    dependencies: ['leagues', 'teams']
  },
  {
    name: 'odds',
    schedule: '* * * * *',  // Every minute
    function: syncOdds,
    description: 'Syncs game odds data',
    isRunning: false,
    dependencies: ['fixtures', 'sportsbooks']
  },
  {
    name: 'markets',
    schedule: null,  // Not scheduled, manual runs only
    function: syncMarkets,
    description: 'Syncs available betting markets',
    isRunning: false,
    dependencies: ['sportsbooks']
  },
  {
    name: 'fixtures-completed',
    schedule: '0 2 * * *',  // Once a day at 2 AM
    function: syncFixturesCompleted,
    description: 'Syncs completed fixtures for NBA',
    isRunning: false,
    dependencies: []
  },
  {
    name: 'fixture-results',
    schedule: '0 3 * * *',  // Once a day at 3 AM
    function: syncFixtureResults,
    description: 'Syncs detailed results for completed fixtures',
    isRunning: false,
    dependencies: ['fixtures-completed']
  },
  {
    name: 'player-odds',
    schedule: '*/10 * * * *',  // Every 10 minutes
    function: syncPlayerOdds,
    description: 'Syncs player proposition odds',
    isRunning: false,
    dependencies: ['fixtures', 'sportsbooks', 'players']
  }
  // Add more sync jobs here as you implement them
];

// Helper to log activity
async function logActivity(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  
  try {
    await supabase.from('scheduler_log').insert({
      message,
      created_at: timestamp
    });
  } catch (error) {
    console.error('Error logging to database:', error);
  }
}

// Check if all dependencies have been satisfied
async function checkDependencies(jobName) {
  const job = syncJobs.find(j => j.name === jobName);
  if (!job || !job.dependencies || job.dependencies.length === 0) {
    return true; // No dependencies
  }
  
  try {
    // Check sync_log table for completed dependencies
    for (const dep of job.dependencies) {
      const { data, error } = await supabase
        .from('sync_log')
        .select('*')
        .eq('sync_type', dep)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1);
        
      if (error || !data || data.length === 0) {
        console.log(`Dependency ${dep} has not been completed yet`);
        return false;
      }
      
      // Check if the dependency was run in the last 24 hours
      const lastRun = new Date(data[0].completed_at);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      if (lastRun < oneDayAgo) {
        console.log(`Dependency ${dep} was last run more than 24 hours ago`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error checking dependencies for ${jobName}:`, error);
    return false;
  }
}

// Function to execute a sync job
async function executeJob(job) {
  // Skip if already running
  if (job.isRunning) {
    await logActivity(`${job.name}: Skipped (already running)`);
    return;
  }
  
  job.isRunning = true;
  await logActivity(`${job.name}: Starting execution`);
  
  try {
    await job.function();
    await logActivity(`${job.name}: Completed successfully`);
  } catch (error) {
    await logActivity(`${job.name}: Failed - ${error.message}`);
    console.error(`Error executing ${job.name}:`, error);
  } finally {
    job.isRunning = false;
  }
}

// Manual execution function (for testing and one-off runs)
async function runSync(syncName, options = { force: false }) {
  const job = syncJobs.find(job => job.name === syncName);
  
  if (!job) {
    console.error(`Sync job "${syncName}" not found`);
    console.log('Available jobs:');
    syncJobs.forEach(job => console.log(`- ${job.name}: ${job.description}`));
    return;
  }
  
  // Skip dependency check if force flag is set
  if (!options.force && job.dependencies && job.dependencies.length > 0) {
    const dependenciesMet = await checkDependencies(job.name);
    if (!dependenciesMet) {
      await logActivity(`${job.name}: Skipped (dependencies not met)`);
      return;
    }
  }
  
  await executeJob(job);
}

// Start the scheduler
function startScheduler() {
  logActivity('Scheduler starting up');
  
  // Set up cron jobs for each sync
  syncJobs.forEach(job => {
    cron.schedule(job.schedule, () => executeJob(job), {
      scheduled: true,
      timezone: 'America/New_York' // Adjust as needed
    });
    
    console.log(`Scheduled: ${job.name} (${job.schedule})`);
  });
  
  console.log('Scheduler is running. Press Ctrl+C to exit.');
}

// Command line execution
if (require.main === module) {
  // Check if a specific sync job was requested
  const syncName = process.argv[2];
  const force = process.argv.includes('--force');
  
  if (syncName) {
    // Run a specific sync job
    runSync(syncName, { force })
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Error:', error);
        process.exit(1);
      });
  } else {
    // Start the scheduler
    startScheduler();
  }
}

// Export for external use
module.exports = {
  runSync,
  startScheduler,
  syncJobs
}; 