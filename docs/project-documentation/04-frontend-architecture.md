# TrendyBets Frontend Architecture

## Overview

TrendyBets is built using Next.js 14 with the App Router architecture, React 18, and TypeScript. The frontend is designed to be responsive, performant, and user-friendly. This document outlines the frontend architecture, key components, and UI patterns used throughout the application.

## Application Structure

### App Router Architecture

The application uses Next.js App Router, which provides:

- File-based routing
- Server components
- Client components
- Layout components
- API routes

The main structure is:

```
app/
├── layout.tsx              # Root layout (includes providers)
├── page.tsx                # Home page
├── auth/                   # Authentication pages
│   └── [...auth]/          # Auth routes
├── components/             # App-specific components
├── trendy-games/           # Game listing pages
├── trendy-props/           # Player props pages
├── trendy-projections/     # Projections pages
└── api/                    # API routes
```

### Component Organization

Components are organized into two main categories:

1. **App Components** (`/app/components/`): Components specific to the application
2. **Shared Components** (`/components/`): Reusable components that can be used across the application

## Key Components

### Layout Components

- `app/layout.tsx`: Root layout that includes global providers and styles
- `app/components/header.tsx`: Main navigation header
- `app/components/footer.tsx`: Footer component

### Authentication Components

- `app/components/auth/login-popup.tsx`: Login popup component
- `app/components/auth/signup-form.tsx`: Signup form component

### Game Components

- `app/components/trendy-games-view.tsx`: Main component for displaying games
- `app/components/game-research-view.tsx`: Component for displaying detailed game research

### UI Components

The application uses shadcn/ui components, which are built on top of Radix UI:

- `Button`: Reusable button component
- `Dialog`: Modal dialog component
- `Tabs`: Tab navigation component
- `Select`: Dropdown select component
- `Checkbox`: Checkbox component

## State Management

### Client-Side State

For client-side state management, the application uses:

- React's built-in `useState` and `useReducer` hooks for local component state
- React Query for server state management and data fetching

Example of React Query usage:

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['games'],
  queryFn: fetchGames,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### Server-Side State

For server-side state, the application uses:

- Next.js Server Components for server-rendered content
- Supabase for authentication state

## Data Fetching

The application uses multiple approaches for data fetching:

1. **React Query**: For client-side data fetching with caching and automatic refetching
2. **API Routes**: Custom API routes for backend operations
3. **Direct Database Access**: Server components can directly access the database

Example of API route data fetching:

```typescript
// Client component
const fetchGames = async () => {
  const response = await fetch('/api/games');
  if (!response.ok) {
    throw new Error('Failed to fetch games');
  }
  return response.json();
};
```

## Authentication Flow

The authentication flow is handled using Supabase Auth:

1. User clicks "Sign In / Register" button
2. Login popup is displayed
3. User enters credentials or registers
4. Supabase Auth handles authentication
5. On successful authentication, the user is redirected to the appropriate page
6. Authentication state is managed using Supabase's `onAuthStateChange` event

Example of authentication state management:

```typescript
useEffect(() => {
  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };
  
  checkUser();
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user || null);
  });
  
  return () => {
    subscription.unsubscribe();
  };
}, [supabase.auth]);
```

## UI/UX Patterns

### Responsive Design

The application is designed to be responsive using:

- Tailwind CSS for responsive utilities
- Flexbox and Grid layouts
- Mobile-first approach

### Loading States

Loading states are handled using:

- Skeleton loaders for content loading
- Loading spinners for actions
- Disabled states for buttons during loading

Example of a loading component:

```typescript
export function LoadingState() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}
```

### Error Handling

Error handling is implemented using:

- Try/catch blocks for async operations
- Error boundaries for component errors
- Toast notifications for user feedback

### Data Tables

Data tables are implemented using TanStack Table (React Table):

```typescript
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  state: {
    sorting,
  },
  onSortingChange: setSorting,
});
```

## Performance Optimization

The application implements several performance optimizations:

1. **Code Splitting**: Using Next.js dynamic imports
2. **Image Optimization**: Using Next.js Image component
3. **Caching**: Using React Query and Redis
4. **Lazy Loading**: Using React's lazy and Suspense
5. **Memoization**: Using useMemo and useCallback hooks

## Styling

The application uses:

- Tailwind CSS for utility-based styling
- CSS Modules for component-specific styling
- Global styles in `app/globals.css`
- Theme customization using `tailwind.config.js`

## Accessibility

Accessibility features include:

- Semantic HTML
- ARIA attributes
- Keyboard navigation
- Focus management
- Color contrast compliance

## Browser Compatibility

The application is designed to work on modern browsers:

- Chrome
- Firefox
- Safari
- Edge

## Mobile Support

The application is fully responsive and supports:

- iOS Safari
- Android Chrome
- Mobile Firefox
