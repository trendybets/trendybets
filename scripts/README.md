# TrendyBets Data Synchronization Scripts

This directory contains scripts for maintaining and synchronizing data in the TrendyBets application.

## Direct Database Sync System

The recommended approach for data synchronization connects directly to Supabase without using API routes:

```bash
cd ~/trendybets/scripts/direct-sync
npm install
npm start  # Start the scheduler
```

See the [Direct Sync README](./direct-sync/README.md) for more details.

## Directory Structure

```
scripts/
├── direct-sync/           # Direct database sync system
│   ├── README.md          # Documentation for the direct sync system
│   ├── simple-scheduler.js # Main scheduler
│   ├── sync-*.js          # Individual sync scripts for different data types
│   └── package.json       # Dependencies
│
└── db-migrations/         # Database migration scripts
```

## Dependencies

These scripts depend on:
- `axios` - HTTP client for making API calls
- `node-cron` - For scheduling recurring tasks
- `dotenv` - For loading environment variables
- `@supabase/supabase-js` - For Supabase database operations

## Getting Started

To use the direct sync system:

1. **Install dependencies**:
   ```bash
   cd ~/trendybets/scripts/direct-sync
   npm install
   ```

2. **Set up your environment**:
   Make sure your `.env.local` file in the project root has the required credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   OPTIC_ODDS_API_KEY=your-api-key
   ```

3. **Run a sync manually**:
   ```bash
   cd ~/trendybets/scripts/direct-sync
   npm run sync:sports     # Sync sports data
   npm run sync:leagues    # Sync leagues data
   npm run sync:teams      # Sync teams data
   npm run sync:fixtures   # Sync upcoming fixtures
   npm run sync:odds       # Sync game odds
   # And many more - see direct-sync/README.md for the full list
   ```

4. **Or start the scheduler**:
   ```bash
   cd ~/trendybets/scripts/direct-sync
   npm start
   ```

## Production Deployment

For production environments, it's recommended to use PM2:

```bash
# Install PM2
npm install -g pm2

# Start the scheduler
cd ~/trendybets/scripts/direct-sync
pm2 start simple-scheduler.js --name "trendybets-sync" -- start

# Make sure it restarts on system boot
pm2 save
pm2 startup
```

## Monitoring

All sync operations log their activities to the `sync_log` table in Supabase.

## Sync Schedule

| Sync Job | Schedule | Dependencies |
|----------|----------|--------------|
| sports | Every 24 hours | None |
| leagues | Every 24 hours | sports |
| teams | Every 24 hours | leagues |
| players | Every 12 hours | teams |
| player-history | Every 24 hours at 4 AM | players |
| sportsbooks | Every 12 hours | None |
| fixtures | Every 30 minutes | leagues, teams |
| fixtures-completed | Once daily at 2 AM | None |
| fixture-results | Once daily at 3 AM | fixtures-completed |
| odds | Every 10 minutes | fixtures, sportsbooks |
| markets | Every 24 hours | None |
| player-odds | Every 30 minutes | fixtures, sportsbooks |

See the [Direct Sync README](./direct-sync/README.md) for more details and customization options. 