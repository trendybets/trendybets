import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { withServiceRole, withAnonRole } from './supabase-pool'

/**
 * Get a Supabase client for client-side operations
 * This uses the standard client component client from auth-helpers-nextjs
 */
export function getClientSideSupabase() {
  return createClientComponentClient<Database>()
}

/**
 * Execute a database operation with a service role client
 * This uses the connection pool for better performance and resource management
 * @param operation Function that uses the Supabase client
 * @param options Optional client configuration
 * @returns Result of the operation
 */
export async function withServiceRoleClient<T>(
  operation: (client: SupabaseClient<Database>) => Promise<T>,
  options: any = {}
): Promise<T> {
  return withServiceRole(operation, options)
}

/**
 * Execute a database operation with an anonymous client
 * This uses the connection pool for better performance and resource management
 * @param operation Function that uses the Supabase client
 * @param options Optional client configuration
 * @returns Result of the operation
 */
export async function withAnonClient<T>(
  operation: (client: SupabaseClient<Database>) => Promise<T>,
  options: any = {}
): Promise<T> {
  return withAnonRole(operation, options)
}

/**
 * Execute a database query with error handling and retries
 * @param operation Function that performs the database operation
 * @param retries Number of retries (default: 3)
 * @param delay Delay between retries in ms (default: 1000)
 * @returns Result of the operation
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (retries <= 0) {
      throw error
    }
    
    console.warn(`Database operation failed, retrying... (${retries} attempts left)`, error)
    
    // Wait for the specified delay
    await new Promise(resolve => setTimeout(resolve, delay))
    
    // Retry with one fewer retry and increased delay (exponential backoff)
    return withRetry(operation, retries - 1, delay * 1.5)
  }
}

/**
 * Execute a database query with performance logging
 * @param operation Function that performs the database operation
 * @param queryName Name of the query for logging
 * @returns Result of the operation
 */
export async function withPerformanceLogging<T>(
  operation: () => Promise<T>,
  queryName: string
): Promise<T> {
  const startTime = performance.now()
  
  try {
    const result = await operation()
    const duration = performance.now() - startTime
    
    console.log(`Query "${queryName}" completed in ${duration.toFixed(2)}ms`)
    
    return result
  } catch (error) {
    const duration = performance.now() - startTime
    console.error(`Query "${queryName}" failed after ${duration.toFixed(2)}ms:`, error)
    throw error
  }
} 