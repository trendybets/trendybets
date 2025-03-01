// Client-side environment variables
export const clientEnv = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
}

// Log Supabase URL for debugging
if (typeof window !== 'undefined') {
  console.log('Using Supabase URL:', clientEnv.SUPABASE_URL);
}

// Server-side environment variables (only available in API routes and server components)
export const serverEnv = {
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  OPTIC_ODDS_API_KEY: process.env.OPTIC_ODDS_API_KEY || '',
  CRON_API_TOKEN: process.env.CRON_API_TOKEN || 'your-secure-api-token'
}

// Validate client environment variables
const missingClientVars = Object.entries(clientEnv).filter(([_, value]) => value === '')
if (missingClientVars.length > 0) {
  console.error('Missing client environment variables:', missingClientVars.map(([key]) => key))
}

// Validate server environment variables only on the server
if (typeof window === 'undefined') {
  const missingServerVars = Object.entries(serverEnv).filter(([_, value]) => value === '')
  if (missingServerVars.length > 0) {
    throw new Error(`Missing server environment variables: ${missingServerVars.map(([key]) => key).join(', ')}`)
  }
} 