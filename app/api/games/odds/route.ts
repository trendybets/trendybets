import { NextResponse } from "next/server"
import { serverEnv } from "@/lib/env"
import { withCache } from "@/lib/redis"

// Add this line to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic'

// Redis cache TTL (5 minutes in seconds)
const CACHE_TTL = 5 * 60;

/**
 * Fetches odds for a specific fixture from the OpticOdds API
 * @param fixtureId The fixture ID
 * @returns Array of odds data
 */
async function fetchFixtureOdds(fixtureId: string) {
  const url = `https://api.opticodds.com/api/v3/fixtures/odds?` +
    `sportsbook=draftkings&` +
    `sportsbook=caesars&` +
    `sportsbook=bet365&` +
    `sportsbook=betmgm&` +
    `fixture_id=${fixtureId}&` +
    `market=moneyline&` +
    `market=point_spread&` +
    `market=total_points&` +
    `is_main=true&` +
    `key=${serverEnv.OPTIC_ODDS_API_KEY}`

  console.log(`Fetching odds for fixture ${fixtureId}`)
  
  const cacheKey = `games:fixture-odds:${fixtureId}`;
  
  return withCache(
    cacheKey,
    async () => {
      try {
        const response = await fetch(url, {
          cache: 'no-store' // Ensure we're not using cached data
        })
        
        if (!response.ok) {
          console.error(`Failed to fetch odds for fixture ${fixtureId}:`, {
            status: response.status,
            statusText: response.statusText
          })
          return []
        }
        
        const data = await response.json()
        
        // Log the raw odds data
        console.log(`Raw odds data for fixture ${fixtureId}:`, {
          count: data.data?.length || 0,
        })
        
        return data.data || []
      } catch (error) {
        console.error(`Error fetching odds for fixture ${fixtureId}:`, error)
        return []
      }
    },
    CACHE_TTL
  );
}

export async function GET(request: Request) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const fixtureId = url.searchParams.get('fixture_id');
    
    if (!fixtureId) {
      return NextResponse.json(
        { error: 'Missing fixture_id parameter' },
        { status: 400 }
      );
    }
    
    const oddsData = await fetchFixtureOdds(fixtureId);
    
    return NextResponse.json({ data: oddsData });
  } catch (error) {
    console.error('Error in /api/games/odds route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 