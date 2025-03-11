#!/usr/bin/env node

/**
 * Run individual sync endpoints for TrendyBets
 * 
 * This is a root-level script that forwards to the actual implementation
 * in the scripts directory.
 * 
 * Usage:
 *   node run-sync.js <endpoint-name>
 * 
 * Example:
 *   node run-sync.js sync-teams
 *   node run-sync.js sync-player-history
 */

// Get command line arguments to pass through
const args = process.argv.slice(2);

// Import the script from the scripts directory
try {
  require('./scripts/run-sync.js');
} catch (error) {
  console.error('Error running sync script:', error.message);
  console.error('\nMake sure you have installed the required dependencies:');
  console.error('cd scripts && npm install');
  process.exit(1);
} 