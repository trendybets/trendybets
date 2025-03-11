// Example of how to fetch and use team stats data in the frontend
// This could be integrated into game-research-view.tsx

import { createClient } from '@supabase/supabase-js';

// Create the Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Fetch game comparison data using the new team_stats and game_scores tables
 * @param {string} fixtureId - The ID of the fixture to analyze
 * @returns {Promise<Object>} - Game comparison data
 */
export async function fetchGameComparison(fixtureId) {
  // Get the basic fixture data
  const { data: fixture, error: fixtureError } = await supabase
    .from('fixtures')
    .select(`
      id,
      start_date,
      home_team_id,
      away_team_id,
      home_team_display,
      away_team_display,
      sport_id,
      league_id
    `)
    .eq('id', fixtureId)
    .single();
    
  if (fixtureError) {
    console.error('Error fetching fixture:', fixtureError);
    return null;
  }
  
  // Get game scores if available
  const { data: gameScores, error: scoresError } = await supabase
    .from('game_scores')
    .select('*')
    .eq('fixture_id', fixtureId)
    .single();
  
  // Get team stats - home team
  const { data: homeTeamStats, error: homeStatsError } = await supabase
    .from('team_stats')
    .select('*')
    .eq('fixture_id', fixtureId)
    .eq('is_home', true)
    .single();
  
  // Get team stats - away team
  const { data: awayTeamStats, error: awayStatsError } = await supabase
    .from('team_stats')
    .select('*')
    .eq('fixture_id', fixtureId)
    .eq('is_home', false)
    .single();
  
  // Combine all data
  return {
    fixture,
    scores: gameScores || {},
    homeTeamStats: homeTeamStats || {},
    awayTeamStats: awayTeamStats || {}
  };
}

/**
 * Fetch recent team performance data
 * @param {string} teamId - The team ID to get stats for
 * @param {number} gamesLimit - Number of recent games to include
 * @returns {Promise<Array>} - Recent team stats
 */
export async function fetchRecentTeamStats(teamId, gamesLimit = 5) {
  const { data, error } = await supabase
    .from('team_stats')
    .select(`
      *,
      fixtures:fixture_id (
        id,
        start_date,
        home_team_display,
        away_team_display,
        home_team_id,
        away_team_id
      )
    `)
    .eq('team_id', teamId)
    .order('fixtures.start_date', { ascending: false })
    .limit(gamesLimit);
    
  if (error) {
    console.error('Error fetching recent team stats:', error);
    return [];
  }
  
  return data;
}

/**
 * Calculate team averages over multiple games
 * @param {Array} teamStatsArray - Array of team stats records
 * @returns {Object} - Calculated averages
 */
export function calculateTeamAverages(teamStatsArray) {
  if (!teamStatsArray || teamStatsArray.length === 0) {
    return {};
  }
  
  const totals = teamStatsArray.reduce((acc, stats) => {
    // Add up all the numeric values
    Object.keys(stats).forEach(key => {
      if (typeof stats[key] === 'number') {
        acc[key] = (acc[key] || 0) + stats[key];
      }
    });
    return acc;
  }, {});
  
  // Calculate averages
  const averages = {};
  Object.keys(totals).forEach(key => {
    averages[key] = totals[key] / teamStatsArray.length;
  });
  
  return {
    gamesCount: teamStatsArray.length,
    ...averages
  };
}

/**
 * Usage example - this would be in a React component
 */
async function loadGameResearchData(fixtureId) {
  try {
    // 1. Get the current game data
    const gameData = await fetchGameComparison(fixtureId);
    
    if (!gameData) {
      console.error('No game data found');
      return;
    }
    
    // 2. Get recent performance for both teams
    const homeTeamId = gameData.fixture.home_team_id;
    const awayTeamId = gameData.fixture.away_team_id;
    
    const homeTeamRecentStats = await fetchRecentTeamStats(homeTeamId);
    const awayTeamRecentStats = await fetchRecentTeamStats(awayTeamId);
    
    // 3. Calculate averages
    const homeTeamAverages = calculateTeamAverages(homeTeamRecentStats);
    const awayTeamAverages = calculateTeamAverages(awayTeamRecentStats);
    
    // 4. Combine all data for display
    const comparisonData = {
      fixture: gameData.fixture,
      scores: gameData.scores,
      currentGame: {
        home: gameData.homeTeamStats,
        away: gameData.awayTeamStats
      },
      recentPerformance: {
        home: {
          stats: homeTeamRecentStats,
          averages: homeTeamAverages
        },
        away: {
          stats: awayTeamRecentStats,
          averages: awayTeamAverages
        }
      }
    };
    
    // Now use comparisonData to render your UI
    console.log('Game comparison data ready:', comparisonData);
    return comparisonData;
    
  } catch (error) {
    console.error('Error loading game research data:', error);
    return null;
  }
}

// Example call with a fixture ID
// loadGameResearchData('nba:025A838B7CAE'); 