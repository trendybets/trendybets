-- Add last_synced_at column to tables that don't have it

-- Check if last_synced_at exists on teams table, add if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'teams' 
        AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE public.teams ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_teams_last_synced ON public.teams USING btree (last_synced_at);
    END IF;
END $$;

-- Add to players table if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'players' 
        AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE public.players ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_players_last_synced ON public.players USING btree (last_synced_at);
    END IF;
END $$;

-- Add to sportsbook table if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sportsbook' 
        AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE public.sportsbook ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_sportsbook_last_synced ON public.sportsbook USING btree (last_synced_at);
    END IF;
END $$;

-- Add to fixtures table if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'fixtures' 
        AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE public.fixtures ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_fixtures_last_synced ON public.fixtures USING btree (last_synced_at);
    END IF;
END $$;

-- Add to fixtures_completed table if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'fixtures_completed' 
        AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE public.fixtures_completed ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_fixtures_completed_last_synced ON public.fixtures_completed USING btree (last_synced_at);
    END IF;
END $$;

-- Add to fixture_results table if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'fixture_results' 
        AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE public.fixture_results ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_fixture_results_last_synced ON public.fixture_results USING btree (last_synced_at);
    END IF;
END $$;

-- Add to market table if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'market' 
        AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE public.market ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_market_last_synced ON public.market USING btree (last_synced_at);
    END IF;
END $$;

-- Note: player_odds, odds, and player_history already have last_synced_at columns 