# TrendyBets Database Structure

## Overview

TrendyBets uses Supabase PostgreSQL as its primary database. The database schema is designed to store information about NBA games, teams, players, odds, and user data. This document outlines the main tables and their relationships.

## Database Tables

### Teams

Stores information about NBA teams.

```typescript
teams: {
  id: string              // Primary key
  name: string            // Team name (e.g., "Los Angeles Lakers")
  abbreviation: string    // Team abbreviation (e.g., "LAL")
  logo: string            // URL to team logo
  city: string            // Team city
  conference: string      // Conference (East/West)
  division: string        // Division
  created_at: string      // Creation timestamp
  updated_at: string      // Last update timestamp
}
```

### Fixtures (Upcoming Games)

Stores information about upcoming NBA games.

```typescript
fixtures: {
  id: string              // Primary key
  numerical_id: number    // Numerical ID from external API
  game_id: string         // Game ID from external API
  start_date: string      // Game start date and time
  home_team_id: string    // Foreign key to teams table
  away_team_id: string    // Foreign key to teams table
  home_team_display: string // Display name for home team
  away_team_display: string // Display name for away team
  status: string          // Game status (e.g., "unplayed")
  venue_name: string      // Venue name
  venue_location: string  // Venue location
  broadcast: string       // Broadcast information
  season_type: string     // Season type (regular/playoffs)
  season_year: string     // Season year
  season_week: string     // Season week
  created_at: string      // Creation timestamp
  updated_at: string      // Last update timestamp
}
```

### Fixtures Completed (Past Games)

Stores information about completed NBA games with scores.

```typescript
fixtures_completed: {
  id: string              // Primary key
  numerical_id: number    // Numerical ID from external API
  game_id: string         // Game ID from external API
  start_date: string      // Game start date and time
  home_competitors: {     // Home team information
    id: string
    name: string
    numerical_id: number
    base_id: number
    abbreviation: string
    logo: string
  }[]
  away_competitors: {     // Away team information
    id: string
    name: string
    numerical_id: number
    base_id: number
    abbreviation: string
    logo: string
  }[]
  home_team_display: string // Display name for home team
  away_team_display: string // Display name for away team
  status: string          // Game status (e.g., "completed")
  venue_name: string      // Venue name
  venue_location: string  // Venue location
  broadcast: string       // Broadcast information
  home_score_total: number // Total home team score
  home_score_q1: number   // Home team Q1 score
  home_score_q2: number   // Home team Q2 score
  home_score_q3: number   // Home team Q3 score
  home_score_q4: number   // Home team Q4 score
  away_score_total: number // Total away team score
  away_score_q1: number   // Away team Q1 score
  away_score_q2: number   // Away team Q2 score
  away_score_q3: number   // Away team Q3 score
  away_score_q4: number   // Away team Q4 score
  result: {               // Detailed result information
    scores: {
      home: {
        total: number
        periods: {
          period_1: number
          period_2: number
          period_3: number
          period_4: number
        }
      }
      away: {
        total: number
        periods: {
          period_1: number
          period_2: number
          period_3: number
          period_4: number
        }
      }
    }
  }
  season_type: string     // Season type (regular/playoffs)
  season_year: string     // Season year
  season_week: string     // Season week
}
```

### Odds

Stores betting odds for games.

```typescript
odds: {
  id: string              // Primary key
  fixture_id: string      // Foreign key to fixtures table
  sportsbook_id: string   // Foreign key to sportsbook table
  market_type: string     // Market type (e.g., "moneyline", "spread", "total")
  team_id: string         // Foreign key to teams table (if applicable)
  price: number           // Odds price
  points: number          // Points (for spread and total markets)
  selection_line: string  // Selection line (e.g., "over", "under")
  created_at: string      // Creation timestamp
  updated_at: string      // Last update timestamp
}
```

### Sportsbooks

Stores information about sportsbooks.

```typescript
sportsbook: {
  id: string              // Primary key
  name: string            // Sportsbook name
  logo: string            // URL to sportsbook logo
  created_at: string      // Creation timestamp
  updated_at: string      // Last update timestamp
}
```

### Player Props

Stores player proposition bets.

```typescript
player_props: {
  id: string              // Primary key
  player_id: string       // Player ID
  points: number          // Points value
  market_id: string       // Market ID
  selection_line: string  // Selection line (e.g., "over", "under")
  name?: string           // Player name
  sportsbook: {           // Sportsbook information
    name: string
    logo: string
  }
}
```

## Database Relationships

- **Teams** are referenced by **Fixtures** (home_team_id, away_team_id)
- **Fixtures** are referenced by **Odds** (fixture_id)
- **Teams** are referenced by **Odds** (team_id)
- **Sportsbooks** are referenced by **Odds** (sportsbook_id)

## Connection Pooling

The application uses a connection pooling system to efficiently manage database connections. This is implemented in `/lib/db/supabase-pool.ts` and provides:

- Minimum and maximum connection limits
- Connection timeout handling
- Idle connection cleanup
- Different pools for service role and anonymous operations

## Data Access Patterns

Database access is abstracted through utility functions in the `/lib/db/` directory:

- `games-db.ts`: Functions for accessing game data
- `odds-db.ts`: Functions for accessing odds data
- `user-db.ts`: Functions for user-related operations
- `bets-db.ts`: Functions for bet-related operations

These utility functions provide a clean API for the rest of the application to interact with the database without directly writing SQL queries.
