# TrendyBets Direct Sync System

This folder contains a direct database sync system for TrendyBets that eliminates the need for API endpoints. Instead of making HTTP requests to your Next.js API routes, these scripts connect directly to:

1. External data sources (OpticOdds API)
2. Your Supabase database

This approach provides multiple benefits:
- **Simpler architecture** - No API middleware layer
- **Better performance** - Direct database access is faster
- **Fewer points of failure** - No HTTP connection errors
- **Easier to debug** - Straightforward logging to console and database
- **Built-in scheduling** - Uses node-cron for reliable timing

## Quick Start

```bash
# Install dependencies
npm install

# Start the scheduler (runs all syncs on schedule)
npm start

# OR run individual sync jobs
npm run sync:sports          # Sync sports data
npm run sync:leagues         # Sync leagues data
npm run sync:teams           # Sync teams data
npm run sync:players         # Sync players data
npm run sync:player-history  # Sync NBA player game history
npm run sync:sportsbooks     # Sync sportsbooks data
npm run sync:fixtures        # Sync upcoming fixtures data
npm run sync:odds            # Sync game odds data
npm run sync:markets         # Sync available betting markets
npm run sync:fixtures-completed # Sync completed NBA fixtures
npm run sync:fixture-results   # Sync detailed results for completed fixtures
npm run sync:player-odds     # Sync player proposition odds
```

## Available Sync Jobs

| Job Name | Description | Schedule | Dependencies | Command |
|----------|-------------|----------|-------------|---------|
| sports | Syncs sports reference data | Weekly on Sunday at midnight | None | `npm run sync:sports` |
| leagues | Syncs leagues reference data | Weekly on Sunday at 1 AM | sports | `npm run sync:leagues` |
| teams | Syncs teams data | Daily at 2 AM | leagues | `npm run sync:teams` |
| players | Syncs players data | Daily at 3 AM | teams | `npm run sync:players` |
| player-history | Syncs NBA player game history | Daily at 3:10 AM | players | `npm run sync:player-history` |
| sportsbooks | Syncs available sportsbooks data | Daily at 4 AM | None | `npm run sync:sportsbooks` |
| fixtures | Syncs upcoming fixtures data | Every hour | leagues, teams | `npm run sync:fixtures` |
| odds | Syncs game odds data | Every minute | fixtures, sportsbooks | `npm run sync:odds` |
| markets | Syncs available betting markets | Manual only | sportsbooks | `npm run sync:markets` |
| fixtures-completed | Syncs completed NBA fixtures | Daily at 2 AM | None | `npm run sync:fixtures-completed` |
| fixture-results | Syncs detailed results for completed fixtures | Daily at 3 AM | fixtures-completed | `npm run sync:fixture-results` |
| player-odds | Syncs player proposition odds | Every 10 minutes | fixtures, sportsbooks, players | `npm run sync:player-odds` |

## Tables Being Synced

We're working on sync scripts for the following tables:

1. ✅ sports
2. ✅ leagues
3. ✅ teams
4. ✅ players
5. ✅ player_history (NBA only)
6. ✅ sportsbooks
7. ✅ fixtures
8. ✅ fixtures_completed
9. ✅ fixture_result
10. ✅ odds
11. ✅ market
12. ✅ player_odds

## Adding New Sync Jobs

1. Create a new sync module following the pattern in existing sync scripts
2. Add your sync function to the `syncJobs` array in `simple-scheduler.js`
3. Add a shortcut command in `package.json` for easy access

Example new sync module:

```javascript
// sync-fixtures.js
async function syncFixtures() {
  // Connect to Supabase
  // Fetch data from API 
  // Update database
  // Log results
}

module.exports = { syncFixtures };
```

## Production Deployment

For production, you can use PM2 to ensure the scheduler stays running:

```bash
# Install PM2 globally
npm install -g pm2

# Start the scheduler with PM2
pm2 start simple-scheduler.js --name "trendybets-sync"

# Make sure it restarts with your server
pm2 save
pm2 startup
```

## Database Tables

This system uses the following tables in your Supabase database:

- `sync_log` - Records of each sync operation
- `scheduler_log` - General scheduler activity
- `sports`, `leagues`, `teams`, etc. - The actual data tables

## Environment Variables

Make sure your `.env.local` file in the project root contains:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPTIC_ODDS_API_KEY=your-api-key
``` 