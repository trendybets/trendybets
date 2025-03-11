# TrendyBets API Integration & Data Synchronization

## Overview

TrendyBets integrates with external APIs to fetch sports data and implements a robust synchronization system to keep the database updated with the latest information. This document outlines the API integrations and the data synchronization process.

## External API Integration

### OpticOdds API

The primary external data source is the OpticOdds API, which provides comprehensive sports data including:

- Upcoming fixtures (games)
- Completed fixtures with results
- Team information
- Player information
- Betting odds from various sportsbooks

#### API Endpoints Used

- `/fixtures/active` - Active fixtures
- `/fixtures` - All fixtures
- `/fixtures/odds` - Odds for fixtures
- `/teams` - Team information
- `/players` - Player information

#### Authentication

API requests include an API key as a query parameter:

```typescript
const url = `https://api.opticodds.com/api/v3/fixtures/active?sport=basketball&league=nba&key=${serverEnv.OPTIC_ODDS_API_KEY}`
```

## Internal API Routes

The application implements several API routes to handle data fetching and synchronization:

### Game Data API Routes

- `/api/games` - Fetches upcoming games with odds
- `/api/team-trends` - Fetches team trends and statistics

### Synchronization API Routes

- `/api/sync-fixtures` - Syncs upcoming fixtures
- `/api/sync-fixtures-completed` - Syncs completed fixtures
- `/api/sync-teams` - Syncs team information
- `/api/sync-players` - Syncs player information
- `/api/sync-player-history` - Syncs player game history
- `/api/sync-odds` - Syncs betting odds
- `/api/sync-player-odds` - Syncs player prop odds
- `/api/sync-markets` - Syncs betting markets
- `/api/sync-sportsbooks` - Syncs sportsbook information
- `/api/sync-coordinator` - Coordinates batch synchronization

### Authentication API Routes

- `/api/auth` - Handles user authentication

## Data Synchronization Process

### Automated Synchronization

Data synchronization is automated using Vercel cron jobs that trigger the sync API routes at regular intervals:

1. **Player History Sync** (`/api/sync-player-history`):
   - Updates the `player_history` table with new game statistics
   - Runs every 6 hours

2. **Completed Fixtures Sync** (`/api/sync-fixtures-completed`):
   - Updates the `fixtures_completed` table with completed game results
   - Runs every 12 hours

3. **Fixtures Sync** (`/api/sync-fixtures`):
   - Updates the `fixtures` table with upcoming game information
   - Runs every 4 hours

4. **Run Predictions** (`/api/run-predictions`):
   - Executes the prediction algorithm to generate new player prop predictions
   - Runs every 6 hours, 30 minutes after data sync

### Sync Implementation Details

Each sync API route follows a similar pattern:

1. **Authentication Check**: Verify the API token to prevent unauthorized access
2. **Fetch Data**: Retrieve data from the external API
3. **Process Data**: Transform the data into the required format
4. **Upsert Data**: Insert or update records in the database
5. **Error Handling**: Handle and log any errors that occur
6. **Response**: Return a success or error response

Example implementation (simplified):

```typescript
export async function POST(request: Request) {
  // Authentication check
  const apiToken = request.headers.get('api-token');
  if (apiToken !== serverEnv.CRON_API_TOKEN) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    // Fetch data from external API
    const response = await fetch(externalApiUrl);
    const data = await response.json();
    
    // Process data
    const processedData = processData(data);
    
    // Upsert data to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: result, error } = await supabase
      .from('table_name')
      .upsert(processedData, { onConflict: 'id' });
    
    if (error) throw error;
    
    // Return success response
    return new NextResponse(JSON.stringify({ 
      success: true, 
      count: processedData.length 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync error:', error);
    
    // Return error response
    return new NextResponse(JSON.stringify({ 
      error: 'Sync failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

### Batch Processing

For large datasets, the application uses batch processing to avoid timeouts:

1. The `/api/sync-coordinator` endpoint divides the work into smaller batches
2. Each batch is processed sequentially or in parallel, depending on the operation
3. Progress is tracked and reported

### Caching

To improve performance and reduce API calls, the application implements caching:

1. Redis is used for caching API responses
2. Cache TTL (Time To Live) is set based on the data type
3. The `withCache` utility function handles cache management:

```typescript
return withCache(
  cacheKey,
  async () => {
    // Fetch data from external API
    const response = await fetch(url);
    const data = await response.json();
    return data;
  },
  CACHE_TTL
);
```

## Manual Triggering

Sync processes can be manually triggered using curl commands:

```bash
# Sync fixtures (upcoming games)
curl -X POST https://your-domain.com/api/sync-fixtures -H "api-token: YOUR_API_TOKEN"

# Sync player history for a specific player
curl -X POST https://your-domain.com/api/sync-player-history -H "api-token: YOUR_API_TOKEN" -H "Content-Type: application/json" -d '{"player_id": 123}'
```

## Error Handling and Logging

The synchronization system includes comprehensive error handling and logging:

1. Failed operations are retried with exponential backoff
2. Errors are logged with detailed information
3. Connectivity issues are handled with fallback mechanisms
4. Timeouts are managed to prevent hung processes
