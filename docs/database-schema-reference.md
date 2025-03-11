# TrendyBets Database Schema Reference

This document provides a comprehensive reference for the TrendyBets database schema used in our application. The schema is designed to support data fetching and presentation on the frontend (player odds, game odds, player stats, team stats, etc.) and is scalable across multiple sports through the sports and leagues tables.

## Tables

### fixture_results
```sql
create table public.fixture_results (
  id text not null,
  fixture_id text null,
  game_id text null,
  start_date timestamp with time zone null,
  home_team_id text null,
  away_team_id text null,
  home_team_display text null,
  away_team_display text null,
  home_total integer null,
  home_period_1 integer null,
  home_period_2 integer null,
  home_period_3 integer null,
  home_period_4 integer null,
  away_total integer null,
  away_period_1 integer null,
  away_period_2 integer null,
  away_period_3 integer null,
  away_period_4 integer null,
  home_dunks integer null,
  home_fouls integer null,
  home_blocks integer null,
  home_points integer null,
  home_steals integer null,
  home_assists integer null,
  home_turnovers integer null,
  home_team_rebounds integer null,
  home_total_rebounds integer null,
  home_points_in_paint integer null,
  home_field_goals_made integer null,
  home_free_throws_made integer null,
  home_fast_break_points integer null,
  home_defensive_rebounds integer null,
  home_offensive_rebounds integer null,
  home_points_off_turnovers integer null,
  home_second_chance_points integer null,
  home_field_goals_attempted integer null,
  home_free_throws_attempted integer null,
  home_three_point_made integer null,
  home_three_point_attempted integer null,
  away_dunks integer null,
  away_fouls integer null,
  away_blocks integer null,
  away_points integer null,
  away_steals integer null,
  away_assists integer null,
  away_turnovers integer null,
  away_team_rebounds integer null,
  away_total_rebounds integer null,
  away_points_in_paint integer null,
  away_field_goals_made integer null,
  away_free_throws_made integer null,
  away_fast_break_points integer null,
  away_defensive_rebounds integer null,
  away_offensive_rebounds integer null,
  away_points_off_turnovers integer null,
  away_second_chance_points integer null,
  away_field_goals_attempted integer null,
  away_free_throws_attempted integer null,
  away_three_point_made integer null,
  away_three_point_attempted integer null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint fixture_results_pkey primary key (id),
  constraint fixture_results_fixture_id_fkey foreign KEY (fixture_id) references fixtures_completed (id)
) TABLESPACE pg_default;

create index IF not exists idx_fixture_results_teams on public.fixture_results using btree (home_team_id, away_team_id) TABLESPACE pg_default;

create index IF not exists idx_fixture_results_date on public.fixture_results using btree (start_date) TABLESPACE pg_default;

create index IF not exists idx_fixture_results_fixture_id on public.fixture_results using btree (fixture_id) TABLESPACE pg_default;
```

### fixtures
```sql
create table public.fixtures (
  id text not null,
  numerical_id integer null,
  game_id text not null,
  start_date timestamp with time zone not null,
  status text not null,
  is_live boolean not null,
  home_team_display text null,
  away_team_display text null,
  venue_name text null,
  venue_location text null,
  broadcast text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  home_team_id text not null,
  away_team_id text not null,
  home_team_abbreviation text null,
  away_team_abbreviation text null,
  home_record text null,
  away_record text null,
  start_time timestamp with time zone null,
  sport_id text null,
  league_id text null,
  home_score integer null,
  away_score integer null,
  venue text null,
  source_ids jsonb null,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  last_synced_at timestamp with time zone null,
  constraint fixtures_pkey primary key (id),
  constraint fixtures_away_team_id_fkey foreign KEY (away_team_id) references teams (id),
  constraint fixtures_home_team_id_fkey foreign KEY (home_team_id) references teams (id),
  constraint valid_teams check ((home_team_id <> away_team_id))
) TABLESPACE pg_default;

create index IF not exists idx_fixtures_home_team_id on public.fixtures using btree (home_team_id) TABLESPACE pg_default;

create index IF not exists idx_fixtures_away_team_id on public.fixtures using btree (away_team_id) TABLESPACE pg_default;

create index IF not exists idx_fixtures_last_synced on public.fixtures using btree (last_synced_at) TABLESPACE pg_default;

create index IF not exists idx_fixtures_home_team on public.fixtures using btree (home_team_id) TABLESPACE pg_default;

create index IF not exists idx_fixtures_away_team on public.fixtures using btree (away_team_id) TABLESPACE pg_default;

create index IF not exists idx_fixtures_status on public.fixtures using btree (status) TABLESPACE pg_default;

create index IF not exists idx_fixtures_start_time on public.fixtures using btree (start_time) TABLESPACE pg_default;
```

### fixtures_completed
```sql
create table public.fixtures_completed (
  id text not null,
  numerical_id bigint null,
  game_id text null,
  start_date timestamp with time zone null,
  home_competitors jsonb[] null,
  away_competitors jsonb[] null,
  home_team_display text null,
  away_team_display text null,
  status text null,
  venue_name text null,
  venue_location text null,
  broadcast text null,
  home_score_total integer null,
  home_score_q1 integer null,
  home_score_q2 integer null,
  home_score_q3 integer null,
  home_score_q4 integer null,
  away_score_total integer null,
  away_score_q1 integer null,
  away_score_q2 integer null,
  away_score_q3 integer null,
  away_score_q4 integer null,
  result jsonb null,
  season_type text null,
  season_year text null,
  season_week text null,
  player_history_id integer null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint fixtures_completed_pkey primary key (id),
  constraint fixtures_completed_player_history_id_fkey foreign KEY (player_history_id) references player_history (id)
) TABLESPACE pg_default;

create trigger trigger_fixtures_completed_updated_at BEFORE
update on fixtures_completed for EACH row
execute FUNCTION update_fixtures_completed_updated_at ();
```

### market
```sql
create table public.market (
  id text not null,
  sportsbook_id text not null,
  name text not null,
  numerical_id integer null,
  sport_id text null,
  league_id text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint market_pkey primary key (id, sportsbook_id),
  constraint market_sportsbook_id_fkey foreign KEY (sportsbook_id) references sportsbook (id)
) TABLESPACE pg_default;
```

### odds
```sql
create table public.odds (
  id text not null,
  fixture_id text not null,
  sportsbook text not null,
  market text not null,
  name text not null,
  is_main boolean not null,
  selection text not null,
  normalized_selection text not null,
  market_id text not null,
  selection_line text not null,
  player_id text null,
  team_id text null,
  price integer not null,
  points double precision null,
  timestamp double precision not null,
  start_date timestamp with time zone null,
  last_synced_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint odds_pkey primary key (id),
  constraint odds_fixture_id_fkey foreign KEY (fixture_id) references fixtures (id)
) TABLESPACE pg_default;

create index IF not exists idx_odds_created_at on public.odds using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_odds_fixture_id_sportsbook_market on public.odds using btree (fixture_id, sportsbook, market_id) TABLESPACE pg_default;

create index IF not exists idx_odds_last_synced on public.odds using btree (last_synced_at) TABLESPACE pg_default;
```

### player_history
```sql
create table public.player_history (
  id serial not null,
  player_id text not null,
  fixture_id text not null,
  game_id text null,
  start_date timestamp with time zone not null,
  fouls integer not null,
  blocks integer not null,
  points integer not null,
  steals integer not null,
  assists integer not null,
  minutes integer not null,
  seconds integer not null,
  turnovers integer not null,
  plus_minus integer not null,
  first_basket integer not null,
  flagrant_fouls integer not null,
  total_rebounds integer not null,
  blocks_received integer not null,
  technical_fouls integer not null,
  field_goals_made integer not null,
  free_throws_made integer not null,
  first_team_basket integer not null,
  defensive_rebounds integer not null,
  offensive_rebounds integer not null,
  points_off_turnovers integer not null,
  field_goals_attempted integer not null,
  free_throws_attempted integer not null,
  first_basket_including_ft integer not null,
  two_point_field_goals_made integer not null,
  three_point_field_goals_made integer not null,
  first_team_basket_including_ft integer not null,
  two_point_field_goals_attempted integer not null,
  three_point_field_goals_attempted integer not null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  last_synced_at timestamp with time zone null,
  constraint player_history_pkey primary key (id),
  constraint player_history_fixture_id_player_id_key unique (fixture_id, player_id),
  constraint unique_player_game unique (player_id, game_id),
  constraint player_history_player_id_fkey foreign KEY (player_id) references players (id)
) TABLESPACE pg_default;

create index IF not exists idx_player_history_last_synced on public.player_history using btree (last_synced_at) TABLESPACE pg_default;
```

### player_odds
```sql
create table public.player_odds (
  id text not null,
  fixture_id text not null,
  sportsbook text not null,
  market text not null,
  name text not null,
  is_main boolean null default false,
  selection text not null,
  normalized_selection text null,
  market_id text not null,
  selection_line text null,
  player_id text null,
  team_id text null,
  price integer null,
  points double precision null,
  timestamp double precision null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  start_date timestamp with time zone null,
  last_synced_at timestamp with time zone null,
  constraint player_odds_pkey primary key (id),
  constraint player_odds_unique_selection unique (
    fixture_id,
    sportsbook,
    market_id,
    selection,
    selection_line
  ),
  constraint fk_fixture foreign KEY (fixture_id) references fixtures (id) on delete CASCADE,
  constraint fk_player_odds_sportsbook foreign KEY (sportsbook) references sportsbook (name) on delete set null,
  constraint fk_player_odds_team_id foreign KEY (team_id) references teams (id) on delete set null,
  constraint player_odds_team_id_fkey foreign KEY (team_id) references teams (id)
) TABLESPACE pg_default;

create index IF not exists idx_player_odds_team_id on public.player_odds using btree (team_id) TABLESPACE pg_default;

create index IF not exists idx_player_odds_market_id on public.player_odds using btree (market_id) TABLESPACE pg_default;

create index IF not exists idx_player_odds_fixture_id on public.player_odds using btree (fixture_id) TABLESPACE pg_default;

create index IF not exists idx_player_odds_player_id on public.player_odds using btree (player_id) TABLESPACE pg_default;

create index IF not exists idx_player_odds_market on public.player_odds using btree (market) TABLESPACE pg_default;

create index IF not exists idx_player_odds_last_synced on public.player_odds using btree (last_synced_at) TABLESPACE pg_default;

create index IF not exists idx_player_odds_sportsbook on public.player_odds using btree (sportsbook) TABLESPACE pg_default;
```

### players
```sql
create table public.players (
  id text not null,
  full_name text not null,
  first_name text not null,
  last_name text not null,
  position text null,
  number integer null,
  age integer null,
  height integer null,
  weight integer null,
  experience integer null,
  logo text null,
  is_active boolean not null,
  source_ids jsonb null,
  sport_id text null,
  league_id text null,
  team_id text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint players_pkey primary key (id),
  constraint players_team_id_fkey foreign KEY (team_id) references teams (id)
) TABLESPACE pg_default;

create index IF not exists idx_players_active on public.players using btree (is_active) TABLESPACE pg_default;
```

### profiles
```sql
create table public.profiles (
  id uuid not null,
  username text null,
  first_name text null,
  last_name text null,
  phone text null,
  avatar_url text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_username_key unique (username),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id)
) TABLESPACE pg_default;
```

### sportsbook
```sql
create table public.sportsbook (
  id text not null,
  name text not null,
  logo text null,
  is_onshore boolean not null,
  is_active boolean not null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint sportsbook_pkey primary key (id),
  constraint sportsbook_name_unique unique (name)
) TABLESPACE pg_default;
```

### sync_log
```sql
create table public.sync_log (
  id uuid not null default gen_random_uuid (),
  sync_type text not null,
  started_at timestamp with time zone not null,
  completed_at timestamp with time zone null,
  status text not null default 'running'::text,
  last_sync_date date null,
  records_processed integer null default 0,
  error text null,
  metadata jsonb null,
  constraint sync_log_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_sync_log_sync_type on public.sync_log using btree (sync_type) TABLESPACE pg_default;

create index IF not exists idx_sync_log_completed_at on public.sync_log using btree (completed_at) TABLESPACE pg_default;

create index IF not exists idx_sync_log_type_date on public.sync_log using btree (sync_type, last_sync_date) TABLESPACE pg_default;

create index IF not exists idx_sync_log_status on public.sync_log using btree (status) TABLESPACE pg_default;
```

### sync_schedule
```sql
create table public.sync_schedule (
  id serial not null,
  endpoint text not null,
  frequency interval not null,
  last_run timestamp with time zone null,
  next_run timestamp with time zone null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  constraint sync_schedule_pkey primary key (id)
) TABLESPACE pg_default;
```

### teams
```sql
create table public.teams (
  id text not null,
  name text not null,
  numerical_id integer null,
  base_id integer null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  city text null,
  mascot text null,
  nickname text null,
  abbreviation text null,
  division text null,
  conference text null,
  logo text null,
  source_ids jsonb null,
  constraint teams_pkey primary key (id)
) TABLESPACE pg_default;
```

### sports
```sql
create table public.sports (
  id text not null,
  name text not null,
  numerical_id integer,
  main_markets jsonb,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint sports_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_sports_numerical_id on public.sports using btree (numerical_id) TABLESPACE pg_default;
create index IF not exists idx_sports_last_synced on public.sports using btree (last_synced_at) TABLESPACE pg_default;
```

### leagues
```sql
create table public.leagues (
  id text not null,
  name text not null,
  numerical_id integer,
  sport_id text not null,
  region text,
  region_code text,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint leagues_pkey primary key (id),
  constraint leagues_sport_id_fkey foreign key (sport_id) references sports (id)
) TABLESPACE pg_default;

create index IF not exists idx_leagues_numerical_id on public.leagues using btree (numerical_id) TABLESPACE pg_default;
create index IF not exists idx_leagues_sport_id on public.leagues using btree (sport_id) TABLESPACE pg_default;
create index IF not exists idx_leagues_region_code on public.leagues using btree (region_code) TABLESPACE pg_default;
create index IF not exists idx_leagues_last_synced on public.leagues using btree (last_synced_at) TABLESPACE pg_default;
```

## API Data Sources

This section documents the API endpoints used to populate the database tables.

### Sports Data

**Endpoint:** https://api.opticodds.com/api/v3/sports/active

**Parameters:**
- `key`: API key for authentication

**Example Response:**
```json
{
  "data": [
    {
      "id": "basketball",
      "name": "Basketball",
      "numerical_id": 4,
      "main_markets": [
        {
          "id": "moneyline",
          "name": "Moneyline",
          "numerical_id": 953
        },
        {
          "id": "point_spread",
          "name": "Point Spread",
          "numerical_id": 1172
        },
        {
          "id": "total_points",
          "name": "Total Points",
          "numerical_id": 1358
        }
      ]
    }
  ]
}
```

**Data Mapping:**
- `id` → `sports.id`
- `name` → `sports.name`
- `numerical_id` → `sports.numerical_id`
- `main_markets` → `sports.main_markets` (stored as JSONB)

### Leagues Data

**Endpoint:** https://api.opticodds.com/api/v3/leagues/active

**Parameters:**
- `sport`: Sport ID to filter by (can be specified multiple times)
- `key`: API key for authentication

**Example Response:**
```json
{
  "data": [
    {
      "id": "usa_-_nba",
      "name": "USA - NBA",
      "numerical_id": 582,
      "sport": {
        "id": "basketball",
        "name": "Basketball",
        "numerical_id": 4,
        "main_markets": [...]
      },
      "region": "UNITED_STATES",
      "region_code": "USA"
    }
  ]
}
```

**Data Mapping:**
- `id` → `leagues.id`
- `name` → `leagues.name`
- `numerical_id` → `leagues.numerical_id`
- `sport.id` → `leagues.sport_id`
- `region` → `leagues.region`
- `region_code` → `leagues.region_code`

## Future Enhancements

With the multi-sport foundation now in place through the `sports` and `leagues` tables, consider implementing the following enhancements to further improve the platform:

1. **Sport-Specific Stats Tables**: Create specialized tables for different sports (e.g., basketball-specific stats vs baseball-specific stats)
2. **Sport-Specific Market Types**: Implement more granular market type definitions tailored to each sport
3. **Seasons and Tournaments**: Add data structures for tracking seasons, tournaments, and playoffs across different sports
4. **Performance-Optimized Views**: Create database views that simplify data access across different sports
5. **Sport Filters**: Update UI components to filter by sport, league, or region
6. **Automatic Sync Scheduling**: Implement regular sync processes to keep sports and leagues data current

## Summary

This document serves as the definitive reference for our database schema. Any future modifications or additions should be updated here to ensure consistency across the codebase. 