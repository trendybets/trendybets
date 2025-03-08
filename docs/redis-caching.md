# Redis Caching Implementation

This document outlines the Redis caching implementation for the TrendyBets application.

## Overview

Redis caching has been implemented to improve application performance by reducing the number of API calls to external services and database queries. The caching layer is particularly useful for frequently accessed data that doesn't change often, such as game fixtures, odds, and team information.

## Implementation Details

### Redis Client Setup

A Redis client utility has been created in `lib/redis.ts` that provides:

- Connection management with retry strategies
- Functions for getting, setting, and deleting cache entries
- A wrapper function for caching async operations

### Cache Keys

Cache keys follow a consistent pattern to ensure uniqueness and readability:

- `api:{url}` - For direct API responses
- `games:active-fixtures` - For active fixtures
- `games:unplayed-fixtures` - For unplayed fixtures
- `games:scheduled-fixtures:{date-range}` - For scheduled fixtures within a date range
- `games:fixture-odds:{fixtureId}` - For odds related to a specific fixture
- `games:teams` - For team data
- `games:all-games` - For the complete processed games data

### Cache TTL (Time to Live)

Default cache TTL is set to 5 minutes (300 seconds) for most data. This provides a good balance between data freshness and performance.

### API Routes with Caching

The following API routes have been updated to use Redis caching:

1. `/api/odds/route.ts` - Caches external API calls for odds data
2. `/api/games/route.ts` - Implements multi-level caching:
   - Individual data sources (fixtures, teams, odds)
   - Complete processed response

### Force Refresh

A `refresh=true` query parameter has been added to API routes to allow bypassing the cache when needed. This is useful for:

- Ensuring the latest data during critical operations
- Debugging cache-related issues
- Manual refreshes triggered by users

## Usage in Components

The TrendyGamesView component has been updated to support force refreshing the cache when the user manually refreshes the data.

## Benefits

1. **Reduced API Calls**: External API calls are significantly reduced, especially for frequently accessed data.
2. **Improved Response Times**: Cached responses are served much faster than making new API calls.
3. **Reduced Load**: The application puts less load on external services and databases.
4. **Better User Experience**: Users experience faster page loads and data updates.

## Future Improvements

1. **Selective Cache Invalidation**: Implement more granular cache invalidation strategies.
2. **Cache Warming**: Proactively cache frequently accessed data during off-peak hours.
3. **Cache Analytics**: Add monitoring to track cache hit/miss rates and performance metrics.
4. **Distributed Caching**: Scale the Redis implementation for higher availability and performance. 