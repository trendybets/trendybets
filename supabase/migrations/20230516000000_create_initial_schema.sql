-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Team table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  numerical_id INTEGER,
  base_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Player table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT,
  number INTEGER,
  age INTEGER,
  height INTEGER,
  weight INTEGER,
  experience INTEGER,
  logo TEXT,
  is_active BOOLEAN NOT NULL,
  source_ids JSONB,
  sport_id TEXT,
  league_id TEXT,
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create PlayerHistory table
CREATE TABLE player_histories (
  id SERIAL PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id),
  fixture_id TEXT NOT NULL,
  game_id TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  fouls INTEGER NOT NULL,
  blocks INTEGER NOT NULL,
  points INTEGER NOT NULL,
  steals INTEGER NOT NULL,
  assists INTEGER NOT NULL,
  minutes INTEGER NOT NULL,
  seconds INTEGER NOT NULL,
  turnovers INTEGER NOT NULL,
  plus_minus INTEGER NOT NULL,
  first_basket INTEGER NOT NULL,
  flagrant_fouls INTEGER NOT NULL,
  total_rebounds INTEGER NOT NULL,
  blocks_received INTEGER NOT NULL,
  technical_fouls INTEGER NOT NULL,
  field_goals_made INTEGER NOT NULL,
  free_throws_made INTEGER NOT NULL,
  first_team_basket INTEGER NOT NULL,
  defensive_rebounds INTEGER NOT NULL,
  offensive_rebounds INTEGER NOT NULL,
  points_off_turnovers INTEGER NOT NULL,
  field_goals_attempted INTEGER NOT NULL,
  free_throws_attempted INTEGER NOT NULL,
  first_basket_including_ft INTEGER NOT NULL,
  two_point_field_goals_made INTEGER NOT NULL,
  three_point_field_goals_made INTEGER NOT NULL,
  first_team_basket_including_ft INTEGER NOT NULL,
  two_point_field_goals_attempted INTEGER NOT NULL,
  three_point_field_goals_attempted INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fixture_id, player_id)
);

-- Create SyncLog table
CREATE TABLE sync_logs (
  id SERIAL PRIMARY KEY,
  last_synced TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create Sportsbook table
CREATE TABLE sportsbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo TEXT,
  is_onshore BOOLEAN NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Market table
CREATE TABLE markets (
  id TEXT NOT NULL,
  sportsbook_id UUID NOT NULL REFERENCES sportsbooks(id),
  name TEXT NOT NULL,
  numerical_id INTEGER,
  sport_id TEXT,
  league_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, sportsbook_id)
);

-- Create Fixture table
CREATE TABLE fixtures (
  id TEXT PRIMARY KEY,
  numerical_id INTEGER,
  game_id TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL,
  is_live BOOLEAN NOT NULL,
  home_team_display TEXT,
  away_team_display TEXT,
  venue_name TEXT,
  venue_location TEXT,
  broadcast TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Odds table
CREATE TABLE odds (
  id TEXT PRIMARY KEY,
  fixture_id TEXT NOT NULL REFERENCES fixtures(id),
  sportsbook TEXT NOT NULL,
  market TEXT NOT NULL,
  name TEXT NOT NULL,
  is_main BOOLEAN NOT NULL,
  selection TEXT NOT NULL,
  normalized_selection TEXT NOT NULL,
  market_id TEXT NOT NULL,
  selection_line TEXT NOT NULL,
  player_id TEXT,
  team_id TEXT,
  price INTEGER NOT NULL,
  points FLOAT,
  timestamp FLOAT NOT NULL,
  grouping_key TEXT NOT NULL,
  deep_link_ios TEXT,
  deep_link_android TEXT,
  deep_link_desktop TEXT,
  limits JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_player_histories_player_id ON player_histories(player_id);
CREATE INDEX idx_player_histories_fixture_id ON player_histories(fixture_id);
CREATE INDEX idx_markets_sportsbook_id ON markets(sportsbook_id);
CREATE INDEX idx_odds_fixture_id ON odds(fixture_id);

