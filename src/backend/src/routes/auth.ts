import { Router, Request, Response } from 'express';
import admin from 'firebase-admin';
import { 
  AuthenticatedRequest,
  LoginRequest,
  LoginResponse,
  User,
  UserRole,
  ApiResponse
} from '../types';
import { 
  authRateLimit,
  endpointRateLimits 
} from '../middleware/rateLimiter';
import { 
  validate, 
  loginSchema, 
  refreshTokenSchema 
} from '../middleware/validation';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { DatabaseService } from '../services/database';
import { RedisService } from '../services/redis';
import { logger } from '../utils/logger';
import { 
  AuthenticationError, 
  NotFoundError, 
  ConflictError 
} from '../types';

const router = Router();

/**
 * POST /api/v1/auth/login
 * Authenticate user with Firebase token
 */
router.post('/login', 
  endpointRateLimits.login,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { firebase_token } = req.body as LoginRequest;

    try {
      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(firebase_token);
      const { uid, email, name, picture } = decodedToken;

      if (!email) {
        throw new AuthenticationError('Email is required from Firebase token');
      }

      // Check if user exists in our database
      let userResult = await DatabaseService.query(
        `SELECT 
          u.id, u.firebase_uid, u.email, u.display_name, u.role,
          u.workspace_id, u.is_active, u.profile_picture, u.phone,
          u.preferences, u.created_at, u.updated_at, u.last_login,
          w.name as workspace_name, w.is_active as workspace_active
         FROM users u 
         LEFT JOIN workspaces w ON u.workspace_id = w.id
         WHERE u.firebase_uid = $1`,
        [uid]
      );

      let user: User;

      if (userResult.rows.length === 0) {
        // New user - create account with default workspace
        const defaultWorkspace = await DatabaseService.query(
          `INSERT INTO workspaces (
            name, church_name, settings, subscription_tier, is_active
          ) VALUES (
            $1, $2, $3, 'free', true
          ) RETURNING id`,
          [
            `${name || email.split('@')[0]}'s Church`,
            `${name || email.split('@')[0]}'s Church`,
            JSON.stringify({
              time_zone: 'UTC',
              default_service_time: '10:00',
              advance_planning_weeks: 12,
              sermon_length_minutes: 30,
              allow_guest_speakers: true,
              require_approval: false,
              branding: {
                primary_color: '#3B82F6',
                secondary_color: '#1E40AF'
              }
            })
          ]
        );

        const workspaceId = defaultWorkspace.rows[0].id;

        // Create user account
        const newUserResult = await DatabaseService.query(
          `INSERT INTO users (
            firebase_uid, email, display_name, role, workspace_id, 
            is_active, profile_picture, preferences, last_login
          ) VALUES (
            $1, $2, $3, $4, $5, true, $6, $7, NOW()
          ) RETURNING 
            id, firebase_uid, email, display_name, role,
            workspace_id, is_active, profile_picture, phone,
            preferences, created_at, updated_at, last_login`,
          [
            uid,
            email,
            name || email.split('@')[0],
            UserRole.ADMIN, // First user becomes admin
            workspaceId,
            picture || null,
            JSON.stringify({
              theme: 'system',
              notifications: {
                email: true,
                push: true,
                sermon_reminders: true,
                deadline_alerts: true
              },
              timezone: 'UTC',
              language: 'en'
            })
          ]
        );

        user = newUserResult.rows[0];
        logger.info(`New user created: ${email}`);
      } else {
        user = userResult.rows[0];

        // Check if user/workspace is active
        if (!user.is_active) {
          throw new AuthenticationError('User account is disabled');
        }

        if (!userResult.rows[0].workspace_active) {
          throw new AuthenticationError('Workspace is disabled');
        }

        // Update last login
        await DatabaseService.query(
          'UPDATE users SET last_login = NOW() WHERE id = $1',
          [user.id]
        );

        logger.info(`User logged in: ${email}`);
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Store refresh token in Redis with expiration
      await RedisService.set(
        `refresh_token:${user.id}`, 
        refreshToken, 
        60 * 60 * 24 * 30 // 30 days
      );

      // Cache user data
      await RedisService.set(
        `user:${uid}`, 
        JSON.stringify(user), 
        60 * 15 // 15 minutes
      );

      const response: ApiResponse<LoginResponse> = {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            role: user.role,
            workspace_id: user.workspace_id,
            is_active: user.is_active,
            profile_picture: user.profile_picture,
            phone: user.phone,
            preferences: user.preferences,
            created_at: user.created_at,
            updated_at: user.updated_at,
            last_login: user.last_login
          },
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 3600 // 1 hour
        },
        message: 'Login successful',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Login error:', error);
      
      if (error.code === 'auth/id-token-expired') {
        throw new AuthenticationError('Firebase token expired');
      } else if (error.code === 'auth/id-token-revoked') {
        throw new AuthenticationError('Firebase token revoked');
      } else if (error.code === 'auth/argument-error') {
        throw new AuthenticationError('Invalid Firebase token format');
      }
      
      throw error;
    }
  })
);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh',
  endpointRateLimits.refreshToken,
  validate(refreshTokenSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { refresh_token } = req.body;

    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refresh_token);
      const userId = decoded.sub;

      // Check if refresh token exists in Redis
      const storedToken = await RedisService.get(`refresh_token:${userId}`);
      if (!storedToken || storedToken !== refresh_token) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      // Get user data
      const userResult = await DatabaseService.query(
        `SELECT 
          u.id, u.firebase_uid, u.email, u.display_name, u.role,
          u.workspace_id, u.is_active, u.profile_picture, u.phone,
          u.preferences, u.created_at, u.updated_at, u.last_login
         FROM users u 
         WHERE u.id = $1 AND u.is_active = true`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new AuthenticationError('User not found or inactive');
      }

      const user: User = userResult.rows[0];

      // Generate new access token
      const accessToken = generateAccessToken(user);

      const response: ApiResponse<{ access_token: string; expires_in: number }> = {
        success: true,
        data: {
          access_token: accessToken,
          expires_in: 3600 // 1 hour
        },
        message: 'Token refreshed successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  })
);

/**
 * POST /api/v1/auth/logout
 * Logout user and invalidate tokens
 */
router.post('/logout',
  endpointRateLimits.login,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Remove refresh token from Redis
      await RedisService.del(`refresh_token:${user.id}`);

      // Remove user cache
      await RedisService.del(`user:${user.firebase_uid}`);

      // Revoke Firebase tokens (optional - depends on your security requirements)
      try {
        await admin.auth().revokeRefreshTokens(user.firebase_uid);
      } catch (firebaseError) {
        logger.warn('Failed to revoke Firebase tokens:', firebaseError);
        // Don't fail the logout if Firebase revocation fails
      }

      logger.info(`User logged out: ${user.email}`);

      const response: ApiResponse = {
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  })
);

/**
 * GET /api/v1/auth/me
 * Get current user profile
 */
router.get('/me',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    // Get fresh user data with workspace info
    const userResult = await DatabaseService.query(
      `SELECT 
        u.id, u.email, u.display_name, u.role, u.workspace_id, 
        u.is_active, u.profile_picture, u.phone, u.preferences,
        u.created_at, u.updated_at, u.last_login,
        w.name as workspace_name, w.church_name,
        w.settings as workspace_settings
       FROM users u 
       LEFT JOIN workspaces w ON u.workspace_id = w.id
       WHERE u.id = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const userData = userResult.rows[0];

    const response: ApiResponse<any> = {
      success: true,
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          display_name: userData.display_name,
          role: userData.role,
          workspace_id: userData.workspace_id,
          is_active: userData.is_active,
          profile_picture: userData.profile_picture,
          phone: userData.phone,
          preferences: userData.preferences,
          created_at: userData.created_at,
          updated_at: userData.updated_at,
          last_login: userData.last_login
        },
        workspace: {
          name: userData.workspace_name,
          church_name: userData.church_name,
          settings: userData.workspace_settings
        }
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * POST /api/v1/auth/verify-token
 * Verify if the current token is valid
 */
router.post('/verify-token',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) {
      throw new AuthenticationError('Token is invalid');
    }

    const response: ApiResponse<{ valid: boolean; user_id: string }> = {
      success: true,
      data: {
        valid: true,
        user_id: user.id
      },
      message: 'Token is valid',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * POST /api/v1/auth/revoke-all-tokens
 * Revoke all tokens for the current user (security feature)
 */
router.post('/revoke-all-tokens',
  endpointRateLimits.login,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    try {
      // Remove all refresh tokens from Redis
      await RedisService.del(`refresh_token:${user.id}`);

      // Remove user cache
      await RedisService.del(`user:${user.firebase_uid}`);

      // Revoke all Firebase refresh tokens
      await admin.auth().revokeRefreshTokens(user.firebase_uid);

      logger.info(`All tokens revoked for user: ${user.email}`);

      const response: ApiResponse = {
        success: true,
        message: 'All tokens revoked successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Token revocation error:', error);
      throw error;
    }
  })
);

export default router;