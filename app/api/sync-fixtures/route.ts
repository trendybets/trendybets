import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { serverEnv } from "@/lib/env"

// NOTE: For this to work reliably in Vercel, add the following environment variables:
// NODE_OPTIONS="--dns-result-order=ipv4first"
// VERCEL_FORCE_NO_BUILD_CACHE=1 (only needed once to clear build cache)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface Competitor {
  id: string
  name: string
  numerical_id: number
  base_id: number
  abbreviation: string
  logo: string
}

interface Sport {
  id: string
  name: string
  numerical_id: number
}

interface League {
  id: string
  name: string
  numerical_id: number
}

interface APIFixture {
  id: string
  numerical_id: number
  game_id: string
  start_date: string
  home_competitors: Competitor[]
  away_competitors: Competitor[]
  home_team_display: string
  away_team_display: string
  status: string
  is_live: boolean
  sport: Sport
  league: League
  home_starter: string | null
  home_record: string | null
  home_seed: string | null
  home_rotation_number: number | null
  away_starter: string | null
  away_record: string | null
  away_seed: string | null
  away_rotation_number: number | null
  tournament: string | null
  tournament_stage: string | null
  has_odds: boolean
  venue_name: string | null
  venue_location: string | null
  venue_neutral: boolean
  broadcast: string | null
  season_type: string | null
  season_year: string | null
  season_week: string | null
  source_ids: Record<string, any>
}

interface APIResponse {
  data: APIFixture[]
}

// Helper function to retry failed operations
async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;
    console.log(`Operation failed, retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(operation, retries - 1, delay * 1.5);
  }
}

export async function POST(request: Request) {
  console.log("API route called")
  
  // Add authentication for cron jobs
  const apiToken = request.headers.get('api-token');
  
  // For production, you should use a secure comparison method and store this in an environment variable
  if (apiToken !== serverEnv.CRON_API_TOKEN) {
    console.error('Unauthorized access attempt to sync-fixtures');
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
      NODE_OPTIONS: process.env.NODE_OPTIONS || 'not set'
    })
    
    // Test direct connectivity to Supabase with retry
    console.log("Testing direct connectivity to Supabase...")
    try {
      await withRetry(async () => {
        const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_SERVICE_KEY}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          cache: 'no-store',
        });
        
        console.log("Direct connectivity test result:", {
          status: testResponse.status,
          statusText: testResponse.statusText,
          ok: testResponse.ok
        });
        
        if (!testResponse.ok) {
          const errorText = await testResponse.text();
          console.error("Direct connectivity test error:", errorText);
          throw new Error(`Direct connectivity test failed: ${testResponse.status} ${testResponse.statusText}`);
        }
        
        return testResponse;
      });
    } catch (connectError) {
      console.error("Direct connectivity test failed after retries:", connectError);
    }
    
    console.log("Creating Supabase client...")
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: (url, options) => {
          console.log(`Supabase fetch to: ${url.toString().split('?')[0]}`);
          return fetch(url, {
            ...options,
            cache: 'no-store',
            headers: {
              ...options?.headers,
              'Content-Type': 'application/json',
            },
          });
        },
      },
    })
    console.log("Supabase client created")

    // First, verify we can access the table
    console.log("Attempting to access fixtures table...")
    try {
      const { data: tableCheck, error: tableError } = await withRetry(async () => {
        return await supabase
          .from("fixtures")
          .select("id")
          .limit(1);
      });

      if (tableError) {
        console.error("Table check error:", tableError)
        throw new Error(`Failed to access fixtures table: ${tableError.message}`)
      }

      console.log("Table check successful", tableCheck)
    } catch (tableAccessError) {
      console.error("Error during table access:", tableAccessError)
      throw new Error(`Table access error: ${tableAccessError instanceof Error ? tableAccessError.message : String(tableAccessError)}`)
    }

    // Get IDs of unplayed fixtures
    const { data: unplayedFixtures, error: fetchError } = await withRetry(async () => {
      return await supabase
        .from("fixtures")
        .select("id")
        .eq('status', 'unplayed');
    });

    if (fetchError) {
      console.error("Error fetching unplayed fixtures:", fetchError)
      throw fetchError
    }

    if (unplayedFixtures && unplayedFixtures.length > 0) {
      const fixtureIds = unplayedFixtures.map(f => f.id)

      // First delete related odds
      const { error: oddsDeleteError } = await withRetry(async () => {
        return await supabase
          .from("odds")
          .delete()
          .in('fixture_id', fixtureIds);
      });

      if (oddsDeleteError) {
        console.error("Error deleting related odds:", oddsDeleteError)
        throw oddsDeleteError
      }

      // Then delete related player odds
      const { error: playerOddsDeleteError } = await withRetry(async () => {
        return await supabase
          .from("player_odds")
          .delete()
          .in('fixture_id', fixtureIds);
      });

      if (playerOddsDeleteError) {
        console.error("Error deleting related player odds:", playerOddsDeleteError)
        throw playerOddsDeleteError
      }

      // Finally delete the fixtures
      const { error: fixturesDeleteError } = await withRetry(async () => {
        return await supabase
          .from("fixtures")
          .delete()
          .in('id', fixtureIds);
      });

      if (fixturesDeleteError) {
        console.error("Error deleting fixtures:", fixturesDeleteError)
        throw fixturesDeleteError
      }
    }

    // Fetch new fixtures from API with retry
    const apiUrl = `https://api.opticodds.com/api/v3/fixtures/active?sport=basketball&league=nba&key=${serverEnv.OPTIC_ODDS_API_KEY}`
    console.log("Fetching from API URL:", apiUrl.replace(serverEnv.OPTIC_ODDS_API_KEY, 'API_KEY_HIDDEN'))
    console.log("Using API key:", serverEnv.OPTIC_ODDS_API_KEY ? 'API key is set' : 'API key is missing')
    
    const response = await withRetry(async () => {
      const res = await fetch(apiUrl, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API request failed: ${res.status} ${res.statusText}`, errorText);
        throw new Error(`API request failed: ${res.status} ${res.statusText} - ${errorText}`);
      }
      
      return res;
    });
    
    const json: APIResponse = await response.json();
    if (!json.data || !Array.isArray(json.data)) {
      throw new Error("Invalid API response format");
    }

    console.log(`Fetched ${json.data.length} fixtures`);
    
    // Map the fixtures to match our schema
    const fixturesToUpsert = json.data.map(fixture => ({
      id: fixture.id,
      game_id: fixture.game_id,
      numerical_id: fixture.numerical_id,
      start_date: fixture.start_date,
      home_team_id: fixture.home_competitors[0]?.id,
      away_team_id: fixture.away_competitors[0]?.id,
      home_team_display: fixture.home_team_display,
      away_team_display: fixture.away_team_display,
      home_record: fixture.home_record || '',
      away_record: fixture.away_record || '',
      venue_name: fixture.venue_name || '',
      venue_location: fixture.venue_location || '',
      broadcast: fixture.broadcast || '',
      status: 'unplayed',
      is_live: fixture.is_live || false,
      created_at: new Date().toISOString()
    }));

    console.log('Sample fixture to upsert:', fixturesToUpsert[0]);

    // Upsert new fixtures with retry
    const { data, error } = await withRetry(async () => {
      return await supabase
        .from("fixtures")
        .upsert(fixturesToUpsert, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();
    });

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    // Log sync completion with retry
    await withRetry(async () => {
      return await supabase
        .from("sync_log")
        .insert([{
          sync_type: 'fixtures',
          success_count: fixturesToUpsert.length,
          error_count: 0,
          completed_at: new Date().toISOString()
        }]);
    });

    return NextResponse.json(
      { 
        message: `${fixturesToUpsert.length} fixtures synced successfully`,
        example: data?.[0]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Sync error:", error)
    return NextResponse.json(
      { 
        error: "Sync failed", 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 