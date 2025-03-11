-- Create the sports table to store different sports data
CREATE TABLE IF NOT EXISTS public.sports (
  id text NOT NULL,
  name text NOT NULL,
  numerical_id integer,
  main_markets jsonb,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT sports_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create indexes on sports table
CREATE INDEX IF NOT EXISTS idx_sports_numerical_id ON public.sports USING btree (numerical_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_sports_last_synced ON public.sports USING btree (last_synced_at) TABLESPACE pg_default;

-- Create the leagues table to store leagues data
CREATE TABLE IF NOT EXISTS public.leagues (
  id text NOT NULL,
  name text NOT NULL,
  numerical_id integer,
  sport_id text NOT NULL,
  region text,
  region_code text,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT leagues_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create indexes on leagues table
CREATE INDEX IF NOT EXISTS idx_leagues_numerical_id ON public.leagues USING btree (numerical_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_leagues_sport_id ON public.leagues USING btree (sport_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_leagues_region_code ON public.leagues USING btree (region_code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_leagues_last_synced ON public.leagues USING btree (last_synced_at) TABLESPACE pg_default;

-- NOTE: The foreign key constraints below should be added AFTER the data has been populated
-- To add these constraints later, run the following SQL after populating the tables:

/*
-- Add sports reference to leagues table
ALTER TABLE public.leagues
ADD CONSTRAINT leagues_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES sports (id);

-- Add sport_id and league_id foreign key constraints to existing tables
ALTER TABLE public.fixtures
ADD CONSTRAINT fixtures_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES sports (id),
ADD CONSTRAINT fixtures_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues (id);

-- Add sport and league references to players table
ALTER TABLE public.players
ADD CONSTRAINT players_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES sports (id),
ADD CONSTRAINT players_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues (id);

-- Add sport and league references to market table
ALTER TABLE public.market
ADD CONSTRAINT market_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES sports (id),
ADD CONSTRAINT market_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues (id);
*/ 