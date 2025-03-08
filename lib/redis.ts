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
  },
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false
}

// Create Redis client
let redisClient: Redis | null = null
let redisAvailable = false

// In-memory fallback cache
const memoryCache = new Map<string, { data: any, expiry: number }>()

// Initialize Redis client
export function getRedisClient(): Redis | null {
  if (!redisClient) {
    try {
      redisClient = new Redis(redisOptions)
      
      // Log connection events
      redisClient.on('connect', () => {
        console.log('Redis client connected')
        redisAvailable = true
      })
      
      redisClient.on('error', (err) => {
        console.error('Redis client error:', err)
        redisAvailable = false
      })
      
      redisClient.on('reconnecting', () => {
        console.log('Redis client reconnecting')
      })

      redisClient.on('end', () => {
        console.log('Redis connection ended')
        redisAvailable = false
      })
    } catch (error) {
      console.error('Failed to create Redis client:', error)
      redisAvailable = false
      return null
    }
  }
  
  return redisClient
}

// Close Redis connection
export function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    return redisClient.quit().then(() => {
      redisClient = null
      redisAvailable = false
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
  // Try Redis first if available
  if (redisAvailable && redisClient) {
    try {
      const cachedData = await redisClient.get(key)
      
      if (cachedData) {
        return JSON.parse(cachedData) as T
      }
    } catch (error) {
      console.error(`Error getting data from Redis cache for key ${key}:`, error)
      redisAvailable = false
    }
  }
  
  // Fallback to memory cache
  const memCached = memoryCache.get(key)
  if (memCached && memCached.expiry > Date.now()) {
    return memCached.data as T
  }
  
  // Clean up expired memory cache entries
  if (memCached && memCached.expiry <= Date.now()) {
    memoryCache.delete(key)
  }
  
  return null
}

/**
 * Set data in cache
 * @param key Cache key
 * @param data Data to cache
 * @param ttl Time to live in seconds (default: 1 hour)
 */
export async function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
  // Try to set in Redis if available
  if (redisAvailable && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(data), 'EX', ttl)
    } catch (error) {
      console.error(`Error setting data in Redis cache for key ${key}:`, error)
      redisAvailable = false
    }
  }
  
  // Always set in memory cache as fallback
  const expiryMs = Date.now() + (ttl * 1000)
  memoryCache.set(key, { data, expiry: expiryMs })
}

/**
 * Delete data from cache
 * @param key Cache key
 */
export async function deleteFromCache(key: string): Promise<void> {
  // Try to delete from Redis if available
  if (redisAvailable && redisClient) {
    try {
      await redisClient.del(key)
    } catch (error) {
      console.error(`Error deleting data from Redis cache for key ${key}:`, error)
      redisAvailable = false
    }
  }
  
  // Always delete from memory cache
  memoryCache.delete(key)
}

/**
 * Delete multiple keys from cache using pattern
 * @param pattern Key pattern to match (e.g., "user:*")
 */
export async function deleteByPattern(pattern: string): Promise<void> {
  // Try to delete from Redis if available
  if (redisAvailable && redisClient) {
    try {
      const keys = await redisClient.keys(pattern)
      
      if (keys.length > 0) {
        await redisClient.del(...keys)
        console.log(`Deleted ${keys.length} Redis keys matching pattern ${pattern}`)
      }
    } catch (error) {
      console.error(`Error deleting Redis keys with pattern ${pattern}:`, error)
      redisAvailable = false
    }
  }
  
  // Delete matching keys from memory cache
  const regex = new RegExp(pattern.replace('*', '.*'))
  let count = 0
  for (const key of Array.from(memoryCache.keys())) {
    if (regex.test(key)) {
      memoryCache.delete(key)
      count++
    }
  }
  
  if (count > 0) {
    console.log(`Deleted ${count} memory cache keys matching pattern ${pattern}`)
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