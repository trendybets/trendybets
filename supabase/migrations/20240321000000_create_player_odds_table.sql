-- Create player_odds table
CREATE TABLE player_odds (
  id TEXT PRIMARY KEY,
  fixture_id TEXT NOT NULL,
  sportsbook TEXT NOT NULL,
  market TEXT NOT NULL,
  name TEXT NOT NULL,
  is_main BOOLEAN DEFAULT false,
  selection TEXT NOT NULL,
  normalized_selection TEXT,
  market_id TEXT NOT NULL,
  selection_line TEXT,
  player_id TEXT,
  team_id TEXT REFERENCES teams(id),
  price INTEGER,
  points DOUBLE PRECISION,
  timestamp DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Add foreign key constraint
  CONSTRAINT fk_fixture
    FOREIGN KEY (fixture_id)
    REFERENCES fixtures(id)
    ON DELETE CASCADE,

  -- Add indexes for common queries
  CONSTRAINT player_odds_unique_selection 
    UNIQUE (fixture_id, sportsbook, market_id, selection, selection_line)
);

-- Add indexes for performance
CREATE INDEX idx_player_odds_fixture_id ON player_odds(fixture_id);
CREATE INDEX idx_player_odds_player_id ON player_odds(player_id);
CREATE INDEX idx_player_odds_market ON player_odds(market);
CREATE INDEX idx_player_odds_sportsbook ON player_odds(sportsbook);

-- Enable Row Level Security
ALTER TABLE player_odds ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access"
  ON player_odds
  FOR SELECT
  TO public
  USING (true);

-- Create policy to allow service role to insert/update
CREATE POLICY "Allow service role to manage odds"
  ON player_odds
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true); 