# TrendyBets Implementation Guide

## Overview

This guide provides specific implementation instructions for optimizing the TrendyBets application to make it ready for user adoption. It focuses on the most critical changes needed to improve performance, reliability, and user experience.

## Priority 1: Authentication and User Management

### Fix User Registration Process

The current user registration process may encounter the "Database error saving new user" issue if the `profiles` table is not properly set up.

#### Implementation Steps:

1. **Verify Database Schema**:

```sql
-- Run this in Supabase SQL Editor to check if profiles table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'profiles'
);

-- If it doesn't exist, create it
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create trigger for new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

2. **Optimize the Sign-Up Component**:

```typescript
// File: app/components/auth/signup-form.tsx

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { toast } from 'sonner';

export function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClientComponentClient();
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Validate input
      if (!email || !password || !username) {
        throw new Error('Please fill in all fields');
      }
      
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      
      // Create user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });
      
      if (signUpError) throw signUpError;
      
      // Show success message
      toast.success('Account created successfully! Please check your email for verification.');
      onSuccess();
    } catch (err) {
      console.error('Sign up error:', err);
      setError(err.message || 'An error occurred during sign up');
      toast.error(err.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <Input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
        />
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 8 characters)"
          required
          minLength={8}
        />
      </div>
      
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
      
      <Button
        type="submit"
        disabled={loading}
        className="w-full"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
}
```

## Priority 2: Database Connection Optimization

### Optimize Supabase Connection Pooling

The current connection pooling implementation can be optimized for better performance and reliability.

#### Implementation Steps:

1. **Update Pool Configuration**:

```typescript
// File: lib/db/supabase-pool.ts

// Update the default pool configuration
const DEFAULT_POOL_CONFIG: PoolConfig = {
  min: 3,                // Increase minimum connections
  max: 20,               // Increase maximum connections
  idleTimeoutMs: 60000,  // Increase idle timeout to 60 seconds
  acquireTimeoutMs: 10000 // Increase acquire timeout to 10 seconds
};
```

2. **Add Better Error Handling and Retry Logic**:

```typescript
// File: lib/db/supabase-pool.ts

// Add this function to the SupabaseConnectionPool class
private async executeWithRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;
    
    console.log(`Database operation failed, retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return this.executeWithRetry(operation, retries - 1, delay * 1.5);
  }
}

// Update the withPooledClient method to use retry logic
public async withPooledClient<T>(
  clientFn: () => Promise<SupabaseClient<Database>>,
  operation: (client: SupabaseClient<Database>) => Promise<T>
): Promise<T> {
  const client = await clientFn();
  
  try {
    return await this.executeWithRetry(() => operation(client));
  } finally {
    this.releaseConnection(client);
  }
}
```

3. **Add Connection Health Check**:

```typescript
// File: lib/db/supabase-pool.ts

// Add this method to the SupabaseConnectionPool class
private async checkConnectionHealth(connection: PooledConnection): Promise<boolean> {
  try {
    // Simple query to check if connection is healthy
    const { data, error } = await connection.client.from('_health').select('count(*)').limit(1);
    return !error;
  } catch (error) {
    console.error('Connection health check failed:', error);
    return false;
  }
}

// Add this to the performMaintenance method
private performMaintenance(): void {
  const now = Date.now();
  
  // Check health of connections
  this.pool.forEach(async (connection, index) => {
    if (!connection.inUse && now - connection.lastUsed > 5 * 60 * 1000) { // 5 minutes
      const isHealthy = await this.checkConnectionHealth(connection);
      
      if (!isHealthy && this.pool.length > this.config.min) {
        console.log('Removing unhealthy connection from pool');
        this.pool.splice(index, 1);
      }
    }
  });
  
  // Rest of the existing maintenance code...
}
```

## Priority 3: API Integration and Data Fetching

### Create API Client for OpticOdds

Create a dedicated API client to centralize API calls and implement caching.

#### Implementation Steps:

1. **Create API Client**:

```typescript
// File: lib/services/optic-odds-client.ts

import { serverEnv } from '@/lib/env';
import { withCache } from '@/lib/redis';

// Default cache TTL (5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60;

export class OpticOddsClient {
  private baseUrl = 'https://api.opticodds.com/api/v3';
  private apiKey = serverEnv.OPTIC_ODDS_API_KEY;
  
  /**
   * Fetch data from the OpticOdds API
   */
  private async fetch<T>(
    endpoint: string,
    params: Record<string, string | string[]> = {},
    cacheTime = DEFAULT_CACHE_TTL
  ): Promise<T> {
    // Build URL with parameters
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add API key
    url.searchParams.append('key', this.apiKey);
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, v));
      } else {
        url.searchParams.append(key, value);
      }
    });
    
    const cacheKey = `optic-odds:${endpoint}:${JSON.stringify(params)}`;
    
    return withCache(
      cacheKey,
      async () => {
        console.log(`Fetching from OpticOdds API: ${url.toString().replace(this.apiKey, '[REDACTED]')}`);
        
        try {
          const response = await fetch(url.toString(), {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            cache: 'no-store'
          });
          
          if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          return data.data || [];
        } catch (error) {
          console.error(`Error fetching from OpticOdds API (${endpoint}):`, error);
          throw error;
        }
      },
      cacheTime
    );
  }
  
  /**
   * Get active fixtures
   */
  async getActiveFixtures(params: {
    sport?: string;
    league?: string;
    is_live?: boolean;
    status?: string;
  } = {}) {
    return this.fetch('/fixtures/active', {
      sport: params.sport || 'basketball',
      league: params.league || 'nba',
      is_live: params.is_live?.toString() || 'false',
      status: params.status || 'unplayed'
    });
  }
  
  /**
   * Get fixture odds
   */
  async getFixtureOdds(fixtureId: string, params: {
    sportsbooks?: string[];
    markets?: string[];
    is_main?: boolean;
  } = {}) {
    return this.fetch('/fixtures/odds', {
      fixture_id: fixtureId,
      sportsbook: params.sportsbooks || ['draftkings', 'caesars', 'bet365', 'betmgm'],
      market: params.markets || ['moneyline', 'point_spread', 'total_points'],
      is_main: (params.is_main !== false).toString()
    });
  }
  
  /**
   * Get teams
   */
  async getTeams(params: {
    sport?: string;
    league?: string;
  } = {}) {
    return this.fetch('/teams', {
      sport: params.sport || 'basketball',
      league: params.league || 'nba'
    }, 24 * 60 * 60); // Cache teams for 24 hours
  }
}

// Export singleton instance
export const opticOddsClient = new OpticOddsClient();
```

2. **Update API Routes to Use the Client**:

```typescript
// File: app/api/games/route.ts

import { NextResponse } from 'next/server';
import { opticOddsClient } from '@/lib/services/optic-odds-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get fixtures and teams in parallel
    const [fixtures, teams] = await Promise.all([
      opticOddsClient.getActiveFixtures(),
      opticOddsClient.getTeams()
    ]);
    
    // Process fixtures to include team data
    const processedGames = await processGamesData(fixtures, teams);
    
    return NextResponse.json(processedGames);
  } catch (error) {
    console.error('Error fetching games:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch games', details: error.message },
      { status: 500 }
    );
  }
}

// Rest of the file remains the same...
```

## Priority 4: Frontend Optimization

### Implement React Query for Data Fetching

Replace direct API calls with React Query for better caching and state management.

#### Implementation Steps:

1. **Add React Query Provider**:

```typescript
// File: app/providers.tsx

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

2. **Update Root Layout**:

```typescript
// File: app/layout.tsx

import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

3. **Update Game Component to Use React Query**:

```typescript
// File: app/components/trendy-games-view.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
// ... other imports

// API client functions
const fetchGames = async () => {
  const response = await fetch('/api/games');
  if (!response.ok) {
    throw new Error('Failed to fetch games');
  }
  return response.json();
};

export default function TrendyGamesView() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('game');
  const [researchModal, setResearchModal] = useState({ isOpen: false, gameId: '', homeTeam: { id: '', name: '', logo: '' }, awayTeam: { id: '', name: '', logo: '' }, startDate: '' });
  
  // Use React Query for data fetching
  const { data: games, isLoading, error } = useQuery({
    queryKey: ['games'],
    queryFn: fetchGames,
  });
  
  const handleResearchClick = (game) => {
    setResearchModal({
      isOpen: true,
      gameId: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      startDate: game.startDate
    });
  };
  
  // Show loading state
  if (isLoading) {
    return <LoadingState />;
  }
  
  // Show error state
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Error loading games: {error.message}</p>
        <Button onClick={() => window.location.reload()} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }
  
  // Rest of the component remains the same...
}
```

## Priority 5: Responsive Design Improvements

### Optimize Mobile Experience

Improve the mobile experience to ensure the application is usable on all devices.

#### Implementation Steps:

1. **Update Main Layout for Better Mobile Support**:

```typescript
// File: app/page.tsx

export default function Home() {
  // ... existing code
  
  return (
    <main className="min-h-screen bg-primary-black-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-primary-black-900">TrendyBets</h1>
          <div>
            {loading ? (
              <Button disabled variant="outline">Loading...</Button>
            ) : user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-primary-black-700 hidden sm:inline">Welcome, {user.user_metadata?.username || user.email}</span>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    await supabase.auth.signOut()
                  }}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowLoginPopup(true)}>
                Sign In / Register
              </Button>
            )}
          </div>
        </div>
      </header>
      
      <TrendyGamesView />
      
      <LoginPopup 
        isOpen={showLoginPopup} 
        onClose={() => setShowLoginPopup(false)} 
      />
    </main>
  )
}
```

2. **Optimize Game Table for Mobile**:

```typescript
// File: app/components/odds-table.tsx

// Inside the OddsTable component
return (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {/* Make columns responsive */}
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4 sm:w-1/6">
            Game
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
            Time
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Spread
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
            Moneyline
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
            Actions
          </th>
        </tr>
      </thead>
      {/* Table body remains the same */}
    </table>
  </div>
);
```

## Priority 6: Error Handling and Logging

### Implement Consistent Error Handling

Add consistent error handling and logging throughout the application.

#### Implementation Steps:

1. **Create Error Utility**:

```typescript
// File: lib/utils/error-utils.ts

/**
 * Format an error for logging and display
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unknown error occurred';
}

/**
 * Log an error with context
 */
export function logError(
  error: unknown,
  context: Record<string, any> = {}
): void {
  console.error('Application error:', {
    message: formatError(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle API route errors consistently
 */
export function handleApiError(
  error: unknown,
  defaultMessage = 'An error occurred'
): { error: string; details?: string; status: number } {
  logError(error);
  
  if (error instanceof Error) {
    return {
      error: defaultMessage,
      details: error.message,
      status: 500
    };
  }
  
  return {
    error: defaultMessage,
    status: 500
  };
}
```

2. **Update API Routes to Use Error Handling**:

```typescript
// File: app/api/games/route.ts

import { NextResponse } from 'next/server';
import { opticOddsClient } from '@/lib/services/optic-odds-client';
import { handleApiError } from '@/lib/utils/error-utils';

export async function GET() {
  try {
    // Get fixtures and teams in parallel
    const [fixtures, teams] = await Promise.all([
      opticOddsClient.getActiveFixtures(),
      opticOddsClient.getTeams()
    ]);
    
    // Process fixtures to include team data
    const processedGames = await processGamesData(fixtures, teams);
    
    return NextResponse.json(processedGames);
  } catch (error) {
    const { error: errorMessage, details, status } = handleApiError(
      error,
      'Failed to fetch games'
    );
    
    return NextResponse.json(
      { error: errorMessage, details },
      { status }
    );
  }
}
```

## Priority 7: Deployment Configuration

### Optimize Vercel Deployment

Configure Vercel for optimal performance and reliability.

#### Implementation Steps:

1. **Update Vercel Configuration**:

```json
// File: vercel.json

{
  "version": 2,
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["sfo1"],
  "env": {
    "NODE_OPTIONS": "--dns-result-order=ipv4first"
  },
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

2. **Create Health Check Endpoint**:

```typescript
// File: app/api/health/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

export async function GET() {
  try {
    // Check database connection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data, error } = await supabase.from('teams').select('count(*)').limit(1);
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    // Check Redis connection if used
    // let redisStatus = 'not_checked';
    // if (serverEnv.REDIS_URL) {
    //   const redis = new Redis(serverEnv.REDIS_URL);
    //   await redis.ping();
    //   redisStatus = 'connected';
    //   await redis.quit();
    // }
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        // redis: redisStatus
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
```

## Implementation Checklist

Use this checklist to track your progress on implementing the optimizations:

- [ ] **Authentication and User Management**
  - [ ] Verify database schema and create profiles table if needed
  - [ ] Optimize sign-up component
  - [ ] Test user registration flow

- [ ] **Database Connection Optimization**
  - [ ] Update pool configuration
  - [ ] Add better error handling and retry logic
  - [ ] Add connection health check

- [ ] **API Integration and Data Fetching**
  - [ ] Create API client for OpticOdds
  - [ ] Update API routes to use the client
  - [ ] Test API integration

- [ ] **Frontend Optimization**
  - [ ] Add React Query provider
  - [ ] Update root layout
  - [ ] Update game component to use React Query

- [ ] **Responsive Design Improvements**
  - [ ] Update main layout for better mobile support
  - [ ] Optimize game table for mobile
  - [ ] Test on various devices

- [ ] **Error Handling and Logging**
  - [ ] Create error utility
  - [ ] Update API routes to use error handling
  - [ ] Test error scenarios

- [ ] **Deployment Configuration**
  - [ ] Update Vercel configuration
  - [ ] Create health check endpoint
  - [ ] Test deployment

## Conclusion

This implementation guide provides specific steps to optimize the TrendyBets application for user adoption. By following these steps, you can improve performance, reliability, and user experience, making the application ready for users to sign up and start using it.

Start with the highest priority items and work your way down the list. Each optimization builds on the previous ones, so it's important to follow the order of implementation.

After implementing these optimizations, continue to monitor the application's performance and user feedback to identify areas for further improvement.
