# TrendyBets Project Overview

## Introduction

TrendyBets is a modern web application for tracking sports betting odds and trends across major sportsbooks. The platform focuses on NBA games and provides users with comprehensive information about upcoming games, odds from various sportsbooks, and player statistics.

## Core Features

- View upcoming NBA games with the best odds from major sportsbooks
- Compare spreads, moneylines, and totals in a clean, modern interface
- Filter games by date and timeframe
- View detailed game research and statistics
- User authentication with Supabase
- Responsive design for mobile and desktop

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI Framework**: Tailwind CSS, shadcn/ui components
- **State Management**: React Query
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Caching**: Redis
- **Deployment**: Vercel
- **API Integration**: OpticOdds API for sports data

## Project Structure

The project follows a modular structure with the Next.js App Router architecture:

```
trendybets/
├── app/                  # Next.js App Router
│   ├── api/              # API routes
│   ├── components/       # App-specific components
│   ├── auth/             # Authentication pages
│   ├── profile/          # User profile pages
│   ├── trendy-games/     # Game listing pages
│   ├── trendy-props/     # Player props pages
│   └── trendy-projections/ # Projections pages
├── components/           # Shared components
│   ├── ui/               # UI components (shadcn/ui)
├── lib/                  # Shared utilities
│   ├── db/               # Database functions
│   ├── utils/            # Utility functions
│   └── services/         # Service integrations
├── public/               # Static assets
├── types/                # Global type definitions
└── supabase/             # Supabase configuration
```

## Key Workflows

1. **User Authentication**: Sign up, login, and profile management
2. **Game Browsing**: View upcoming games, filter by date, view odds
3. **Game Research**: Detailed statistics and trends for specific games
4. **Data Synchronization**: Automated sync of game data, odds, and player statistics
5. **Admin Functions**: Data management and system monitoring

## Deployment

The application is deployed on Vercel with automatic deployments from the main branch. It utilizes Vercel's cron jobs for data synchronization.

## Environment Setup

The application requires several environment variables to be set up in a `.env.local` file, including:
- Supabase credentials
- API keys for external services
- Redis configuration
- Cron job authentication tokens
