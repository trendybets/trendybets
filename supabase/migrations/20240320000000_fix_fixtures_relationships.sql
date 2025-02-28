-- Add foreign key constraints for team relationships in fixtures table
ALTER TABLE fixtures
ADD CONSTRAINT fixtures_home_team_id_fkey
FOREIGN KEY (home_team_id) REFERENCES teams(id);

ALTER TABLE fixtures
ADD CONSTRAINT fixtures_away_team_id_fkey
FOREIGN KEY (away_team_id) REFERENCES teams(id);

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_fixtures_home_team_id
ON fixtures(home_team_id);

CREATE INDEX IF NOT EXISTS idx_fixtures_away_team_id
ON fixtures(away_team_id); 