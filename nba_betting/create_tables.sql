-- Create the custom_projections table
CREATE TABLE IF NOT EXISTS custom_projections (
  id SERIAL PRIMARY KEY,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  stat_type TEXT NOT NULL,
  line NUMERIC NOT NULL,
  projected_value NUMERIC NOT NULL,
  confidence INTEGER NOT NULL,
  recommendation TEXT NOT NULL,
  edge NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Create a unique constraint for player+stat combination to prevent duplicates
  CONSTRAINT unique_player_stat UNIQUE (player_id, stat_type)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_custom_projections_player_id ON custom_projections(player_id);
CREATE INDEX IF NOT EXISTS idx_custom_projections_created_at ON custom_projections(created_at);

-- Add RLS policies if needed (adjust as per your security requirements)
ALTER TABLE custom_projections ENABLE ROW LEVEL SECURITY;

-- Add policy that allows reads for authenticated users
CREATE POLICY "Allow reads for authenticated users" 
  ON custom_projections FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Add policy that allows all operations for authenticated users (adjust as needed)
CREATE POLICY "Allow all operations for authenticated users" 
  ON custom_projections FOR ALL 
  USING (auth.role() = 'authenticated'); 