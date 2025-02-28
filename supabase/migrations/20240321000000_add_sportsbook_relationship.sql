-- First add a UNIQUE constraint to the name column in sportsbook table
ALTER TABLE sportsbook
ADD CONSTRAINT sportsbook_name_unique UNIQUE (name);

-- Then ensure the sportsbook column in player_odds matches the type
ALTER TABLE player_odds
ALTER COLUMN sportsbook TYPE text;

-- Now we can add the foreign key constraint
ALTER TABLE player_odds
ADD CONSTRAINT fk_player_odds_sportsbook
FOREIGN KEY (sportsbook)
REFERENCES sportsbook(name)
ON DELETE SET NULL;

-- Add index for better join performance (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = 'idx_player_odds_sportsbook'
    ) THEN
        CREATE INDEX idx_player_odds_sportsbook
        ON player_odds(sportsbook);
    END IF;
END $$; 