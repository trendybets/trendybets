-- Add league_id and sport_id columns to teams table
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS league_id TEXT,
ADD COLUMN IF NOT EXISTS sport_id TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_league_id ON teams(league_id);
CREATE INDEX IF NOT EXISTS idx_teams_sport_id ON teams(sport_id);

-- Update the teams table to match the reference schema if needed
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS mascot TEXT,
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS abbreviation TEXT,
ADD COLUMN IF NOT EXISTS division TEXT,
ADD COLUMN IF NOT EXISTS conference TEXT,
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS source_ids JSONB; 