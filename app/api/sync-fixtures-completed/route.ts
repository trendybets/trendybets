import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { serverEnv } from "@/lib/env"
import axios from 'axios'

// Ensure the URL has the https:// protocol
let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
if (SUPABASE_URL && !SUPABASE_URL.startsWith('http')) {
  SUPABASE_URL = `https://${SUPABASE_URL}`
}

// Use the correct environment variable for the service key
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Add this line to tell Next.js this is a dynamic route with increased timeout
export const dynamic = 'force-dynamic'
export const maxDuration = 300; // Increase maximum execution time to 300 seconds (5 minutes)

// Helper function to retry failed operations
async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000,
  timeout = 10000 // Add timeout parameter
): Promise<T> {
  try {
    // Create a promise that rejects after the timeout
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
    });
    
    // Race the operation against the timeout
    return await Promise.race([operation(), timeoutPromise]);
  } catch (error) {
    if (retries <= 0) throw error;
    console.log(`Operation failed, retrying in ${delay}ms... (${retries} retries left)`);
    console.error('Error details:', error);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(operation, retries - 1, delay * 1.5, timeout);
  }
}

async function fetchPage(page: number) {
  console.log(`Fetching page ${page} of all completed fixtures...`);
  
  // Use 2024 for the season year (2024-2025 NBA season)
  const seasonYear = '2024';
  console.log(`Using season year: ${seasonYear} for the 2024-2025 NBA season`);
  
  return await withRetry(async () => {
    const params = {
      sport: 'basketball',
      league: 'nba',
      page: page,
      season_year: seasonYear,
      season_type: 'regular season',
      status: 'completed',
      // Remove date filtering to get all completed games
      key: process.env.OPTIC_ODDS_API_KEY
    };
    
    console.log('API request params:', JSON.stringify({
      ...params,
      key: '[REDACTED]'
    }, null, 2));
    
    const res = await axios({
      method: 'GET',
      url: 'https://api.opticodds.com/api/v3/fixtures',
      params,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'key': process.env.OPTIC_ODDS_API_KEY || ''
      },
      timeout: 15000, // 15 second timeout
      // Force IPv4
      family: 4
    });
    
    if (res.status !== 200) {
      console.error(`API request failed: ${res.status} ${res.statusText}`);
      throw new Error(`API request failed: ${res.status} ${res.statusText}`);
    }
    
    // Log the response data structure
    console.log(`API response structure: ${res.data ? 'has data' : 'no data'}, ${res.data?.data ? `data array length: ${res.data.data.length}` : 'no data array'}`);
    
    return res.data;
  });
}

// Update the last sync time
async function updateLastSyncTime(recordsProcessed: number) {
  try {
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Store the current timestamp as the last sync time
    const now = new Date();
    
    const { error } = await supabase
      .from('sync_log')
      .insert({
        sync_type: 'fixtures_completed',
        started_at: now.toISOString(),
        completed_at: now.toISOString(),
        status: 'completed',
        last_sync_date: now.toISOString().split('T')[0],
        records_processed: recordsProcessed,
        metadata: { last_sync_time: now.toISOString() }
      });
      
    if (error) {
      console.error('Error updating last sync time:', error);
    } else {
      console.log(`Updated last sync time to ${now.toISOString()} with ${recordsProcessed} records processed`);
    }
  } catch (error) {
    console.error('Error in updateLastSyncTime:', error);
  }
}

// Add a function to get the last sync time
async function getLastSyncTime(): Promise<string | null> {
  try {
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    const { data, error } = await supabase
      .from('sync_log')
      .select('completed_at, last_sync_date')
      .eq('sync_type', 'fixtures_completed')
      .order('completed_at', { ascending: false })
      .limit(1);
      
    if (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
    
    if (data && data.length > 0) {
      return data[0].completed_at;
    }
    
    return null;
  } catch (error) {
    console.error('Error in getLastSyncTime:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // Verify API token using the same approach as the working fixtures sync
    const apiToken = request.headers.get('api-token');
    
    // For production, you should use a secure comparison method and store this in an environment variable
    if (apiToken !== serverEnv.CRON_API_TOKEN) {
      console.error('Unauthorized access attempt to sync-fixtures-completed');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Environment check:', {
      SUPABASE_URL_set: !!SUPABASE_URL,
      SUPABASE_SERVICE_KEY_set: !!SUPABASE_SERVICE_KEY,
      SUPABASE_URL_length: SUPABASE_URL?.length || 0,
      SUPABASE_SERVICE_KEY_length: SUPABASE_SERVICE_KEY?.length || 0,
      NODE_OPTIONS: process.env.NODE_OPTIONS,
      SUPABASE_URL_prefix: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 10)}...` : 'not set'
    });
    
    // Initialize Supabase client
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    console.log('Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase.from('fixtures_completed').select('count').limit(1);
    
    if (testError) {
      console.error('Supabase connection error:', testError);
      return new Response(JSON.stringify({ error: 'Supabase connection error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Supabase connection successful');
    
    // Get the last sync time
    const lastSyncTime = await getLastSyncTime();
    if (lastSyncTime) {
      console.log(`Last sync time: ${lastSyncTime}`);
    } else {
      console.log('No previous sync time found');
    }
    
    // Fetch all completed fixtures
    let allFixtures: any[] = [];
    let page = 1;
    let hasMorePages = true;
    const MAX_PAGES = 100; // Set a reasonable upper limit to prevent infinite loops
    
    while (hasMorePages && page <= MAX_PAGES) { // Increased from 5 pages to MAX_PAGES
      try {
        const response = await fetchPage(page);
        const fixtures = response?.data || [];
        
        console.log(`Received ${fixtures.length} fixtures on page ${page}`);
        
        if (fixtures.length === 0) {
          hasMorePages = false;
          console.log('No more fixtures found, stopping pagination');
        } else {
          allFixtures = [...allFixtures, ...fixtures];
          page++;
          
          // Add a small delay between API calls to avoid rate limiting
          if (hasMorePages) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        hasMorePages = false; // Stop on error
      }
    }
    
    if (page > MAX_PAGES) {
      console.log(`Reached maximum page limit of ${MAX_PAGES}, stopping pagination`);
    }
    
    console.log(`Fetched ${allFixtures.length} completed fixtures from ${page - 1} pages`);
    
    // Analyze dates and statuses for debugging
    const dateAnalysis = {
      future: 0,
      past: 0,
      completed: 0,
      withScores: 0
    };
    
    const now = new Date();
    
    allFixtures.forEach(fixture => {
      const startDate = new Date(fixture.start_date);
      if (startDate > now) {
        dateAnalysis.future++;
      } else {
        dateAnalysis.past++;
      }
      
      if (fixture.status === 'completed') {
        dateAnalysis.completed++;
      }
      
      if (fixture.home_score !== null && fixture.away_score !== null) {
        dateAnalysis.withScores++;
      }
    });
    
    console.log('Date and Status Analysis:', dateAnalysis);
    
    // Filter out fixtures without scores
    const validFixtures = allFixtures.filter(fixture => 
      fixture.status === 'completed' && 
      fixture.home_score !== null && 
      fixture.away_score !== null
    );
    
    console.log(`Found ${validFixtures.length} valid fixtures with scores`);
    
    if (validFixtures.length === 0) {
      console.log('No valid fixtures to insert');
      return new Response(JSON.stringify({ message: 'No valid fixtures to insert' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Transform fixtures for database
    const transformedFixtures = validFixtures.map(fixture => {
      // Ensure home_competitors and away_competitors are arrays
      const homeCompetitors = Array.isArray(fixture.home_competitors) 
        ? fixture.home_competitors 
        : [fixture.home_competitors].filter(Boolean);
        
      const awayCompetitors = Array.isArray(fixture.away_competitors)
        ? fixture.away_competitors
        : [fixture.away_competitors].filter(Boolean);
      
      // Extract scores from the result object if available
      const homeScoreTotal = fixture.home_score ?? 0;
      const awayScoreTotal = fixture.away_score ?? 0;
      
      // Extract quarter scores if available
      const homeScoreQ1 = fixture.result?.scores?.home?.periods?.period_1 ?? 0;
      const homeScoreQ2 = fixture.result?.scores?.home?.periods?.period_2 ?? 0;
      const homeScoreQ3 = fixture.result?.scores?.home?.periods?.period_3 ?? 0;
      const homeScoreQ4 = fixture.result?.scores?.home?.periods?.period_4 ?? 0;
      
      const awayScoreQ1 = fixture.result?.scores?.away?.periods?.period_1 ?? 0;
      const awayScoreQ2 = fixture.result?.scores?.away?.periods?.period_2 ?? 0;
      const awayScoreQ3 = fixture.result?.scores?.away?.periods?.period_3 ?? 0;
      const awayScoreQ4 = fixture.result?.scores?.away?.periods?.period_4 ?? 0;
      
      return {
        id: fixture.id,
        numerical_id: fixture.numerical_id,
        game_id: fixture.game_id,
        start_date: fixture.start_date,
        home_competitors: homeCompetitors,
        away_competitors: awayCompetitors,
        home_team_display: fixture.home_team || '',
        away_team_display: fixture.away_team || '',
        status: fixture.status,
        venue_name: fixture.venue_name || '',
        venue_location: fixture.venue_location || '',
        broadcast: fixture.broadcast || '',
        home_score_total: homeScoreTotal,
        home_score_q1: homeScoreQ1,
        home_score_q2: homeScoreQ2,
        home_score_q3: homeScoreQ3,
        home_score_q4: homeScoreQ4,
        away_score_total: awayScoreTotal,
        away_score_q1: awayScoreQ1,
        away_score_q2: awayScoreQ2,
        away_score_q3: awayScoreQ3,
        away_score_q4: awayScoreQ4,
        result: fixture.result || null,
        season_type: fixture.season_type || '',
        season_year: fixture.season_year || '',
        season_week: fixture.season_week || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    // Log the first fixture for debugging
    if (transformedFixtures.length > 0) {
      const firstFixture = transformedFixtures[0];
      console.log('Sample fixture structure:', {
        id: firstFixture.id,
        start_date: firstFixture.start_date,
        home_team: firstFixture.home_team_display,
        away_team: firstFixture.away_team_display,
        home_score: firstFixture.home_score_total,
        away_score: firstFixture.away_score_total,
        home_competitors_type: typeof firstFixture.home_competitors,
        home_competitors_length: Array.isArray(firstFixture.home_competitors) ? firstFixture.home_competitors.length : 'not an array',
        away_competitors_type: typeof firstFixture.away_competitors,
        away_competitors_length: Array.isArray(firstFixture.away_competitors) ? firstFixture.away_competitors.length : 'not an array',
        result_type: typeof firstFixture.result,
        sample_home_competitor: Array.isArray(firstFixture.home_competitors) && firstFixture.home_competitors.length > 0 
          ? JSON.stringify(firstFixture.home_competitors[0]) 
          : 'none'
      });
    }
    
    // Process in smaller batches to avoid payload size issues
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < transformedFixtures.length; i += batchSize) {
      batches.push(transformedFixtures.slice(i, i + batchSize));
    }
    
    console.log(`Processing ${batches.length} batches of up to ${batchSize} fixtures each`);
    
    let insertedCount = 0;
    let errorCount = 0;
    let lastBatchLogged = 0;
    const logInterval = Math.max(1, Math.floor(batches.length / 10)); // Log progress at 10% intervals
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // Only log every logInterval batches to reduce console spam
      const shouldLog = i === 0 || i === batches.length - 1 || 
                       (i - lastBatchLogged) >= logInterval || 
                       i % 50 === 0;
      
      if (shouldLog) {
        console.log(`Processing batch ${i + 1}/${batches.length} with ${batch.length} fixtures (${Math.round((i + 1) / batches.length * 100)}% complete)`);
        lastBatchLogged = i;
      }
      
      try {
        const { data, error } = await supabase
          .from('fixtures_completed')
          .upsert(batch, { onConflict: 'id' });
        
        if (error) {
          console.error(`Error upserting batch ${i + 1}:`, error);
          errorCount++;
        } else {
          if (shouldLog) {
            console.log(`Successfully upserted batch ${i + 1}`);
          }
          insertedCount += batch.length;
        }
        
        // Add a small delay between batches to avoid overwhelming the database
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Exception upserting batch ${i + 1}:`, error);
        errorCount++;
      }
    }
    
    // Update the last sync time with the number of records processed
    await updateLastSyncTime(insertedCount);
    
    return new Response(JSON.stringify({
      message: `Processed ${transformedFixtures.length} fixtures, inserted/updated ${insertedCount}, errors: ${errorCount}`,
      total: transformedFixtures.length,
      inserted: insertedCount,
      errors: errorCount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in sync-fixtures-completed:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 