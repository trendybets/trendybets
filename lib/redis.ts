import Redis from 'ioredis'
import { env } from '@/env.mjs'

// Default TTL in seconds (1 hour)
const DEFAULT_TTL = 3600

// Redis connection options
const redisOptions = {
  host: env.REDIS_HOST || 'localhost',
  port: parseInt(env.REDIS_PORT || '6379'),
  password: env.REDIS_PASSWORD || undefined,
  retryStrategy: (times: number) => {
    // Retry connection with exponential backoff
    const delay = Math.min(times * 50, 2000)
    return delay
  }
}

// Create Redis client
let redisClient: Redis | null = null

// Initialize Redis client
export function getRedisClient(): Redis {
  if (!redisClient) {
    try {
      redisClient = new Redis(redisOptions)
      
      // Log connection events
      redisClient.on('connect', () => {
        console.log('Redis client connected')
      })
      
      redisClient.on('error', (err) => {
        console.error('Redis client error:', err)
      })
      
      redisClient.on('reconnecting', () => {
        console.log('Redis client reconnecting')
      })
    } catch (error) {
      console.error('Failed to create Redis client:', error)
      throw error
    }
  }
  
  return redisClient
}

// Close Redis connection
export function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    return redisClient.quit().then(() => {
      redisClient = null
      console.log('Redis connection closed')
    })
  }
  
  return Promise.resolve()
}

/**
 * Get data from cache
 * @param key Cache key
 * @returns Cached data or null if not found
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient()
    const cachedData = await redis.get(key)
    
    if (!cachedData) {
      return null
    }
    
    return JSON.parse(cachedData) as T
  } catch (error) {
    console.error(`Error getting data from cache for key ${key}:`, error)
    return null
  }
}

/**
 * Set data in cache
 * @param key Cache key
 * @param data Data to cache
 * @param ttl Time to live in seconds (default: 1 hour)
 */
export async function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
  try {
    const redis = getRedisClient()
    await redis.set(key, JSON.stringify(data), 'EX', ttl)
  } catch (error) {
    console.error(`Error setting data in cache for key ${key}:`, error)
  }
}

/**
 * Delete data from cache
 * @param key Cache key
 */
export async function deleteFromCache(key: string): Promise<void> {
  try {
    const redis = getRedisClient()
    await redis.del(key)
  } catch (error) {
    console.error(`Error deleting data from cache for key ${key}:`, error)
  }
}

/**
 * Delete multiple keys from cache using pattern
 * @param pattern Key pattern to match (e.g., "user:*")
 */
export async function deleteByPattern(pattern: string): Promise<void> {
  try {
    const redis = getRedisClient()
    const keys = await redis.keys(pattern)
    
    if (keys.length > 0) {
      await redis.del(...keys)
      console.log(`Deleted ${keys.length} keys matching pattern ${pattern}`)
    }
  } catch (error) {
    console.error(`Error deleting keys with pattern ${pattern}:`, error)
  }
}

/**
 * Cache wrapper function for async operations
 * @param key Cache key
 * @param fetchFn Function to fetch data if not in cache
 * @param ttl Time to live in seconds (default: 1 hour)
 * @returns Data from cache or from fetch function
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  try {
    // Try to get data from cache
    const cachedData = await getFromCache<T>(key)
    
    if (cachedData) {
      return cachedData
    }
    
    // If not in cache, fetch data
    const data = await fetchFn()
    
    // Cache the data
    await setCache(key, data, ttl)
    
    return data
  } catch (error) {
    console.error(`Error in withCache for key ${key}:`, error)
    // If caching fails, still return the data from the fetch function
    return fetchFn()
  }
} 