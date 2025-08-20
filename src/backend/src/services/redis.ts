import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { CacheService } from '../types';

/**
 * Redis Service for caching, sessions, and pub/sub
 */
export class RedisService implements CacheService {
  private static instance: RedisService;
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;
  private isConnected = false;

  private constructor() {}

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Initialize Redis connections
   */
  async initialize(): Promise<void> {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
        family: 4, // Force IPv4
      };

      // Main client for general operations
      this.client = new Redis(redisConfig);
      
      // Separate connections for pub/sub (Redis requirement)
      this.subscriber = new Redis(redisConfig);
      this.publisher = new Redis(redisConfig);

      // Event handlers for main client
      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        logger.error('Redis connection error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      // Connect to Redis
      await this.client.connect();
      await this.subscriber.connect();
      await this.publisher.connect();

      // Test the connection
      await this.client.ping();
      logger.info('Redis service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      throw error;
    }
  }

  /**
   * Get Redis client instance
   */
  static getClient(): Redis | null {
    return RedisService.getInstance().client;
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  /**
   * Get a value from cache
   */
  async get(key: string): Promise<string | null> {
    try {
      if (!this.isReady()) {
        logger.warn('Redis not available for GET operation');
        return null;
      }

      const value = await this.client!.get(key);
      
      if (value) {
        logger.debug(`Cache HIT: ${key}`);
      } else {
        logger.debug(`Cache MISS: ${key}`);
      }

      return value;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (!this.isReady()) {
        logger.warn('Redis not available for SET operation');
        return;
      }

      if (ttl) {
        await this.client!.setex(key, ttl, value);
      } else {
        await this.client!.set(key, value);
      }

      logger.debug(`Cache SET: ${key} (TTL: ${ttl || 'none'})`);
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    try {
      if (!this.isReady()) {
        logger.warn('Redis not available for DEL operation');
        return;
      }

      await this.client!.del(key);
      logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isReady()) {
        return false;
      }

      const exists = await this.client!.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs: { [key: string]: string }): Promise<void> {
    try {
      if (!this.isReady()) {
        logger.warn('Redis not available for MSET operation');
        return;
      }

      const args: string[] = [];
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        args.push(key, value);
      });

      await this.client!.mset(...args);
      logger.debug(`Cache MSET: ${Object.keys(keyValuePairs).length} keys`);
    } catch (error) {
      logger.error('Redis MSET error:', error);
    }
  }

  /**
   * Get multiple values at once
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      if (!this.isReady()) {
        logger.warn('Redis not available for MGET operation');
        return new Array(keys.length).fill(null);
      }

      const values = await this.client!.mget(...keys);
      logger.debug(`Cache MGET: ${keys.length} keys`);
      return values;
    } catch (error) {
      logger.error('Redis MGET error:', error);
      return new Array(keys.length).fill(null);
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      if (!this.isReady()) {
        return 0;
      }

      const value = await this.client!.incr(key);
      return value;
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, seconds: number): Promise<void> {
    try {
      if (!this.isReady()) {
        return;
      }

      await this.client!.expire(key, seconds);
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
    }
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.isReady()) {
        return [];
      }

      const keys = await this.client!.keys(pattern);
      return keys;
    } catch (error) {
      logger.error(`Redis KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      if (!this.isReady()) {
        return 0;
      }

      const keys = await this.client!.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const deletedCount = await this.client!.del(...keys);
      logger.debug(`Cache DEL pattern ${pattern}: ${deletedCount} keys deleted`);
      return deletedCount;
    } catch (error) {
      logger.error(`Redis DELETE_PATTERN error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Hash operations
   */
  async hset(key: string, field: string, value: string): Promise<void> {
    try {
      if (!this.isReady()) {
        return;
      }

      await this.client!.hset(key, field, value);
    } catch (error) {
      logger.error(`Redis HSET error for key ${key}, field ${field}:`, error);
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      if (!this.isReady()) {
        return null;
      }

      return await this.client!.hget(key, field);
    } catch (error) {
      logger.error(`Redis HGET error for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  async hgetall(key: string): Promise<{ [key: string]: string }> {
    try {
      if (!this.isReady()) {
        return {};
      }

      return await this.client!.hgetall(key);
    } catch (error) {
      logger.error(`Redis HGETALL error for key ${key}:`, error);
      return {};
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    try {
      if (!this.isReady()) {
        return;
      }

      await this.client!.hdel(key, field);
    } catch (error) {
      logger.error(`Redis HDEL error for key ${key}, field ${field}:`, error);
    }
  }

  /**
   * List operations
   */
  async lpush(key: string, value: string): Promise<number> {
    try {
      if (!this.isReady()) {
        return 0;
      }

      return await this.client!.lpush(key, value);
    } catch (error) {
      logger.error(`Redis LPUSH error for key ${key}:`, error);
      return 0;
    }
  }

  async rpop(key: string): Promise<string | null> {
    try {
      if (!this.isReady()) {
        return null;
      }

      return await this.client!.rpop(key);
    } catch (error) {
      logger.error(`Redis RPOP error for key ${key}:`, error);
      return null;
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      if (!this.isReady()) {
        return [];
      }

      return await this.client!.lrange(key, start, stop);
    } catch (error) {
      logger.error(`Redis LRANGE error for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Set operations
   */
  async sadd(key: string, member: string): Promise<number> {
    try {
      if (!this.isReady()) {
        return 0;
      }

      return await this.client!.sadd(key, member);
    } catch (error) {
      logger.error(`Redis SADD error for key ${key}:`, error);
      return 0;
    }
  }

  async srem(key: string, member: string): Promise<number> {
    try {
      if (!this.isReady()) {
        return 0;
      }

      return await this.client!.srem(key, member);
    } catch (error) {
      logger.error(`Redis SREM error for key ${key}:`, error);
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      if (!this.isReady()) {
        return [];
      }

      return await this.client!.smembers(key);
    } catch (error) {
      logger.error(`Redis SMEMBERS error for key ${key}:`, error);
      return [];
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    try {
      if (!this.isReady()) {
        return false;
      }

      const result = await this.client!.sismember(key, member);
      return result === 1;
    } catch (error) {
      logger.error(`Redis SISMEMBER error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Pub/Sub operations
   */
  async publish(channel: string, message: string): Promise<number> {
    try {
      if (!this.publisher) {
        logger.warn('Redis publisher not available');
        return 0;
      }

      const recipients = await this.publisher.publish(channel, message);
      logger.debug(`Published to ${channel}: ${recipients} recipients`);
      return recipients;
    } catch (error) {
      logger.error(`Redis PUBLISH error for channel ${channel}:`, error);
      return 0;
    }
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    try {
      if (!this.subscriber) {
        logger.warn('Redis subscriber not available');
        return;
      }

      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          callback(message);
        }
      });

      logger.debug(`Subscribed to channel: ${channel}`);
    } catch (error) {
      logger.error(`Redis SUBSCRIBE error for channel ${channel}:`, error);
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    try {
      if (!this.subscriber) {
        return;
      }

      await this.subscriber.unsubscribe(channel);
      logger.debug(`Unsubscribed from channel: ${channel}`);
    } catch (error) {
      logger.error(`Redis UNSUBSCRIBE error for channel ${channel}:`, error);
    }
  }

  /**
   * Cache management utilities
   */
  async flushUserCache(userId: string): Promise<void> {
    const patterns = [
      `user:${userId}`,
      `user:*:${userId}`,
      `session:${userId}:*`,
      `refresh_token:${userId}`
    ];

    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }

    logger.debug(`Flushed cache for user: ${userId}`);
  }

  async flushWorkspaceCache(workspaceId: string): Promise<void> {
    const patterns = [
      `workspace:${workspaceId}:*`,
      `sermons:workspace:${workspaceId}`,
      `series:workspace:${workspaceId}`,
      `users:workspace:${workspaceId}`
    ];

    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }

    logger.debug(`Flushed cache for workspace: ${workspaceId}`);
  }

  /**
   * Session management
   */
  async setSession(sessionId: string, data: any, ttl = 3600): Promise<void> {
    const key = `session:${sessionId}`;
    await this.set(key, JSON.stringify(data), ttl);
  }

  async getSession(sessionId: string): Promise<any> {
    const key = `session:${sessionId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.del(key);
  }

  /**
   * Rate limiting helpers
   */
  async incrementCounter(key: string, ttl = 3600): Promise<number> {
    try {
      if (!this.isReady()) {
        return 0;
      }

      const pipeline = this.client!.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, ttl);
      
      const results = await pipeline.exec();
      return results?.[0]?.[1] as number || 0;
    } catch (error) {
      logger.error(`Redis counter increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; latency?: number }> {
    try {
      if (!this.isReady()) {
        return { status: 'disconnected' };
      }

      const start = Date.now();
      await this.client!.ping();
      const latency = Date.now() - start;

      return { 
        status: 'healthy', 
        latency 
      };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return { status: 'error' };
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
      }
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      if (this.publisher) {
        await this.publisher.quit();
      }

      this.isConnected = false;
      logger.info('Redis connections closed');
    } catch (error) {
      logger.error('Error closing Redis connections:', error);
    }
  }
}

// Export singleton instance methods
export const {
  initialize,
  get,
  set,
  del,
  exists,
  mset,
  mget,
  incr,
  expire,
  keys,
  deletePattern,
  hset,
  hget,
  hgetall,
  hdel,
  lpush,
  rpop,
  lrange,
  sadd,
  srem,
  smembers,
  sismember,
  publish,
  subscribe,
  unsubscribe,
  flushUserCache,
  flushWorkspaceCache,
  setSession,
  getSession,
  deleteSession,
  incrementCounter,
  healthCheck,
  close,
  getClient
} = RedisService.getInstance();