ALTER TABLE public.fixture_results ADD COLUMN IF NOT EXISTS season_type text;
ALTER TABLE public.fixture_results ADD COLUMN IF NOT EXISTS season_year text;
ALTER TABLE public.fixture_results ADD COLUMN IF NOT EXISTS venue_name text; 