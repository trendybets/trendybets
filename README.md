# TrendyBets

A modern web application for tracking sports betting odds and trends across major sportsbooks.

## Features

- View upcoming games with the best odds from major sportsbooks
- Compare spreads, moneylines, and totals in a clean, modern interface
- Filter games by date and timeframe
- Responsive design for mobile and desktop

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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
