DROP TABLE IF EXISTS public.fixtures_completed CASCADE;

CREATE TABLE public.fixtures_completed (
  id text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  last_synced_at timestamp with time zone NULL,
  CONSTRAINT fixtures_completed_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX idx_fixtures_completed_last_synced ON public.fixtures_completed USING btree (last_synced_at) TABLESPACE pg_default;

CREATE OR REPLACE FUNCTION update_fixtures_completed_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fixtures_completed_updated_at ON fixtures_completed;
CREATE TRIGGER trigger_fixtures_completed_updated_at
BEFORE UPDATE ON fixtures_completed
FOR EACH ROW
EXECUTE FUNCTION update_fixtures_completed_updated_at(); 