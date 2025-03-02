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
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Add this line to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic'

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
  // Add end_date parameter to only get games up to today
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`Fetching page ${page} of completed fixtures...`);
  
  return await withRetry(async () => {
    const res = await axios({
      method: 'GET',
      url: 'https://api.opticodds.com/api/v3/fixtures',
      params: {
        sport: 'basketball',
        league: 'nba',
        page: page,
        season_year: '2024',
        season_type: 'regular season',
        status: 'completed',
        end_date: today,
        key: process.env.OPTIC_ODDS_API_KEY
      },
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
    
    return res.data;
  });
}

export async function POST(request: Request) {
  // Add authentication for cron jobs
  const apiToken = request.headers.get('api-token');
  
  // For production, you should use a secure comparison method and store this in an environment variable
  if (apiToken !== serverEnv.CRON_API_TOKEN) {
    console.error('Unauthorized access attempt to sync-fixtures-completed');
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Log environment variables (without revealing full values)
    console.log("Environment check:", {
      SUPABASE_URL_set: !!SUPABASE_URL,
      SUPABASE_SERVICE_KEY_set: !!SUPABASE_SERVICE_KEY,
      SUPABASE_URL_length: SUPABASE_URL?.length,
      SUPABASE_SERVICE_KEY_length: SUPABASE_SERVICE_KEY?.length,
      NODE_OPTIONS: process.env.NODE_OPTIONS || 'not set',
      SUPABASE_URL_prefix: SUPABASE_URL?.substring(0, 10) + '...'
    })
    
    // Create Supabase client with simplified options
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    // Log a test connection
    console.log("Testing Supabase connection...");
    try {
      const { data, error } = await supabase.from("sync_log").select("id").limit(1);
      if (error) {
        console.error("Supabase connection test failed:", error);
      } else {
        console.log("Supabase connection successful");
      }
    } catch (connError) {
      console.error("Exception during Supabase connection test:", connError);
    }

    let allFixtures: any[] = []
    let page = 1
    let hasMorePages = true
    let successCount = 0
    let errors: any[] = []

    // Fetch all pages
    while (hasMorePages) {
      const data = await fetchPage(page)
      
      if (!data.data || data.data.length === 0) {
        hasMorePages = false
        break
      }

      allFixtures = [...allFixtures, ...data.data]
      page++
    }

    console.log(`Fetched ${allFixtures.length} completed fixtures`)
    
    // Debug: Log sample fixture
    if (allFixtures.length > 0) {
      console.log('Sample fixture structure:', JSON.stringify(allFixtures[0], null, 2))
    }

    // Debug: Check dates and statuses
    const dateAnalysis = allFixtures.reduce((acc, fixture) => {
      const date = new Date(fixture.start_date)
      const status = fixture.status
      const hasScores = fixture.result?.scores?.home?.total != null
      
      console.log(`Fixture ${fixture.id}:`, {
        date: fixture.start_date,
        status,
        hasScores,
        resultStructure: fixture.result ? Object.keys(fixture.result) : 'no result',
        scoresStructure: fixture.result?.scores ? Object.keys(fixture.result.scores) : 'no scores'
      })

      return {
        ...acc,
        future: acc.future + (date > new Date() ? 1 : 0),
        past: acc.past + (date <= new Date() ? 1 : 0),
        completed: acc.completed + (status === 'completed' ? 1 : 0),
        withScores: acc.withScores + (hasScores ? 1 : 0)
      }
    }, { future: 0, past: 0, completed: 0, withScores: 0 })

    console.log('Date and Status Analysis:', dateAnalysis)

    // Validate and transform fixtures before upserting
    const validFixtures = allFixtures
      .filter(fixture => {
        const gameDate = new Date(fixture.start_date)
        const isInPast = gameDate <= new Date()
        const hasValidResult = fixture.result?.scores?.home?.total != null && 
                             fixture.result?.scores?.away?.total != null;

        if (!hasValidResult) {
          console.warn(`Fixture ${fixture.id} details:`, {
            date: fixture.start_date,
            status: fixture.status,
            resultExists: !!fixture.result,
            scoresExist: !!fixture.result?.scores,
            homeScores: fixture.result?.scores?.home,
            awayScores: fixture.result?.scores?.away
          })
          errors.push({ 
            id: fixture.id, 
            error: 'Missing score totals',
            details: {
              hasResult: !!fixture.result,
              hasScores: !!fixture.result?.scores,
              homeScores: fixture.result?.scores?.home,
              awayScores: fixture.result?.scores?.away
            }
          })
          return false
        }
        return true
      })
      .map((fixture) => {
        // Ensure home_competitors and away_competitors are properly formatted as arrays of objects
        let home_competitors;
        try {
          if (Array.isArray(fixture.home_competitors)) {
            home_competitors = fixture.home_competitors;
          } else if (typeof fixture.home_competitors === 'string') {
            try {
              home_competitors = JSON.parse(fixture.home_competitors);
              if (!Array.isArray(home_competitors)) {
                home_competitors = [home_competitors];
              }
            } catch (e) {
              console.warn(`Failed to parse home_competitors string for fixture ${fixture.id}:`, e);
              home_competitors = [];
            }
          } else if (fixture.home_competitors) {
            home_competitors = [fixture.home_competitors];
          } else {
            home_competitors = [];
          }
        } catch (e) {
          console.error(`Error processing home_competitors for fixture ${fixture.id}:`, e);
          home_competitors = [];
        }
        
        let away_competitors;
        try {
          if (Array.isArray(fixture.away_competitors)) {
            away_competitors = fixture.away_competitors;
          } else if (typeof fixture.away_competitors === 'string') {
            try {
              away_competitors = JSON.parse(fixture.away_competitors);
              if (!Array.isArray(away_competitors)) {
                away_competitors = [away_competitors];
              }
            } catch (e) {
              console.warn(`Failed to parse away_competitors string for fixture ${fixture.id}:`, e);
              away_competitors = [];
            }
          } else if (fixture.away_competitors) {
            away_competitors = [fixture.away_competitors];
          } else {
            away_competitors = [];
          }
        } catch (e) {
          console.error(`Error processing away_competitors for fixture ${fixture.id}:`, e);
          away_competitors = [];
        }
        
        // Ensure result is a proper JSON object
        let result;
        try {
          if (typeof fixture.result === 'string') {
            try {
              result = JSON.parse(fixture.result);
            } catch (e) {
              console.warn(`Failed to parse result string for fixture ${fixture.id}:`, e);
              result = null;
            }
          } else if (fixture.result && typeof fixture.result === 'object') {
            result = fixture.result;
          } else {
            result = null;
          }
        } catch (e) {
          console.error(`Error processing result for fixture ${fixture.id}:`, e);
          result = null;
        }
        
        // Skip fixtures without scores
        if (!result || !result.scores) {
          console.log(`Skipping fixture ${fixture.id} due to missing scores`);
          return null;
        }
        
        return {
          id: fixture.id,
          numerical_id: fixture.numerical_id,
          game_id: fixture.game_id,
          start_date: fixture.start_date,
          home_competitors: home_competitors,
          away_competitors: away_competitors,
          home_team_display: fixture.home_team_display,
          away_team_display: fixture.away_team_display,
          status: fixture.status,
          venue_name: fixture.venue_name || '',
          venue_location: fixture.venue_location || '',
          broadcast: fixture.broadcast || '',
          // Use optional chaining and nullish coalescing for all score fields
          home_score_total: result?.scores?.home?.total ?? 0,
          home_score_q1: result?.scores?.home?.periods?.period_1 ?? 0,
          home_score_q2: result?.scores?.home?.periods?.period_2 ?? 0,
          home_score_q3: result?.scores?.home?.periods?.period_3 ?? 0,
          home_score_q4: result?.scores?.home?.periods?.period_4 ?? 0,
          away_score_total: result?.scores?.away?.total ?? 0,
          away_score_q1: result?.scores?.away?.periods?.period_1 ?? 0,
          away_score_q2: result?.scores?.away?.periods?.period_2 ?? 0,
          away_score_q3: result?.scores?.away?.periods?.period_3 ?? 0,
          away_score_q4: result?.scores?.away?.periods?.period_4 ?? 0,
          // Store the result object directly
          result: result,
          season_type: fixture.season_type || '',
          season_year: fixture.season_year || '',
          season_week: fixture.season_week || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      })
      .filter(fixture => fixture !== null) // Filter out null fixtures

    if (validFixtures.length > 0) {
      // Process fixtures in batches to avoid payload size issues
      const batchSize = 10; // Reduce batch size to 10
      const batches = [];
      
      for (let i = 0; i < validFixtures.length; i += batchSize) {
        batches.push(validFixtures.slice(i, i + batchSize));
      }
      
      console.log(`Processing ${batches.length} batches of fixtures (batch size: ${batchSize})`);
      
      // Log the structure of the first fixture for debugging
      if (validFixtures.length > 0) {
        const firstFixture = validFixtures[0];
        console.log('First fixture structure:', JSON.stringify({
          id: firstFixture.id,
          home_competitors: firstFixture.home_competitors,
          away_competitors: firstFixture.away_competitors,
          result: firstFixture.result ? 
            {
              scores: firstFixture.result.scores
            } : null
        }, null, 2));
      }
      
      let successCount = 0;
      const errors = [];
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1} of ${batches.length} (${batch.length} fixtures)`);
        
        try {
          // Validate each fixture in the batch
          const validBatch = batch.filter(fixture => {
            if (!fixture.id) {
              console.warn('Skipping fixture with missing ID');
              return false;
            }
            
            if (!Array.isArray(fixture.home_competitors) || !Array.isArray(fixture.away_competitors)) {
              console.warn(`Skipping fixture ${fixture.id} with invalid competitors format`);
              return false;
            }
            
            return true;
          });
          
          if (validBatch.length === 0) {
            console.warn(`Batch ${i + 1} has no valid fixtures, skipping`);
            continue;
          }
          
          console.log(`Batch ${i + 1} has ${validBatch.length} valid fixtures`);
          
          const { error, data } = await withRetry(async () => {
            console.log(`Executing upsert for batch ${i + 1}...`);
            
            // Log the exact URL being used
            console.log(`Supabase URL: ${SUPABASE_URL}/rest/v1/fixtures_completed`);
            
            // Log the first fixture in the batch
            if (validBatch.length > 0) {
              console.log(`First fixture in batch ${i + 1}:`, JSON.stringify({
                id: validBatch[0].id,
                home_competitors: validBatch[0].home_competitors,
                away_competitors: validBatch[0].away_competitors
              }, null, 2));
            }
            
            const result = await supabase
              .from("fixtures_completed")
              .upsert(validBatch, { 
                onConflict: 'id'
              });
            
            if (result.error) {
              console.error(`Upsert error for batch ${i + 1}:`, {
                message: result.error.message,
                details: result.error.details,
                hint: result.error.hint,
                code: result.error.code
              });
            } else {
              console.log(`Upsert successful for batch ${i + 1}`);
            }
            
            return result;
          }, 3, 1000, 30000); // Increase timeout to 30 seconds
          
          if (error) {
            console.error(`Error upserting batch ${i + 1}:`, error);
            errors.push({
              batch: i + 1,
              error: error instanceof Error ? error.message : String(error),
              details: error.details,
              code: error.code
            });
          } else {
            successCount += validBatch.length;
            console.log(`Successfully upserted batch ${i + 1}`);
          }
        } catch (batchError) {
          console.error(`Exception processing batch ${i + 1}:`, batchError);
          errors.push({
            batch: i + 1,
            error: batchError instanceof Error ? batchError.message : String(batchError)
          });
        }
      }
    }

    // Update sync_log
    await withRetry(async () => {
      return await supabase
        .from("sync_log")
        .insert([{ 
          sync_type: "fixtures_completed",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status: "completed",
          records_processed: successCount,
          errors: errors.length > 0 ? errors : null
        }]);
    });

    return NextResponse.json({ 
      message: `${successCount} fixtures synced successfully`,
      skipped: errors.length,
      errors: errors.length > 0 ? errors : null,
      count: successCount,
      pages: page - 1
    })
  } catch (error) {
    console.error('Error syncing fixtures:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
} 