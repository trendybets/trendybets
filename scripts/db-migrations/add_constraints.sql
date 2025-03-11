-- Add sports reference to leagues table
ALTER TABLE public.leagues 
ADD CONSTRAINT leagues_sport_id_fkey 
FOREIGN KEY (sport_id) REFERENCES sports (id) 
ON UPDATE CASCADE ON DELETE RESTRICT;

-- Add sport_id and league_id foreign key constraints to fixtures table
ALTER TABLE public.fixtures 
ADD CONSTRAINT fixtures_sport_id_fkey 
FOREIGN KEY (sport_id) REFERENCES sports (id) 
ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.fixtures 
ADD CONSTRAINT fixtures_league_id_fkey 
FOREIGN KEY (league_id) REFERENCES leagues (id) 
ON UPDATE CASCADE ON DELETE RESTRICT;

-- Add sport and league references to players table
ALTER TABLE public.players 
ADD CONSTRAINT players_sport_id_fkey 
FOREIGN KEY (sport_id) REFERENCES sports (id) 
ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.players 
ADD CONSTRAINT players_league_id_fkey 
FOREIGN KEY (league_id) REFERENCES leagues (id) 
ON UPDATE CASCADE ON DELETE RESTRICT;

-- Add sport and league references to market table
ALTER TABLE public.market 
ADD CONSTRAINT market_sport_id_fkey 
FOREIGN KEY (sport_id) REFERENCES sports (id) 
ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.market 
ADD CONSTRAINT market_league_id_fkey 
FOREIGN KEY (league_id) REFERENCES leagues (id) 
ON UPDATE CASCADE ON DELETE RESTRICT; 