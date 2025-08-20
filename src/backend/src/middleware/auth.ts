import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { 
  AuthenticatedRequest, 
  User, 
  UserRole, 
  AuthenticationError, 
  AuthorizationError 
} from '../types';
import { DatabaseService } from '../services/database';
import { RedisService } from '../services/redis';
import { logger } from '../utils/logger';

/**
 * Firebase Authentication Middleware
 * Verifies Firebase ID tokens and attaches user to request
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Authorization header missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // Check Redis cache first for performance
    const cacheKey = `user:${firebaseUid}`;
    const cachedUser = await RedisService.get(cacheKey);
    
    let user: User;

    if (cachedUser) {
      user = JSON.parse(cachedUser);
      logger.debug(`User loaded from cache: ${user.email}`);
    } else {
      // Fetch user from database
      const dbUser = await DatabaseService.query(
        `SELECT 
          u.id, u.firebase_uid, u.email, u.display_name, u.role,
          u.workspace_id, u.is_active, u.profile_picture, u.phone,
          u.preferences, u.created_at, u.updated_at, u.last_login
         FROM users u 
         WHERE u.firebase_uid = $1 AND u.is_active = true`,
        [firebaseUid]
      );

      if (!dbUser.rows.length) {
        throw new AuthenticationError('User not found or inactive');
      }

      user = dbUser.rows[0];

      // Cache user for 15 minutes
      await RedisService.set(cacheKey, JSON.stringify(user), 900);
      logger.debug(`User loaded from database: ${user.email}`);
    }

    // Update last login timestamp (async, don't await)
    DatabaseService.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    ).catch(error => {
      logger.error('Failed to update last login:', error);
    });

    // Attach user to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof AuthenticationError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Role-based authorization middleware factory
 * @param allowedRoles Array of roles that can access the endpoint
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AuthorizationError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      
      const statusCode = error instanceof AuthorizationError ? 403 : 401;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Workspace access control middleware
 * Ensures user can only access resources from their workspace
 */
export const requireWorkspaceAccess = (paramName = 'workspaceId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const workspaceId = req.params[paramName] || req.body.workspace_id || req.query.workspace_id;
      
      if (workspaceId && workspaceId !== req.user.workspace_id) {
        // Admin users can access all workspaces
        if (req.user.role !== UserRole.ADMIN) {
          throw new AuthorizationError('Access denied to this workspace');
        }
      }

      next();
    } catch (error) {
      logger.error('Workspace access error:', error);
      
      const statusCode = error instanceof AuthorizationError ? 403 : 401;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Resource ownership middleware
 * Ensures users can only modify resources they created (unless admin/pastor)
 */
export const requireOwnership = (resourceType: string, idParam = 'id') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Admin and Pastor roles can modify any resource
      if ([UserRole.ADMIN, UserRole.PASTOR].includes(req.user.role)) {
        next();
        return;
      }

      const resourceId = req.params[idParam];
      if (!resourceId) {
        throw new AuthorizationError('Resource ID required');
      }

      // Check resource ownership based on type
      let query: string;
      switch (resourceType) {
        case 'sermon':
          query = 'SELECT created_by FROM sermons WHERE id = $1 AND workspace_id = $2';
          break;
        case 'series':
          query = 'SELECT created_by FROM sermon_series WHERE id = $1 AND workspace_id = $2';
          break;
        case 'assignment':
          query = 'SELECT assigned_to, assigned_by FROM assignments WHERE id = $1';
          break;
        default:
          throw new Error(`Unknown resource type: ${resourceType}`);
      }

      const result = await DatabaseService.query(query, [resourceId, req.user.workspace_id]);
      
      if (!result.rows.length) {
        throw new AuthorizationError('Resource not found or access denied');
      }

      const resource = result.rows[0];
      
      // Check ownership based on resource type
      let hasAccess = false;
      if (resourceType === 'assignment') {
        // For assignments, user can modify if they're assigned to it or assigned it
        hasAccess = resource.assigned_to === req.user.id || resource.assigned_by === req.user.id;
      } else {
        // For other resources, user must be the creator
        hasAccess = resource.created_by === req.user.id;
      }

      if (!hasAccess) {
        throw new AuthorizationError('You can only modify resources you created');
      }

      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      
      const statusCode = error instanceof AuthorizationError ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * API Key authentication middleware (for external integrations)
 */
export const apiKeyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      throw new AuthenticationError('API key required');
    }

    // Verify API key against database
    const result = await DatabaseService.query(
      `SELECT w.*, ak.permissions 
       FROM api_keys ak 
       JOIN workspaces w ON ak.workspace_id = w.id 
       WHERE ak.key_hash = $1 AND ak.is_active = true AND ak.expires_at > NOW()`,
      [apiKey] // In production, this should be hashed
    );

    if (!result.rows.length) {
      throw new AuthenticationError('Invalid or expired API key');
    }

    const { workspace_id, permissions } = result.rows[0];
    
    // Attach workspace info to request for API key requests
    (req as any).workspace = { id: workspace_id, permissions };

    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    
    res.status(401).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Generate JWT access token for authenticated users
 */
export const generateAccessToken = (user: User): string => {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    workspace_id: user.workspace_id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    issuer: 'ccf-sermon-planner',
    audience: 'ccf-api-users'
  });
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (user: User): string => {
  const payload = {
    sub: user.id,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30), // 30 days
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    issuer: 'ccf-sermon-planner',
    audience: 'ccf-api-users'
  });
};

/**
 * Verify JWT token
 */
export const verifyAccessToken = (token: string): any => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!, {
      issuer: 'ccf-sermon-planner',
      audience: 'ccf-api-users'
    });
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): any => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!, {
      issuer: 'ccf-sermon-planner',
      audience: 'ccf-api-users'
    });

    if ((decoded as any).type !== 'refresh') {
      throw new AuthenticationError('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }
};