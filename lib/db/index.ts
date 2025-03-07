import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { clientEnv, serverEnv } from "@/lib/env"

// Create a Supabase client for server-side operations
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Create a Supabase client for client-side operations
export const supabaseClient = createClient<Database>(
  clientEnv.SUPABASE_URL,
  clientEnv.SUPABASE_ANON_KEY
)

// Helper function to calculate average points
export function calculateAverage(history: any[]) {
  if (!history.length) return 0
  const sum = history.reduce((acc, game) => acc + game.points, 0)
  return Math.round((sum / history.length) * 10) / 10 // Round to 1 decimal place
} 