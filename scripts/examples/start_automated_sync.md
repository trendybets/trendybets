# Setting Up Automated Data Synchronization

This guide explains how to set up the automated sync process for the `team_stats` and `game_scores` tables in TrendyBets.

## Prerequisites

- Node.js 14+ installed
- Access to Supabase credentials (available in `.env.local`)
- PM2 (for production) or another process manager

## Installation Steps

### 1. Install Dependencies

Navigate to the scripts directory and install dependencies:

```bash
cd ~/trendybets/scripts
npm install
```

### 2. Running a One-time Sync

Before setting up automated syncs, you can run a one-time sync:

```bash
# Sync from existing database tables
npm run sync

# Sync from the API
npm run sync-api
```

### 3. Testing the Scheduler

You can test the scheduler by running it directly:

```bash
npm run start-scheduler
```

This will start the scheduler with the following jobs:
- API sync every 6 hours
- Database sync every 12 hours
- Hourly check for past-due jobs

### 4. Setting Up as a Background Service (Production)

For production environments, set up the scheduler as a background service using PM2:

```bash
# Install PM2 globally if not already installed
npm install -g pm2

# Start the scheduler as a background service
pm2 start sync-tools/schedule_sync.js --name "trendybets-sync"

# Save the PM2 configuration
pm2 save

# Set up PM2 to start on system boot
pm2 startup
```

### 5. Monitoring the Sync Process

You can monitor the sync process in several ways:

1. **PM2 Logs**:
   ```bash
   pm2 logs trendybets-sync
   ```

2. **Supabase Tables**:
   - Check the `sync_log` table for detailed logs of each sync operation
   - Check the `sync_schedule` table for upcoming scheduled syncs

3. **Custom Monitoring**:
   Create a monitoring dashboard by querying the `sync_log` table:
   ```sql
   SELECT 
     sync_type,
     started_at,
     completed_at,
     status,
     records_processed,
     error
   FROM sync_log
   ORDER BY started_at DESC
   LIMIT 20;
   ```

## Troubleshooting

### Common Issues

1. **Missing Team IDs**:
   If you see errors about missing team IDs, you may need to update your fixtures table with proper team references.

2. **API Errors**:
   Check your API key and endpoints in `.env.local` if API syncs are failing.

3. **Scheduler Not Running**:
   If scheduled jobs aren't running, check that the cron expressions in `schedule_sync.js` are correct for your timezone.

### Manual Fixes

If the automated sync fails, you can manually trigger syncs:

```bash
# Run a full database sync
node ~/trendybets/scripts/sync-tools/process_game_data.js

# Run an API sync
node ~/trendybets/scripts/sync-tools/process_game_data.js --api
```

## Custom Configuration

You can modify the sync schedule by editing the cron expressions in `schedule_sync.js`. 

For example, to change the API sync to run every 4 hours instead of 6, change:
```javascript
// From
cron.schedule('0 */6 * * *', runApiSync, {
  scheduled: true,
  timezone: "America/New_York"
})

// To
cron.schedule('0 */4 * * *', runApiSync, {
  scheduled: true,
  timezone: "America/New_York"
})
``` 