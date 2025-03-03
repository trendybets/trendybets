-- Add updated_at column to fixtures_completed table
ALTER TABLE public.fixtures_completed 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add created_at column if it doesn't exist (for consistency)
ALTER TABLE public.fixtures_completed 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_fixtures_completed_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the trigger to the fixtures_completed table
DROP TRIGGER IF EXISTS trigger_fixtures_completed_updated_at ON public.fixtures_completed;
CREATE TRIGGER trigger_fixtures_completed_updated_at
BEFORE UPDATE ON public.fixtures_completed
FOR EACH ROW EXECUTE FUNCTION update_fixtures_completed_updated_at(); 