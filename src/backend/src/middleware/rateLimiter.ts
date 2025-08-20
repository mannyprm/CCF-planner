import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { RedisService } from '../services/redis';
import { logger } from '../utils/logger';
import { RateLimitError } from './errorHandler';

// Initialize rate limiters
let authLimiter: RateLimiterRedis | RateLimiterMemory;
let apiLimiter: RateLimiterRedis | RateLimiterMemory;
let uploadLimiter: RateLimiterRedis | RateLimiterMemory;
let heavyOperationLimiter: RateLimiterRedis | RateLimiterMemory;

/**
 * Initialize rate limiters with Redis or fallback to memory
 */
export const initializeRateLimiters = async (): Promise<void> => {
  try {
    const redisClient = RedisService.getClient();
    
    if (redisClient) {
      // Use Redis-based rate limiters for distributed deployment
      authLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'auth_limit',
        points: 5, // Number of attempts
        duration: 900, // Per 15 minutes
        blockDuration: 900, // Block for 15 minutes
      });

      apiLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'api_limit',
        points: 1000, // Number of requests
        duration: 3600, // Per hour
        blockDuration: 3600, // Block for 1 hour
      });

      uploadLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'upload_limit',
        points: 10, // Number of uploads
        duration: 3600, // Per hour
        blockDuration: 3600, // Block for 1 hour
      });

      heavyOperationLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'heavy_op_limit',
        points: 3, // Number of operations
        duration: 3600, // Per hour
        blockDuration: 1800, // Block for 30 minutes
      });
    } else {
      throw new Error('Redis not available');
    }
  } catch (error) {
    logger.warn('Redis not available for rate limiting, falling back to memory:', error);
    
    // Fallback to memory-based rate limiters
    authLimiter = new RateLimiterMemory({
      keyPrefix: 'auth_limit',
      points: 5,
      duration: 900,
      blockDuration: 900,
    });

    apiLimiter = new RateLimiterMemory({
      keyPrefix: 'api_limit',
      points: 1000,
      duration: 3600,
      blockDuration: 3600,
    });

    uploadLimiter = new RateLimiterMemory({
      keyPrefix: 'upload_limit',
      points: 10,
      duration: 3600,
      blockDuration: 3600,
    });

    heavyOperationLimiter = new RateLimiterMemory({
      keyPrefix: 'heavy_op_limit',
      points: 3,
      duration: 3600,
      blockDuration: 1800,
    });
  }
  
  logger.info('Rate limiters initialized successfully');
};

/**
 * Get client identifier for rate limiting
 */
const getClientId = (req: Request): string => {
  // Use user ID if authenticated
  const user = (req as any).user;
  if (user) {
    return `user:${user.id}`;
  }

  // Use API key if present
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    return `api:${apiKey}`;
  }

  // Fallback to IP address
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
  return `ip:${ip}`;
};

/**
 * Generic rate limiter middleware factory
 */
const createRateLimitMiddleware = (
  limiter: RateLimiterRedis | RateLimiterMemory,
  name: string
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clientId = getClientId(req);
      await limiter.consume(clientId);
      next();
    } catch (rateLimiterRes) {
      const remainingPoints = rateLimiterRes.remainingPoints || 0;
      const msBeforeNext = rateLimiterRes.msBeforeNext || 0;
      const totalHits = rateLimiterRes.totalHits || 0;

      // Set rate limit headers
      res.set({
        'Retry-After': Math.round(msBeforeNext / 1000) || 1,
        'X-RateLimit-Limit': limiter.points,
        'X-RateLimit-Remaining': remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
      });

      logger.warn(`Rate limit exceeded for ${name}:`, {
        clientId: getClientId(req),
        totalHits,
        remainingPoints,
        msBeforeNext
      });

      const error = new RateLimitError(`Rate limit exceeded for ${name}. Try again in ${Math.round(msBeforeNext / 1000)} seconds.`);
      res.status(429).json({
        success: false,
        message: error.message,
        retry_after: Math.round(msBeforeNext / 1000),
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Authentication rate limiter (stricter limits)
 */
export const authRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  if (!authLimiter) {
    next();
    return;
  }
  createRateLimitMiddleware(authLimiter, 'authentication')(req, res, next);
};

/**
 * General API rate limiter
 */
export const apiRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  if (!apiLimiter) {
    next();
    return;
  }
  createRateLimitMiddleware(apiLimiter, 'API')(req, res, next);
};

/**
 * File upload rate limiter
 */
export const uploadRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  if (!uploadLimiter) {
    next();
    return;
  }
  createRateLimitMiddleware(uploadLimiter, 'file upload')(req, res, next);
};

/**
 * Heavy operations rate limiter (exports, bulk operations)
 */
export const heavyOperationRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  if (!heavyOperationLimiter) {
    next();
    return;
  }
  createRateLimitMiddleware(heavyOperationLimiter, 'heavy operation')(req, res, next);
};

/**
 * Custom rate limiter for specific endpoints
 */
export const createCustomRateLimit = (
  points: number,
  duration: number,
  blockDuration?: number
) => {
  const customLimiter = RedisService.getClient() 
    ? new RateLimiterRedis({
        storeClient: RedisService.getClient(),
        keyPrefix: 'custom_limit',
        points,
        duration,
        blockDuration: blockDuration || duration,
      })
    : new RateLimiterMemory({
        keyPrefix: 'custom_limit',
        points,
        duration,
        blockDuration: blockDuration || duration,
      });

  return createRateLimitMiddleware(customLimiter, 'custom operation');
};

/**
 * Skip rate limiting for certain conditions
 */
export const skipRateLimit = (
  condition: (req: Request) => boolean
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (condition(req)) {
      next();
    } else {
      apiRateLimit(req, res, next);
    }
  };
};

/**
 * Whitelist IP addresses or user roles from rate limiting
 */
export const createWhitelistMiddleware = (
  whitelist: {
    ips?: string[];
    roles?: string[];
    apiKeys?: string[];
  }
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    const clientIp = req.connection.remoteAddress;
    const apiKey = req.headers['x-api-key'] as string;

    // Check IP whitelist
    if (whitelist.ips && whitelist.ips.includes(clientIp)) {
      next();
      return;
    }

    // Check role whitelist
    if (whitelist.roles && user && whitelist.roles.includes(user.role)) {
      next();
      return;
    }

    // Check API key whitelist
    if (whitelist.apiKeys && apiKey && whitelist.apiKeys.includes(apiKey)) {
      next();
      return;
    }

    // Apply rate limiting
    apiRateLimit(req, res, next);
  };
};

/**
 * Progressive rate limiting based on user behavior
 */
export const createProgressiveRateLimit = (basePoints: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clientId = getClientId(req);
      const user = (req as any).user;
      
      // Adjust points based on user role
      let points = basePoints;
      if (user) {
        switch (user.role) {
          case 'admin':
            points *= 5; // Admin gets 5x the limit
            break;
          case 'pastor':
            points *= 3; // Pastor gets 3x the limit
            break;
          case 'volunteer':
            points *= 2; // Volunteer gets 2x the limit
            break;
          default:
            // Default limit for viewers
            break;
        }
      }

      const progressiveLimiter = RedisService.getClient()
        ? new RateLimiterRedis({
            storeClient: RedisService.getClient(),
            keyPrefix: 'progressive_limit',
            points,
            duration: 3600,
            blockDuration: 3600,
          })
        : new RateLimiterMemory({
            keyPrefix: 'progressive_limit',
            points,
            duration: 3600,
            blockDuration: 3600,
          });

      await progressiveLimiter.consume(clientId);
      next();
    } catch (rateLimiterRes) {
      const msBeforeNext = rateLimiterRes.msBeforeNext || 0;
      
      res.set({
        'Retry-After': Math.round(msBeforeNext / 1000) || 1,
        'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
      });

      const error = new RateLimitError(`Rate limit exceeded. Try again in ${Math.round(msBeforeNext / 1000)} seconds.`);
      res.status(429).json({
        success: false,
        message: error.message,
        retry_after: Math.round(msBeforeNext / 1000),
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Rate limiting for specific endpoints
 */
export const endpointRateLimits = {
  // Authentication endpoints
  login: authRateLimit,
  register: authRateLimit,
  refreshToken: authRateLimit,
  
  // General API
  api: apiRateLimit,
  
  // File operations
  upload: uploadRateLimit,
  
  // Heavy operations
  export: heavyOperationRateLimit,
  bulkOperation: heavyOperationRateLimit,
  
  // Progressive limiting
  userActions: createProgressiveRateLimit(100),
  
  // Custom limits for specific endpoints
  search: createCustomRateLimit(50, 60), // 50 searches per minute
  emailNotification: createCustomRateLimit(10, 3600), // 10 emails per hour
};

// Export the main rate limiter for backwards compatibility
export const rateLimiter = apiRateLimit;