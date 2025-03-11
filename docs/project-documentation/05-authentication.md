# TrendyBets Authentication & User Management

## Overview

TrendyBets uses Supabase Authentication for user management. This document outlines the authentication flow, user management, and security considerations implemented in the application.

## Authentication Provider

### Supabase Auth

Supabase Auth provides:

- Email/password authentication
- Social login (Google, GitHub, etc.)
- Magic link authentication
- JWT-based session management
- Row-level security (RLS) policies

## Authentication Flow

### Sign Up Process

1. User clicks "Sign In / Register" button on the home page
2. Login popup appears with a tab for registration
3. User enters email, password, and username
4. Client sends registration request to Supabase Auth
5. On successful registration:
   - A new user is created in Supabase Auth
   - A trigger creates a corresponding entry in the `profiles` table
   - User is automatically signed in
   - UI updates to show authenticated state

### Sign In Process

1. User clicks "Sign In / Register" button
2. Login popup appears
3. User enters email and password
4. Client sends login request to Supabase Auth
5. On successful login:
   - Supabase returns a session with JWT
   - Session is stored in browser
   - UI updates to show authenticated state

### Sign Out Process

1. User clicks "Sign Out" button
2. Client sends sign out request to Supabase Auth
3. Session is invalidated
4. UI updates to show unauthenticated state

## Implementation Details

### Client-Side Authentication

The application uses Supabase's client-side libraries for authentication:

```typescript
// Create Supabase client
const supabase = createClientComponentClient();

// Sign up
const signUp = async (email, password, username) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });
  
  if (error) throw error;
  return data;
};

// Sign in
const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

// Sign out
const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
```

### Server-Side Authentication

For server-side authentication, the application uses Supabase's server-side libraries:

```typescript
// In API routes
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Proceed with authenticated request
}
```

### Authentication State Management

The application manages authentication state using Supabase's `onAuthStateChange` event:

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

## User Profiles

### Profile Table

The application maintains user profiles in a `profiles` table:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Profile Creation

When a user signs up, a trigger automatically creates a profile:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### Profile Management

Users can update their profiles through the profile page:

```typescript
const updateProfile = async (updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);
  
  if (error) throw error;
  return data;
};
```

## Security Considerations

### Row Level Security (RLS)

The application uses Supabase's Row Level Security to restrict access to data:

```sql
-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Create policy for updating own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### JWT Validation

API routes validate JWT tokens to ensure requests are authenticated:

```typescript
// Middleware for protected routes
export const middleware = async (request) => {
  const response = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res: response });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session && request.nextUrl.pathname.startsWith('/protected')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return response;
};
```

### Password Policies

The application enforces password strength requirements:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Session Management

Sessions are managed by Supabase Auth:

- Sessions expire after a configurable period
- Refresh tokens are used to extend sessions
- Sessions can be revoked by the user or admin

## Admin Functions

### User Management

Administrators can manage users through the Supabase dashboard:

- View all users
- Reset passwords
- Disable accounts
- Delete accounts

### Authentication Logs

Authentication logs are available in the Supabase dashboard:

- Sign in attempts
- Sign up events
- Password resets
- Session creation/deletion

## Troubleshooting

### Common Issues

1. **"Database error saving new user"**:
   - Cause: Missing `profiles` table or trigger
   - Solution: Run the SQL migration to create the table and trigger

2. **"Invalid login credentials"**:
   - Cause: Incorrect email or password
   - Solution: Verify credentials or use password reset

3. **"User already registered"**:
   - Cause: Email already in use
   - Solution: Use a different email or sign in with existing account
