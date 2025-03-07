# TrendyBets

A modern web application for tracking sports betting odds and trends across major sportsbooks.

## Features

- View upcoming games with the best odds from major sportsbooks
- Compare spreads, moneylines, and totals in a clean, modern interface
- Filter games by date and timeframe
- Responsive design for mobile and desktop
- User authentication with Supabase

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment

This project is automatically deployed to Vercel when changes are pushed to the main branch.

### Vercel Pro Features

This project utilizes Vercel Pro features for more frequent cron job execution:
- Player history sync: Every 6 hours
- Fixtures completed sync: Every 12 hours
- Fixtures sync: Every 4 hours
- Predictions: Every 6 hours, 30 minutes after sync

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Deploying to Vercel

This project is optimized for deployment on Vercel. To deploy:

1. Push your code to a GitHub repository
2. Import your repository on Vercel:
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New" > "Project"
   - Select your repository
   - Configure your project settings
   - Add the environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - Click "Deploy"

Vercel will automatically build and deploy your application. Each time you push changes to your repository, Vercel will automatically redeploy your application.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Project Structure

The project follows a modular structure to maintain clean separation of concerns:

```
trendybets/
├── app/                  # Next.js App Router
│   ├── api/              # API routes
│   ├── components/       # App-specific components
│   ├── types/            # TypeScript type definitions
│   └── ...               # Page routes
├── components/           # Shared components
│   ├── ui/               # UI components (shadcn/ui)
│   └── ...               # Other shared components
├── lib/                  # Shared utilities
│   ├── db/               # Database functions
│   │   ├── bets-db.ts    # Betting-related database functions
│   │   ├── games-db.ts   # Game-related database functions
│   │   ├── odds-db.ts    # Odds-related database functions
│   │   └── user-db.ts    # User-related database functions
│   ├── utils/            # Utility functions
│   │   ├── date-utils.ts # Date-related utilities
│   │   ├── string-utils.ts # String-related utilities
│   │   └── ui-utils.ts   # UI-related utilities
│   ├── database.ts       # Database client re-exports
│   ├── env.ts            # Environment variables
│   └── utils.ts          # Utility function re-exports
├── public/               # Static assets
├── types/                # Global type definitions
├── debug/                # Debug files
│   ├── json/             # JSON test data
│   └── scripts/          # Debug scripts
└── ...                   # Configuration files
```

## Database Setup

### Fixing "Database error saving new user"

#### What Caused the Error

The error occurs because the application is trying to save user metadata to a `profiles` table that doesn't exist in your Supabase database. When a user signs up, Supabase Auth creates a record in the `auth.users` table, but the application expects a corresponding record in a custom `profiles` table.

#### Solution

If you encounter a "Database error saving new user" when trying to sign up, you need to create the profiles table in your Supabase database. You have two options:

#### Option 1: Using the Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the contents of the `supabase/manual_migration.sql` file
5. Run the query

#### Option 2: Using the Command Line

You can run one of the provided scripts:

**Using Node.js:**
```bash
# Install dependencies if needed
npm install dotenv @supabase/supabase-js

# Run the script
node scripts/apply-migration.js
```

**Using Shell Script (macOS/Linux):**
```bash
# Make sure the script is executable
chmod +x scripts/apply-migration.sh

# Run the script
./scripts/apply-migration.sh
```

Both methods will:
- Create the profiles table
- Set up Row Level Security
- Create a trigger to automatically create profile entries for new users
- Create profiles for any existing users

After running this SQL, the signup process should work correctly.

## Automated Data Synchronization

This project uses automated data synchronization to keep the database updated with the latest NBA player statistics, game fixtures, and odds. The sync process is handled by several API routes that are automatically triggered by Vercel cron jobs.

### Sync Functions

The following sync functions are available:

1. **Player History Sync** (`/api/sync-player-history`):
   - Updates the `player_history` table with new game statistics
   - Runs every 6 hours

2. **Completed Fixtures Sync** (`/api/sync-fixtures-completed`):
   - Updates the `fixtures_completed` table with completed game results
   - Runs every 12 hours

3. **Fixtures Sync** (`/api/sync-fixtures`):
   - Updates the `fixtures` table with upcoming game information
   - Runs every 4 hours

4. **Run Predictions** (`/api/run-predictions`):
   - Executes the prediction algorithm to generate new player prop predictions
   - Runs every 6 hours, 30 minutes after data sync

### Manual Triggering

You can manually trigger the sync functions using curl:

```bash
# Sync player history (all players - may timeout)
curl -X POST https://your-domain.com/api/sync-player-history -H "api-token: 2b6tTNGbvjjmKOxcx1ElR/7Vr5olIlRXyhLWbt5dhk0="

# Sync player history for a specific player
curl -X POST https://your-domain.com/api/sync-player-history -H "api-token: 2b6tTNGbvjjmKOxcx1ElR/7Vr5olIlRXyhLWbt5dhk0=" -H "Content-Type: application/json" -d '{"player_id": 123}'

# Sync player history in batches (recommended to avoid timeouts)
curl -X POST https://your-domain.com/api/sync-coordinator -H "api-token: 2b6tTNGbvjjmKOxcx1ElR/7Vr5olIlRXyhLWbt5dhk0="

# Sync fixtures (upcoming games)
curl -X POST https://your-domain.com/api/sync-fixtures -H "api-token: 2b6tTNGbvjjmKOxcx1ElR/7Vr5olIlRXyhLWbt5dhk0="
```

### Environment Variables

To configure the sync process, add the following to your `.env.local` file:

```
CRON_API_TOKEN=2b6tTNGbvjjmKOxcx1ElR/7Vr5olIlRXyhLWbt5dhk0=
```

### Vercel Configuration

The cron jobs are configured in the `vercel.json` file at the root of the project.
