-- Create custom_projections table for user-uploaded projections
CREATE TABLE IF NOT EXISTS public.custom_projections (
  id SERIAL PRIMARY KEY,
  player_id TEXT, -- Optional reference to player ID
  player_name TEXT NOT NULL,
  stat_type TEXT NOT NULL,
  line NUMERIC(10, 2) NOT NULL,
  projected_value NUMERIC(10, 2) NOT NULL,
  confidence INTEGER,
  recommendation TEXT, -- 'OVER' or 'UNDER'
  edge NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  -- Unique constraint to prevent duplicates
  CONSTRAINT unique_player_stat UNIQUE (player_name, stat_type)
);

-- Add indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_custom_projections_player_name ON public.custom_projections (player_name);
CREATE INDEX IF NOT EXISTS idx_custom_projections_stat_type ON public.custom_projections (stat_type);
CREATE INDEX IF NOT EXISTS idx_custom_projections_created_at ON public.custom_projections (created_at);

-- Add permissions
ALTER TABLE public.custom_projections ENABLE ROW LEVEL SECURITY; 