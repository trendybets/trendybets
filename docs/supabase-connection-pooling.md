# Supabase Connection Pooling

This document outlines the implementation of connection pooling for Supabase in the TrendyBets application.

## Overview

Connection pooling is a technique used to improve the performance of database operations by reusing connections instead of creating new ones for each request. This reduces the overhead of establishing new connections and helps manage database resources more efficiently.

## Implementation Details

### Connection Pool Manager

A connection pool manager has been implemented in `lib/db/supabase-pool.ts` that provides:

- Management of a pool of Supabase client connections
- Automatic scaling of the connection pool based on demand
- Connection reuse across API routes
- Idle connection cleanup to prevent resource leaks
- Timeout handling for connection acquisition

### Pool Configuration

The connection pool can be configured with the following parameters:

- `min`: Minimum number of connections to maintain in the pool (default: 2)
- `max`: Maximum number of connections allowed in the pool (default: 10)
- `idleTimeoutMs`: Time in milliseconds after which idle connections are removed (default: 30000)
- `acquireTimeoutMs`: Time in milliseconds to wait for a connection before timing out (default: 5000)

### Client Types

Two types of connection pools are maintained:

1. **Service Role Pool**: For operations that require admin privileges
2. **Anonymous Pool**: For operations that only require public access

### Usage Patterns

The connection pool is designed to be used with the following patterns:

#### 1. Direct Client Acquisition

```typescript
import { getServiceRoleClient, releaseClient } from '@/lib/db/supabase-pool'

async function someFunction() {
  const client = await getServiceRoleClient()
  try {
    // Use the client
    const { data } = await client.from('table').select('*')
    return data
  } finally {
    // Always release the client back to the pool
    releaseClient(client)
  }
}
```

#### 2. Using the Wrapper Functions

```typescript
import { withServiceRole } from '@/lib/db/supabase-pool'

async function someFunction() {
  return withServiceRole(async (client) => {
    // Use the client
    const { data } = await client.from('table').select('*')
    return data
  })
}
```

#### 3. With Performance Logging

```typescript
import { withServiceRoleClient, withPerformanceLogging } from '@/lib/db/supabase-client'

async function someFunction() {
  return withPerformanceLogging(async () => {
    return withServiceRoleClient(async (client) => {
      // Use the client
      const { data } = await client.from('table').select('*')
      return data
    })
  }, 'query_name')
}
```

### Centralized Client Module

A centralized client module has been created in `lib/db/supabase-client.ts` that provides:

- Access to the connection pool
- Helper functions for common database operations
- Error handling and retries
- Performance logging

## Benefits

1. **Improved Performance**: Reusing connections reduces the overhead of establishing new connections for each request.
2. **Resource Management**: The connection pool manages the number of open connections to prevent resource exhaustion.
3. **Scalability**: The pool automatically scales up and down based on demand, within configured limits.
4. **Reliability**: Connection acquisition timeouts and retries improve the reliability of database operations.
5. **Monitoring**: Performance logging helps identify slow queries and optimize database operations.

## Best Practices

1. **Always Release Connections**: When using direct client acquisition, always release the connection back to the pool using `releaseClient()`.
2. **Use Wrapper Functions**: Prefer using the wrapper functions (`withServiceRole`, `withAnonRole`) to ensure connections are properly released.
3. **Add Performance Logging**: Use `withPerformanceLogging` to track the performance of database operations.
4. **Configure Pool Size**: Adjust the pool size based on your application's needs and the database's connection limits.
5. **Handle Errors**: Use `withRetry` for operations that may fail due to temporary issues.

## Future Improvements

1. **Connection Health Checks**: Implement periodic health checks to ensure connections in the pool are still valid.
2. **Connection Tagging**: Add support for tagging connections for specific purposes or tenants.
3. **Pool Metrics**: Add more detailed metrics about pool usage and performance.
4. **Dynamic Pool Sizing**: Implement dynamic pool sizing based on application load.
5. **Connection Prioritization**: Add support for prioritizing certain operations over others when acquiring connections. 