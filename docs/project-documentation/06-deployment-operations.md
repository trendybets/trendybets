# TrendyBets Deployment & Operations

## Overview

TrendyBets is deployed on Vercel, a cloud platform for static sites and serverless functions. This document outlines the deployment process, environment configuration, and operational considerations for the application.

## Deployment Platform

### Vercel

Vercel provides:
- Automatic deployments from Git
- Preview deployments for pull requests
- Serverless functions for API routes
- Edge caching
- Custom domains and SSL
- Cron jobs for scheduled tasks

## Deployment Process

### Continuous Deployment

The application uses continuous deployment from GitHub:

1. Code is pushed to the main branch
2. Vercel automatically detects changes
3. Build process is triggered
4. Application is deployed to production
5. Deployment is verified

### Build Process

The build process includes:

1. Installing dependencies: `npm install`
2. Building the application: `next build`
3. Generating static assets
4. Deploying serverless functions

## Environment Configuration

### Environment Variables

The application requires several environment variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# API Keys
OPTIC_ODDS_API_KEY=your_optic_odds_api_key

# Redis (for caching)
REDIS_URL=your_redis_url

# Cron Jobs
CRON_API_TOKEN=your_cron_api_token

# Node Options (for DNS resolution)
NODE_OPTIONS=--dns-result-order=ipv4first
```

These variables should be configured in Vercel's environment settings.

### Local Development Environment

For local development, create a `.env.local` file with the required environment variables.

Example `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPTIC_ODDS_API_KEY=your_api_key
REDIS_URL=redis://localhost:6379
CRON_API_TOKEN=your_local_token
```

## Scheduled Tasks

### Vercel Cron Jobs

The application uses Vercel Pro features for more frequent cron job execution:

- Player history sync: Every 6 hours
- Fixtures completed sync: Every 12 hours
- Fixtures sync: Every 4 hours
- Predictions: Every 6 hours, 30 minutes after sync

### Cron Job Configuration

Cron jobs are configured in the `vercel.json` file:

```json
{
  "crons": [
    {
      "path": "/api/sync-fixtures",
      "schedule": "0 */4 * * *"
    },
    {
      "path": "/api/sync-fixtures-completed",
      "schedule": "0 */12 * * *"
    },
    {
      "path": "/api/sync-player-history",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/run-predictions",
      "schedule": "30 */6 * * *"
    }
  ]
}
```

### Manual Triggering

Cron jobs can be manually triggered using curl commands:

```bash
# Sync fixtures
curl -X POST https://your-domain.com/api/sync-fixtures -H "api-token: your_cron_api_token"

# Sync player history in batches
curl -X POST https://your-domain.com/api/sync-coordinator -H "api-token: your_cron_api_token"
```

## Monitoring & Logging

### Vercel Analytics

Vercel provides built-in analytics for:
- Page views
- Performance metrics
- Error rates
- API route usage

### Application Logging

The application uses console logging for server-side operations:

```typescript
console.log('Fetching fixtures...');
console.error('Error syncing data:', error);
```

These logs are available in the Vercel dashboard.

### Error Tracking

For production error tracking, consider integrating:
- Sentry
- LogRocket
- New Relic

## Performance Optimization

### Edge Caching

Vercel provides edge caching for static assets and API responses.

### Redis Caching

The application uses Redis for caching API responses:

```typescript
return withCache(
  cacheKey,
  async () => {
    // Fetch data
    return data;
  },
  CACHE_TTL
);
```

### Image Optimization

Next.js Image component is used for automatic image optimization.

## Security Considerations

### API Authentication

API routes are protected using a token-based authentication system:

```typescript
const apiToken = request.headers.get('api-token');
if (apiToken !== serverEnv.CRON_API_TOKEN) {
  return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Environment Variable Protection

Sensitive environment variables are:
- Never exposed to the client
- Stored securely in Vercel
- Referenced using the `serverEnv` object

### HTTPS

All traffic is served over HTTPS by default on Vercel.

## Scaling Considerations

### Serverless Functions

Vercel's serverless functions automatically scale based on demand.

### Database Scaling

Supabase provides database scaling options:
- Vertical scaling (upgrading plan)
- Connection pooling
- Read replicas (on higher plans)

### Redis Scaling

For Redis scaling, consider:
- Upgrading to a larger plan
- Implementing a clustered Redis solution
- Using a managed Redis service

## Backup & Recovery

### Database Backups

Supabase provides:
- Automated daily backups
- Point-in-time recovery
- Manual backup options

### Disaster Recovery

For disaster recovery:
1. Maintain regular database backups
2. Document recovery procedures
3. Test recovery process periodically

## Maintenance Procedures

### Dependency Updates

Regularly update dependencies:

```bash
npm update
```

Review and test changes before deploying to production.

### Database Maintenance

Perform regular database maintenance:
- Vacuum operations
- Index optimization
- Query performance analysis

## Troubleshooting

### Common Deployment Issues

1. **Build Failures**:
   - Check build logs in Vercel dashboard
   - Verify dependencies are correctly installed
   - Ensure environment variables are properly set

2. **API Timeouts**:
   - Check for long-running operations
   - Implement pagination for large data sets
   - Use background processing for intensive tasks

3. **Database Connection Issues**:
   - Verify connection strings
   - Check network connectivity
   - Ensure IP allowlisting is configured correctly
