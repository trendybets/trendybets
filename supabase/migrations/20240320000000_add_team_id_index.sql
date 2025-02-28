-- Add index on team_id in player_odds table
CREATE INDEX IF NOT EXISTS idx_player_odds_team_id ON player_odds(team_id);

-- Add foreign key constraint to ensure data integrity
ALTER TABLE player_odds 
  ADD CONSTRAINT fk_player_odds_team_id 
  FOREIGN KEY (team_id) 
  REFERENCES teams(id) 
  ON DELETE SET NULL; 