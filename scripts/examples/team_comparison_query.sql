-- Sample query for team comparison in the game research view
-- Demonstrates using the new team_stats and game_scores tables

-- Get team stats for a specific matchup
WITH team_comparison AS (
  SELECT 
    f.id AS fixture_id,
    f.start_date,
    f.home_team_id,
    f.away_team_id,
    f.home_team_display,
    f.away_team_display,
    f.sport_id,
    f.league_id,
    
    -- Game scores
    gs.home_period_1,
    gs.home_period_2,
    gs.home_period_3,
    gs.home_period_4,
    gs.home_overtime,
    gs.away_period_1,
    gs.away_period_2,
    gs.away_period_3,
    gs.away_period_4,
    gs.away_overtime,
    
    -- Home team stats from team_stats table
    hts.points AS home_points,
    hts.field_goals_made AS home_fg_made,
    hts.field_goals_attempted AS home_fg_attempted,
    hts.field_goal_percentage AS home_fg_pct,
    hts.three_point_made AS home_3pt_made,
    hts.three_point_attempted AS home_3pt_attempted,
    hts.three_point_percentage AS home_3pt_pct,
    hts.free_throws_made AS home_ft_made,
    hts.free_throws_attempted AS home_ft_attempted,
    hts.free_throw_percentage AS home_ft_pct,
    hts.total_rebounds AS home_rebounds,
    hts.offensive_rebounds AS home_off_rebounds,
    hts.defensive_rebounds AS home_def_rebounds,
    hts.assists AS home_assists,
    hts.steals AS home_steals,
    hts.blocks AS home_blocks,
    hts.turnovers AS home_turnovers,
    
    -- Away team stats from team_stats table
    ats.points AS away_points,
    ats.field_goals_made AS away_fg_made,
    ats.field_goals_attempted AS away_fg_attempted,
    ats.field_goal_percentage AS away_fg_pct,
    ats.three_point_made AS away_3pt_made,
    ats.three_point_attempted AS away_3pt_attempted,
    ats.three_point_percentage AS away_3pt_pct,
    ats.free_throws_made AS away_ft_made,
    ats.free_throws_attempted AS away_ft_attempted, 
    ats.free_throw_percentage AS away_ft_pct,
    ats.total_rebounds AS away_rebounds,
    ats.offensive_rebounds AS away_off_rebounds,
    ats.defensive_rebounds AS away_def_rebounds,
    ats.assists AS away_assists,
    ats.steals AS away_steals,
    ats.blocks AS away_blocks,
    ats.turnovers AS away_turnovers
  FROM 
    fixtures f
    LEFT JOIN game_scores gs ON f.id = gs.fixture_id
    LEFT JOIN team_stats hts ON f.id = hts.fixture_id AND hts.is_home = true
    LEFT JOIN team_stats ats ON f.id = ats.fixture_id AND ats.is_home = false
  WHERE 
    f.id = :fixture_id  -- Parameter to be replaced with actual fixture ID
)

SELECT * FROM team_comparison;

-- Example: Get team aggregated stats for recent games
WITH recent_team_stats AS (
  SELECT
    ts.team_id,
    t.name AS team_name,
    AVG(ts.points) AS avg_points,
    AVG(ts.total_rebounds) AS avg_rebounds,
    AVG(ts.assists) AS avg_assists,
    AVG(ts.steals) AS avg_steals,
    AVG(ts.blocks) AS avg_blocks,
    AVG(ts.turnovers) AS avg_turnovers,
    COUNT(ts.id) AS games_count
  FROM 
    team_stats ts
    JOIN teams t ON ts.team_id = t.id
    JOIN fixtures f ON ts.fixture_id = f.id
  WHERE
    ts.team_id IN (:home_team_id, :away_team_id)  -- Parameters for the two teams
    AND f.start_date > NOW() - INTERVAL '30 days'
  GROUP BY
    ts.team_id, t.name
)

SELECT * FROM recent_team_stats;

-- Example: Compare head-to-head history
WITH head_to_head AS (
  SELECT
    f.id,
    f.start_date,
    f.home_team_display,
    f.away_team_display,
    gs.home_period_1 + gs.home_period_2 + gs.home_period_3 + gs.home_period_4 + COALESCE(gs.home_overtime, 0) AS home_score,
    gs.away_period_1 + gs.away_period_2 + gs.away_period_3 + gs.away_period_4 + COALESCE(gs.away_overtime, 0) AS away_score,
    CASE 
      WHEN (gs.home_period_1 + gs.home_period_2 + gs.home_period_3 + gs.home_period_4 + COALESCE(gs.home_overtime, 0)) > 
           (gs.away_period_1 + gs.away_period_2 + gs.away_period_3 + gs.away_period_4 + COALESCE(gs.away_overtime, 0))
      THEN f.home_team_id
      ELSE f.away_team_id
    END AS winner_id
  FROM
    fixtures f
    JOIN game_scores gs ON f.id = gs.fixture_id
  WHERE
    (f.home_team_id = :team1_id AND f.away_team_id = :team2_id)
    OR (f.home_team_id = :team2_id AND f.away_team_id = :team1_id)
  ORDER BY
    f.start_date DESC
)

SELECT * FROM head_to_head LIMIT 10; 