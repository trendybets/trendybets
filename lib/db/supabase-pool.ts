import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { env } from '@/env.mjs'

// Configuration for the connection pool
interface PoolConfig {
  min: number        // Minimum number of connections in the pool
  max: number        // Maximum number of connections in the pool
  idleTimeoutMs: number  // Time in ms after which idle connections are removed
  acquireTimeoutMs: number // Time in ms to wait for a connection before timing out
}

// Default pool configuration
const DEFAULT_POOL_CONFIG: PoolConfig = {
  min: 3,                // Increased from 2 to 3
  max: 20,               // Increased from 10 to 20
  idleTimeoutMs: 60000,  // Increased from 30s to 60s
  acquireTimeoutMs: 10000 // Increased from 5s to 10s
}

// Connection with metadata
interface PooledConnection {
  client: SupabaseClient<Database>
  lastUsed: number
  inUse: boolean
  healthCheckPassed?: boolean
  lastHealthCheck?: number
}

/**
 * Supabase connection pool manager
 */
class SupabaseConnectionPool {
  private pool: PooledConnection[] = []
  private config: PoolConfig
  private maintenanceInterval: NodeJS.Timeout | null = null
  private supabaseUrl: string
  private supabaseKey: string
  private supabaseOptions: any

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    options: any = {},
    config: Partial<PoolConfig> = {}
  ) {
    this.supabaseUrl = supabaseUrl
    this.supabaseKey = supabaseKey
    this.supabaseOptions = options
    this.config = { ...DEFAULT_POOL_CONFIG, ...config }
    
    // Initialize the pool with minimum connections
    this.initializePool()
    
    // Start maintenance routine
    this.startMaintenance()
  }

  /**
   * Initialize the connection pool with minimum connections
   */
  private initializePool(): void {
    console.log(`Initializing Supabase connection pool with ${this.config.min} connections`)
    for (let i = 0; i < this.config.min; i++) {
      this.addConnectionToPool()
    }
  }

  /**
   * Add a new connection to the pool
   */
  private addConnectionToPool(): PooledConnection {
    const client = createClient<Database>(
      this.supabaseUrl,
      this.supabaseKey,
      this.supabaseOptions
    )
    
    const connection: PooledConnection = {
      client,
      lastUsed: Date.now(),
      inUse: false,
      healthCheckPassed: true,
      lastHealthCheck: Date.now()
    }
    
    this.pool.push(connection)
    return connection
  }

  /**
   * Get a connection from the pool
   * @returns A Supabase client
   */
  public async getConnection(): Promise<SupabaseClient<Database>> {
    // Find an available and healthy connection
    let connection = this.pool.find(conn => !conn.inUse && conn.healthCheckPassed !== false)
    
    // If no available connection and we haven't reached max, create a new one
    if (!connection && this.pool.length < this.config.max) {
      connection = this.addConnectionToPool()
    }
    
    // If still no connection, wait for one to become available
    if (!connection) {
      connection = await this.waitForAvailableConnection()
    }
    
    // Mark connection as in use
    connection.inUse = true
    connection.lastUsed = Date.now()
    
    return connection.client
  }

  /**
   * Wait for an available connection
   * @returns A pooled connection
   */
  private waitForAvailableConnection(): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      const checkForConnection = () => {
        // Check if we've exceeded the acquire timeout
        if (Date.now() - startTime > this.config.acquireTimeoutMs) {
          return reject(new Error('Timeout waiting for available connection'))
        }
        
        // Try to find an available and healthy connection
        const connection = this.pool.find(conn => !conn.inUse && conn.healthCheckPassed !== false)
        
        if (connection) {
          resolve(connection)
        } else {
          // Check again after a short delay
          setTimeout(checkForConnection, 100)
        }
      }
      
      checkForConnection()
    })
  }

  /**
   * Release a connection back to the pool
   * @param client The Supabase client to release
   */
  public releaseConnection(client: SupabaseClient<Database>): void {
    const connectionIndex = this.pool.findIndex(conn => conn.client === client)
    
    if (connectionIndex !== -1) {
      this.pool[connectionIndex].inUse = false
      this.pool[connectionIndex].lastUsed = Date.now()
    }
  }

  /**
   * Check if a connection is healthy
   * @param connection The connection to check
   * @returns True if the connection is healthy
   */
  private async checkConnectionHealth(connection: PooledConnection): Promise<boolean> {
    try {
      // Simple query to check if connection is healthy
      const { data, error } = await connection.client.from('_health_check')
        .select('count(*)')
        .limit(1)
        .maybeSingle()
      
      // If the table doesn't exist, that's fine - the query will error but the connection is still valid
      return !error || error.code === '42P01'; // 42P01 is the Postgres error code for "relation does not exist"
    } catch (error) {
      console.error('Connection health check failed:', error)
      return false
    }
  }

  /**
   * Start the maintenance routine to clean up idle connections
   */
  private startMaintenance(): void {
    this.maintenanceInterval = setInterval(() => {
      this.performMaintenance()
    }, 10000) // Run maintenance every 10 seconds
  }

  /**
   * Perform maintenance on the connection pool
   */
  private performMaintenance(): void {
    const now = Date.now()
    
    // Check health of connections that haven't been checked recently
    this.pool.forEach(async (connection, index) => {
      // Check health every 5 minutes or if the connection has been idle for a while
      const shouldCheckHealth = 
        !connection.lastHealthCheck || 
        now - connection.lastHealthCheck > 5 * 60 * 1000 || // 5 minutes
        (!connection.inUse && now - connection.lastUsed > this.config.idleTimeoutMs / 2);
      
      if (shouldCheckHealth) {
        connection.lastHealthCheck = now;
        connection.healthCheckPassed = await this.checkConnectionHealth(connection);
        
        // If connection is unhealthy and not in use, remove it
        if (!connection.healthCheckPassed && !connection.inUse && this.pool.length > this.config.min) {
          console.log('Removing unhealthy connection from pool');
          this.pool.splice(index, 1);
        }
      }
    });
    
    // Remove idle connections, but keep at least min connections
    if (this.pool.length > this.config.min) {
      const idleConnections = this.pool
        .filter(conn => !conn.inUse && now - conn.lastUsed > this.config.idleTimeoutMs)
        .sort((a, b) => a.lastUsed - b.lastUsed) // Sort by oldest first
      
      // Remove excess idle connections
      const connectionsToRemove = Math.min(
        idleConnections.length,
        this.pool.length - this.config.min
      )
      
      for (let i = 0; i < connectionsToRemove; i++) {
        const connectionIndex = this.pool.findIndex(conn => conn === idleConnections[i])
        if (connectionIndex !== -1) {
          this.pool.splice(connectionIndex, 1)
        }
      }
      
      if (connectionsToRemove > 0) {
        console.log(`Removed ${connectionsToRemove} idle connections from pool. Current pool size: ${this.pool.length}`)
      }
    }
  }

  /**
   * Execute an operation with retry logic
   * @param operation The operation to execute
   * @param retries Number of retries
   * @param delay Initial delay in ms
   * @returns Result of the operation
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries <= 0) throw error;
      
      console.log(`Database operation failed, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return this.executeWithRetry(operation, retries - 1, delay * 1.5);
    }
  }

  /**
   * Get the current pool status
   */
  public getPoolStatus(): {
    total: number
    inUse: number
    idle: number
    healthy: number
  } {
    const total = this.pool.length
    const inUse = this.pool.filter(conn => conn.inUse).length
    const idle = total - inUse
    const healthy = this.pool.filter(conn => conn.healthCheckPassed).length
    
    return { total, inUse, idle, healthy }
  }

  /**
   * Execute an operation with a pooled client and retry logic
   * @param clientFn Function to get the client
   * @param operation Operation to execute with the client
   * @returns Result of the operation
   */
  public async withPooledClient<T>(
    clientFn: () => Promise<SupabaseClient<Database>>,
    operation: (client: SupabaseClient<Database>) => Promise<T>
  ): Promise<T> {
    const client = await clientFn();
    
    try {
      return await this.executeWithRetry(() => operation(client));
    } finally {
      this.releaseConnection(client);
    }
  }

  /**
   * Shutdown the connection pool
   */
  public async shutdown(): Promise<void> {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval)
      this.maintenanceInterval = null
    }
    
    // Close all connections
    this.pool = []
    
    console.log('Supabase connection pool shut down')
  }
}

// Create singleton instances for different connection types
let serviceRolePool: SupabaseConnectionPool | null = null
let anonPool: SupabaseConnectionPool | null = null

/**
 * Get a connection pool for service role operations
 */
export function getServiceRolePool(options: any = {}): SupabaseConnectionPool {
  if (!serviceRolePool) {
    serviceRolePool = new SupabaseConnectionPool(
      env.NEXT_PUBLIC_SUPABASE_URL || '',
      env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        ...options
      }
    )
  }
  
  return serviceRolePool
}

/**
 * Get a connection pool for anonymous operations
 */
export function getAnonPool(options: any = {}): SupabaseConnectionPool {
  if (!anonPool) {
    anonPool = new SupabaseConnectionPool(
      env.NEXT_PUBLIC_SUPABASE_URL || '',
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      options
    )
  }
  
  return anonPool
}

/**
 * Get a Supabase client from the service role pool
 */
export async function getServiceRoleClient(options: any = {}): Promise<SupabaseClient<Database>> {
  return getServiceRolePool(options).getConnection()
}

/**
 * Get a Supabase client from the anonymous pool
 */
export async function getAnonClient(options: any = {}): Promise<SupabaseClient<Database>> {
  return getAnonPool(options).getConnection()
}

/**
 * Release a Supabase client back to its pool
 */
export function releaseClient(client: SupabaseClient<Database>): void {
  // Try to release to both pools
  if (serviceRolePool) {
    serviceRolePool.releaseConnection(client)
  }
  
  if (anonPool) {
    anonPool.releaseConnection(client)
  }
}

/**
 * Execute a function with a pooled Supabase client
 * @param clientFn Function to get the appropriate client
 * @param operation Function to execute with the client
 * @returns Result of the operation
 */
export async function withPooledClient<T>(
  clientFn: () => Promise<SupabaseClient<Database>>,
  operation: (client: SupabaseClient<Database>) => Promise<T>
): Promise<T> {
  const client = await clientFn()
  
  try {
    return await operation(client)
  } finally {
    releaseClient(client)
  }
}

/**
 * Execute a function with a service role client
 * @param operation Function to execute with the client
 * @param options Client options
 * @returns Result of the operation
 */
export async function withServiceRole<T>(
  operation: (client: SupabaseClient<Database>) => Promise<T>,
  options: any = {}
): Promise<T> {
  return withPooledClient(() => getServiceRoleClient(options), operation)
}

/**
 * Execute a function with an anonymous client
 * @param operation Function to execute with the client
 * @param options Client options
 * @returns Result of the operation
 */
export async function withAnonRole<T>(
  operation: (client: SupabaseClient<Database>) => Promise<T>,
  options: any = {}
): Promise<T> {
  return withPooledClient(() => getAnonClient(options), operation)
}

/**
 * Shutdown all connection pools
 */
export async function shutdownPools(): Promise<void> {
  if (serviceRolePool) {
    await serviceRolePool.shutdown()
    serviceRolePool = null
  }
  
  if (anonPool) {
    await anonPool.shutdown()
    anonPool = null
  }
}