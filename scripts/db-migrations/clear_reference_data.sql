-- Script to clear existing data from leagues, teams, and players tables
-- while maintaining foreign key relationships (delete in the correct order)

-- First, delete from players (child table)
DELETE FROM public.players;

-- Then delete from teams (middle table)
DELETE FROM public.teams;

-- Finally delete from leagues (parent table)
DELETE FROM public.leagues;

-- We're keeping the sports table intact as it's a small, foundational table 