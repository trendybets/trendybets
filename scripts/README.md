# TrendyBets Data Synchronization Scripts

This directory contains scripts for maintaining and synchronizing data in the TrendyBets application.

## Recommended Approach: Direct Database Sync

We've implemented a new, more efficient approach for data synchronization that connects directly to Supabase without using API routes:

```bash
cd ~/trendybets/scripts/direct-sync
npm install
npm start  # Start the scheduler
```

See the [Direct Sync README](./direct-sync/README.md) for more details. This is the **recommended approach** going forward.

## Legacy Approaches (Deprecated)

The following directories contain older synchronization approaches that are now considered legacy:

- **db-migrations/** - Database migration scripts
- **sync-tools/** - API-based sync tools (uses Next.js API routes)
- **utils/** - Utility scripts

## Directory Structure

```
scripts/
├── direct-sync/           # NEW: Direct database sync (recommended)
│   ├── sync-sports-leagues.js
│   ├── sync-teams.js
│   └── simple-scheduler.js
│
├── db-migrations/         # Legacy: Database migration scripts
│
├── sync-tools/            # Legacy: API-based sync tools
│
└── utils/                 # Legacy: Utility scripts
```

## Dependencies

These scripts depend on:
- `axios` - HTTP client for making API calls
- `node-cron` - For scheduling recurring tasks
- `dotenv` - For loading environment variables
- `@supabase/supabase-js` - For Supabase database operations

## Getting Started

To use the new direct sync approach:

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
   npm run sync:sports  # Sync sports and leagues
   npm run sync:teams   # Sync teams data
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
pm2 start simple-scheduler.js --name "trendybets-sync"

# Make sure it restarts on system boot
pm2 save
pm2 startup
```

## Monitoring

All sync operations log their activities to the `sync_log` table in Supabase, and scheduler activities are logged to the `scheduler_log` table.

## Game Statistics Sync

This system maintains the optimized `game_scores` and `team_stats` tables that provide enhanced querying capabilities for team comparisons and game research.

- **See:** [Game Data Synchronization System](./sync-tools/README.md)

## API Endpoint Sync

This system automates the calling of your API endpoints that fetch and process data from external sources, replacing the need for manual buttons in the frontend.

- **See:** [API Sync Scheduler](./sync-tools/api-sync-scheduler-README.md)

## Customization

See the individual README files for each sync system to learn how to customize frequencies, add new endpoints, or modify the sync behavior. 