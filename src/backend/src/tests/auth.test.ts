import request from 'supertest';
import { DatabaseService } from '../services/database';
import { RedisService } from '../services/redis';
import { FirebaseService } from '../services/firebase';
import admin from 'firebase-admin';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    revokeRefreshTokens: jest.fn(),
  })),
  initializeApp: jest.fn(),
}));

// Mock services
jest.mock('../services/database');
jest.mock('../services/redis');
jest.mock('../services/firebase');

describe('Authentication Routes', () => {
  let app: any;
  const mockFirebaseAuth = admin.auth() as jest.Mocked<admin.auth.Auth>;

  beforeAll(async () => {
    // Import app after mocks are set up
    const { app: testApp } = await import('../index');
    app = testApp;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    const validFirebaseToken = 'valid-firebase-token';
    const mockFirebaseUser = {
      uid: 'firebase-uid-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg'
    };

    beforeEach(() => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValue(mockFirebaseUser as any);
    });

    it('should login existing user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        firebase_uid: 'firebase-uid-123',
        email: 'test@example.com',
        display_name: 'Test User',
        role: 'admin',
        workspace_id: 'workspace-123',
        is_active: true,
        profile_picture: 'https://example.com/avatar.jpg',
        phone: null,
        preferences: {
          theme: 'system',
          notifications: {
            email: true,
            push: true,
            sermon_reminders: true,
            deadline_alerts: true
          },
          timezone: 'UTC',
          language: 'en'
        },
        created_at: new Date(),
        updated_at: new Date(),
        last_login: new Date()
      };

      const mockWorkspace = {
        name: 'Test Church',
        is_active: true
      };

      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ ...mockUser, workspace_active: true }] }) // User lookup
        .mockResolvedValueOnce({ rows: [] }); // Update last login

      (RedisService.set as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ firebase_token: validFirebaseToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();
      expect(response.body.data.expires_in).toBe(3600);

      // Verify Firebase token was verified
      expect(mockFirebaseAuth.verifyIdToken).toHaveBeenCalledWith(validFirebaseToken);

      // Verify user was cached
      expect(RedisService.set).toHaveBeenCalledWith(
        `user:${mockFirebaseUser.uid}`,
        expect.any(String),
        900
      );
    });

    it('should create new user on first login', async () => {
      const newUserId = 'new-user-123';
      const workspaceId = 'new-workspace-123';

      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // User not found
        .mockResolvedValueOnce({ rows: [{ id: workspaceId }] }) // Create workspace
        .mockResolvedValueOnce({ rows: [{ 
          id: newUserId,
          firebase_uid: mockFirebaseUser.uid,
          email: mockFirebaseUser.email,
          display_name: mockFirebaseUser.name,
          role: 'admin',
          workspace_id: workspaceId,
          is_active: true,
          profile_picture: mockFirebaseUser.picture,
          phone: null,
          preferences: expect.any(Object),
          created_at: new Date(),
          updated_at: new Date(),
          last_login: new Date()
        }] }); // Create user

      (RedisService.set as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ firebase_token: validFirebaseToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(mockFirebaseUser.email);
      expect(response.body.data.user.role).toBe('admin'); // First user becomes admin

      // Verify workspace and user were created
      expect(DatabaseService.query).toHaveBeenCalledTimes(3);
    });

    it('should reject invalid firebase token', async () => {
      mockFirebaseAuth.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ firebase_token: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Authentication failed');
    });

    it('should reject login for inactive user', async () => {
      const inactiveUser = {
        id: 'user-123',
        is_active: false,
        workspace_active: true
      };

      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [inactiveUser] });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ firebase_token: validFirebaseToken })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User account is disabled');
    });

    it('should reject login for inactive workspace', async () => {
      const userWithInactiveWorkspace = {
        id: 'user-123',
        is_active: true,
        workspace_active: false
      };

      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [userWithInactiveWorkspace] });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ firebase_token: validFirebaseToken })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Workspace is disabled');
    });

    it('should handle missing email in firebase token', async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValue({
        uid: 'firebase-uid-123',
        email: undefined // Missing email
      } as any);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ firebase_token: validFirebaseToken })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email is required from Firebase token');
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({}) // Missing firebase_token
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'firebase_token',
            message: expect.stringContaining('required')
          })
        ])
      );
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token successfully', async () => {
      const userId = 'user-123';
      const refreshToken = 'valid-refresh-token';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        role: 'pastor',
        workspace_id: 'workspace-123',
        is_active: true
      };

      // Mock JWT verification
      jest.doMock('jsonwebtoken', () => ({
        verify: jest.fn().mockReturnValue({ sub: userId, type: 'refresh' }),
        sign: jest.fn().mockReturnValue('new-access-token')
      }));

      (RedisService.get as jest.Mock).mockResolvedValue(refreshToken);
      (DatabaseService.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.expires_in).toBe(3600);
    });

    it('should reject invalid refresh token', async () => {
      (RedisService.get as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired refresh token');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        firebase_uid: 'firebase-uid-123',
        email: 'test@example.com'
      };

      // Mock authenticated request
      const authMiddleware = jest.fn((req, res, next) => {
        req.user = mockUser;
        next();
      });

      (RedisService.del as jest.Mock).mockResolvedValue(undefined);
      mockFirebaseAuth.revokeRefreshTokens.mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');

      // Verify tokens were removed
      expect(RedisService.del).toHaveBeenCalledWith(`refresh_token:${mockUser.id}`);
      expect(RedisService.del).toHaveBeenCalledWith(`user:${mockUser.firebase_uid}`);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Test User',
        role: 'pastor',
        workspace_id: 'workspace-123'
      };

      const mockUserWithWorkspace = {
        ...mockUser,
        workspace_name: 'Test Church',
        church_name: 'Test Church',
        workspace_settings: { timezone: 'UTC' }
      };

      (DatabaseService.query as jest.Mock).mockResolvedValue({ 
        rows: [mockUserWithWorkspace] 
      });

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(mockUser.email);
      expect(response.body.data.workspace.name).toBe('Test Church');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/verify-token', () => {
    it('should verify valid token', async () => {
      const mockUser = { id: 'user-123' };

      const response = await request(app)
        .post('/api/v1/auth/verify-token')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-token')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/revoke-all-tokens', () => {
    it('should revoke all tokens successfully', async () => {
      const mockUser = {
        id: 'user-123',
        firebase_uid: 'firebase-uid-123',
        email: 'test@example.com'
      };

      (RedisService.del as jest.Mock).mockResolvedValue(undefined);
      mockFirebaseAuth.revokeRefreshTokens.mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/auth/revoke-all-tokens')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('All tokens revoked successfully');

      // Verify Firebase tokens were revoked
      expect(mockFirebaseAuth.revokeRefreshTokens).toHaveBeenCalledWith(mockUser.firebase_uid);
    });
  });

  describe('Rate limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      // Mock rate limiter to reject
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimiterError';

      // Make multiple requests to trigger rate limit
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({ firebase_token: 'test-token' });
      }

      // The 6th request should be rate limited (limit is 5)
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ firebase_token: 'test-token' })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Rate limit exceeded');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValue({
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        name: 'Test User'
      } as any);

      (DatabaseService.query as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ firebase_token: 'valid-token' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValue({
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        name: 'Test User'
      } as any);

      const mockUser = {
        id: 'user-123',
        firebase_uid: 'firebase-uid-123',
        email: 'test@example.com',
        workspace_active: true,
        is_active: true
      };

      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] });

      (RedisService.set as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ firebase_token: 'valid-token' })
        .expect(200); // Should still succeed even if Redis fails

      expect(response.body.success).toBe(true);
    });
  });
});