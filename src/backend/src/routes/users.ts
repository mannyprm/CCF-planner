import { Router, Request, Response } from 'express';
import { 
  AuthenticatedRequest,
  User,
  CreateUserRequest,
  UserQueryParams,
  ApiResponse,
  PaginationInfo,
  UserRole
} from '../types';
import { 
  validate, 
  createUserSchema, 
  updateUserSchema,
  userQuerySchema
} from '../middleware/validation';
import { 
  requireRole, 
  requireWorkspaceAccess 
} from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { DatabaseService } from '../services/database';
import { RedisService } from '../services/redis';
import { logger } from '../utils/logger';
import { 
  NotFoundError, 
  ConflictError, 
  BusinessLogicError,
  AuthorizationError 
} from '../types';
import admin from 'firebase-admin';

const router = Router();

/**
 * GET /api/v1/users
 * Get all users with pagination and filtering
 */
router.get('/',
  requireRole([UserRole.ADMIN, UserRole.PASTOR]),
  validate(userQuerySchema, 'query'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const {
      page,
      limit,
      role,
      is_active,
      search,
      sort_by,
      sort_order
    } = req.query as UserQueryParams;

    // Build WHERE conditions
    const conditions = ['u.workspace_id = $1'];
    const params = [user.workspace_id];
    let paramIndex = 2;

    if (role) {
      conditions.push(`u.role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (is_active !== undefined) {
      conditions.push(`u.is_active = $${paramIndex}`);
      params.push(is_active);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(
        u.display_name ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex} OR
        u.phone ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Calculate offset
    const offset = (page! - 1) * limit!;

    // Build the main query
    const query = `
      SELECT 
        u.id, u.email, u.display_name, u.role, u.workspace_id,
        u.is_active, u.profile_picture, u.phone, u.preferences,
        u.created_at, u.updated_at, u.last_login,
        -- Statistics
        (SELECT COUNT(*) FROM sermons s WHERE s.speaker_id = u.id) as sermon_count,
        (SELECT COUNT(*) FROM sermons s WHERE s.created_by = u.id) as created_sermon_count,
        (SELECT COUNT(*) FROM assignments a WHERE a.assigned_to = u.id) as assignment_count,
        (SELECT COUNT(*) FROM assignments a WHERE a.assigned_by = u.id) as assigned_count
      FROM users u
      WHERE ${conditions.join(' AND ')}
      ORDER BY u.${sort_by} ${sort_order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE ${conditions.join(' AND ')}
    `;

    const [usersResult, countResult] = await Promise.all([
      DatabaseService.query(query, params),
      DatabaseService.query(countQuery, params.slice(0, -2)) // Remove limit and offset
    ]);

    const users = usersResult.rows.map(user => ({
      ...user,
      // Don't expose firebase_uid to other users
      firebase_uid: undefined
    }));
    
    const total = parseInt(countResult.rows[0].total);

    const pagination: PaginationInfo = {
      page: page!,
      limit: limit!,
      total,
      pages: Math.ceil(total / limit!),
      has_next: page! < Math.ceil(total / limit!),
      has_prev: page! > 1
    };

    const response: ApiResponse<User[]> = {
      success: true,
      data: users,
      pagination,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * GET /api/v1/users/:id
 * Get a specific user by ID
 */
router.get('/:id',
  requireRole([UserRole.ADMIN, UserRole.PASTOR]),
  requireWorkspaceAccess(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    const query = `
      SELECT 
        u.id, u.email, u.display_name, u.role, u.workspace_id,
        u.is_active, u.profile_picture, u.phone, u.preferences,
        u.created_at, u.updated_at, u.last_login,
        -- Workspace info
        w.name as workspace_name,
        w.church_name
      FROM users u
      LEFT JOIN workspaces w ON u.workspace_id = w.id
      WHERE u.id = $1 AND u.workspace_id = $2
    `;

    const result = await DatabaseService.query(query, [id, user.workspace_id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const userData = result.rows[0];

    // Get user's recent activity
    const activityQuery = `
      SELECT 
        'sermon_created' as activity_type,
        s.title as activity_description,
        s.created_at as activity_date
      FROM sermons s
      WHERE s.created_by = $1
      
      UNION ALL
      
      SELECT 
        'assignment_created' as activity_type,
        a.title as activity_description,
        a.created_at as activity_date
      FROM assignments a
      WHERE a.assigned_by = $1
      
      ORDER BY activity_date DESC
      LIMIT 10
    `;

    const activityResult = await DatabaseService.query(activityQuery, [id]);
    userData.recent_activity = activityResult.rows;

    // Get assignment statistics
    const assignmentStatsQuery = `
      SELECT 
        COUNT(*) as total_assignments,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_assignments,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_assignments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_assignments,
        COUNT(CASE WHEN due_date < NOW() AND status != 'completed' THEN 1 END) as overdue_assignments
      FROM assignments
      WHERE assigned_to = $1
    `;

    const assignmentStatsResult = await DatabaseService.query(assignmentStatsQuery, [id]);
    userData.assignment_stats = assignmentStatsResult.rows[0];

    const response: ApiResponse<any> = {
      success: true,
      data: userData,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * POST /api/v1/users
 * Create a new user (Admin only)
 */
router.post('/',
  requireRole([UserRole.ADMIN]),
  validate(createUserSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const userData = req.body as CreateUserRequest;

    // Check if email already exists
    const existingUserResult = await DatabaseService.query(
      'SELECT id FROM users WHERE email = $1',
      [userData.email]
    );

    if (existingUserResult.rows.length > 0) {
      throw new ConflictError('User with this email already exists');
    }

    // Validate workspace access
    if (currentUser.role !== UserRole.ADMIN && userData.workspace_id !== currentUser.workspace_id) {
      throw new AuthorizationError('Cannot create user in different workspace');
    }

    // Create Firebase user
    let firebaseUid: string;
    try {
      const firebaseUser = await admin.auth().createUser({
        email: userData.email,
        displayName: userData.display_name,
        disabled: false
      });
      firebaseUid = firebaseUser.uid;
    } catch (firebaseError) {
      logger.error('Firebase user creation failed:', firebaseError);
      throw new BusinessLogicError('Failed to create authentication account');
    }

    try {
      // Create user in database
      const query = `
        INSERT INTO users (
          firebase_uid, email, display_name, role, workspace_id,
          is_active, phone, preferences
        ) VALUES (
          $1, $2, $3, $4, $5, true, $6, $7
        ) RETURNING 
          id, email, display_name, role, workspace_id,
          is_active, profile_picture, phone, preferences,
          created_at, updated_at, last_login
      `;

      const defaultPreferences = {
        theme: 'system',
        notifications: {
          email: true,
          push: true,
          sermon_reminders: true,
          deadline_alerts: true
        },
        timezone: 'UTC',
        language: 'en',
        ...userData.preferences
      };

      const params = [
        firebaseUid,
        userData.email,
        userData.display_name,
        userData.role,
        userData.workspace_id,
        userData.phone || null,
        JSON.stringify(defaultPreferences)
      ];

      const result = await DatabaseService.query(query, params);
      const newUser = result.rows[0];

      logger.info(`User created: ${newUser.email} by ${currentUser.email}`);

      // Send welcome email (implementation depends on your email service)
      // await EmailService.sendWelcomeEmail(newUser.email, newUser.display_name);

      // Clear cache
      await RedisService.del(`users:workspace:${userData.workspace_id}`);

      const response: ApiResponse<User> = {
        success: true,
        data: newUser,
        message: 'User created successfully',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (dbError) {
      // Cleanup Firebase user if database creation fails
      try {
        await admin.auth().deleteUser(firebaseUid);
      } catch (cleanupError) {
        logger.error('Failed to cleanup Firebase user:', cleanupError);
      }
      throw dbError;
    }
  })
);

/**
 * PUT /api/v1/users/:id
 * Update a user
 */
router.put('/:id',
  validate(updateUserSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const currentUser = req.user!;
    const updateData = req.body;

    // Check if user exists and get current data
    const currentResult = await DatabaseService.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const targetUser = currentResult.rows[0];

    // Authorization checks
    const isSelfUpdate = id === currentUser.id;
    const isAdmin = currentUser.role === UserRole.ADMIN;
    const isPastor = currentUser.role === UserRole.PASTOR;
    const sameWorkspace = targetUser.workspace_id === currentUser.workspace_id;

    if (!isSelfUpdate && !isAdmin && !(isPastor && sameWorkspace)) {
      throw new AuthorizationError('Insufficient permissions to update this user');
    }

    // Role change restrictions
    if (updateData.role && updateData.role !== targetUser.role) {
      if (!isAdmin) {
        throw new AuthorizationError('Only admins can change user roles');
      }
      
      // Prevent demoting the last admin
      if (targetUser.role === UserRole.ADMIN && updateData.role !== UserRole.ADMIN) {
        const adminCountResult = await DatabaseService.query(
          'SELECT COUNT(*) as count FROM users WHERE role = $1 AND workspace_id = $2 AND is_active = true',
          [UserRole.ADMIN, targetUser.workspace_id]
        );
        
        if (parseInt(adminCountResult.rows[0].count) <= 1) {
          throw new BusinessLogicError('Cannot demote the last admin in workspace');
        }
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const params = [id];
    let paramIndex = 2;

    // Only allow certain fields for self-updates
    const allowedSelfUpdateFields = ['display_name', 'phone', 'preferences'];
    const allowedAdminUpdateFields = ['display_name', 'phone', 'preferences', 'role', 'is_active'];

    const allowedFields = isSelfUpdate ? allowedSelfUpdateFields : allowedAdminUpdateFields;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined && allowedFields.includes(key)) {
        if (key === 'preferences') {
          updateFields.push(`${key} = $${paramIndex}`);
          params.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramIndex}`);
          params.push(value);
        }
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new BusinessLogicError('No valid fields to update');
    }

    updateFields.push(`updated_at = NOW()`);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING 
        id, email, display_name, role, workspace_id,
        is_active, profile_picture, phone, preferences,
        created_at, updated_at, last_login
    `;

    const result = await DatabaseService.query(query, params);
    const updatedUser = result.rows[0];

    // Update Firebase user if display name changed
    if (updateData.display_name && updateData.display_name !== targetUser.display_name) {
      try {
        await admin.auth().updateUser(targetUser.firebase_uid, {
          displayName: updateData.display_name
        });
      } catch (firebaseError) {
        logger.error('Failed to update Firebase user:', firebaseError);
        // Don't fail the request if Firebase update fails
      }
    }

    logger.info(`User updated: ${updatedUser.email} by ${currentUser.email}`);

    // Clear cache
    await RedisService.del(`user:${targetUser.firebase_uid}`);
    await RedisService.del(`users:workspace:${targetUser.workspace_id}`);

    const response: ApiResponse<User> = {
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * DELETE /api/v1/users/:id
 * Delete a user (Admin only)
 */
router.delete('/:id',
  requireRole([UserRole.ADMIN]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const currentUser = req.user!;

    // Check if user exists
    const userResult = await DatabaseService.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const targetUser = userResult.rows[0];

    // Prevent self-deletion
    if (id === currentUser.id) {
      throw new BusinessLogicError('Cannot delete your own account');
    }

    // Prevent deleting the last admin
    if (targetUser.role === UserRole.ADMIN) {
      const adminCountResult = await DatabaseService.query(
        'SELECT COUNT(*) as count FROM users WHERE role = $1 AND workspace_id = $2 AND is_active = true',
        [UserRole.ADMIN, targetUser.workspace_id]
      );
      
      if (parseInt(adminCountResult.rows[0].count) <= 1) {
        throw new BusinessLogicError('Cannot delete the last admin in workspace');
      }
    }

    // Check for dependencies
    const dependencyChecks = await Promise.all([
      DatabaseService.query('SELECT COUNT(*) as count FROM sermons WHERE speaker_id = $1', [id]),
      DatabaseService.query('SELECT COUNT(*) as count FROM sermons WHERE created_by = $1', [id]),
      DatabaseService.query('SELECT COUNT(*) as count FROM assignments WHERE assigned_to = $1 AND status != $2', [id, 'completed']),
      DatabaseService.query('SELECT COUNT(*) as count FROM sermon_series WHERE created_by = $1', [id])
    ]);

    const [speakerCount, creatorCount, activeAssignmentCount, seriesCount] = dependencyChecks.map(
      result => parseInt(result.rows[0].count)
    );

    if (speakerCount > 0 || creatorCount > 0 || activeAssignmentCount > 0 || seriesCount > 0) {
      // Soft delete instead of hard delete to preserve data integrity
      await DatabaseService.query(
        'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );

      logger.info(`User deactivated (has dependencies): ${targetUser.email} by ${currentUser.email}`);

      const response: ApiResponse = {
        success: true,
        message: 'User deactivated due to existing data dependencies',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } else {
      // Hard delete if no dependencies
      await DatabaseService.query('DELETE FROM users WHERE id = $1', [id]);

      // Delete Firebase user
      try {
        await admin.auth().deleteUser(targetUser.firebase_uid);
      } catch (firebaseError) {
        logger.error('Failed to delete Firebase user:', firebaseError);
        // Don't fail the request if Firebase deletion fails
      }

      logger.info(`User deleted: ${targetUser.email} by ${currentUser.email}`);

      const response: ApiResponse = {
        success: true,
        message: 'User deleted successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    }

    // Clear cache
    await RedisService.del(`user:${targetUser.firebase_uid}`);
    await RedisService.del(`users:workspace:${targetUser.workspace_id}`);
  })
);

/**
 * PATCH /api/v1/users/:id/activate
 * Activate or deactivate a user (Admin only)
 */
router.patch('/:id/activate',
  requireRole([UserRole.ADMIN]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { is_active } = req.body;
    const currentUser = req.user!;

    // Check if user exists
    const userResult = await DatabaseService.query(
      'SELECT email, role, firebase_uid FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const targetUser = userResult.rows[0];

    // Prevent deactivating self
    if (id === currentUser.id && !is_active) {
      throw new BusinessLogicError('Cannot deactivate your own account');
    }

    // Prevent deactivating the last admin
    if (targetUser.role === UserRole.ADMIN && !is_active) {
      const adminCountResult = await DatabaseService.query(
        'SELECT COUNT(*) as count FROM users WHERE role = $1 AND workspace_id = $2 AND is_active = true',
        [UserRole.ADMIN, currentUser.workspace_id]
      );
      
      if (parseInt(adminCountResult.rows[0].count) <= 1) {
        throw new BusinessLogicError('Cannot deactivate the last admin in workspace');
      }
    }

    // Update user status
    const result = await DatabaseService.query(
      `UPDATE users 
       SET is_active = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING email, is_active`,
      [is_active, id]
    );

    const updatedUser = result.rows[0];

    // Update Firebase user status
    try {
      await admin.auth().updateUser(targetUser.firebase_uid, {
        disabled: !is_active
      });
    } catch (firebaseError) {
      logger.error('Failed to update Firebase user status:', firebaseError);
      // Don't fail the request if Firebase update fails
    }

    logger.info(`User ${is_active ? 'activated' : 'deactivated'}: ${updatedUser.email} by ${currentUser.email}`);

    // Clear cache
    await RedisService.del(`user:${targetUser.firebase_uid}`);

    const response: ApiResponse<{ email: string; is_active: boolean }> = {
      success: true,
      data: updatedUser,
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * GET /api/v1/users/:id/activity
 * Get user activity timeline
 */
router.get('/:id/activity',
  requireRole([UserRole.ADMIN, UserRole.PASTOR]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const currentUser = req.user!;
    const { limit = 50 } = req.query;

    // Check if user exists in same workspace
    const userResult = await DatabaseService.query(
      'SELECT id FROM users WHERE id = $1 AND workspace_id = $2',
      [id, currentUser.workspace_id]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    // Get comprehensive activity timeline
    const activityQuery = `
      SELECT 
        'sermon_created' as activity_type,
        s.title as activity_description,
        s.id as resource_id,
        s.created_at as activity_date
      FROM sermons s
      WHERE s.created_by = $1
      
      UNION ALL
      
      SELECT 
        'sermon_updated' as activity_type,
        s.title as activity_description,
        s.id as resource_id,
        s.updated_at as activity_date
      FROM sermons s
      WHERE s.created_by = $1 AND s.updated_at > s.created_at
      
      UNION ALL
      
      SELECT 
        'assignment_created' as activity_type,
        a.title as activity_description,
        a.id as resource_id,
        a.created_at as activity_date
      FROM assignments a
      WHERE a.assigned_by = $1
      
      UNION ALL
      
      SELECT 
        'assignment_completed' as activity_type,
        a.title as activity_description,
        a.id as resource_id,
        a.completed_at as activity_date
      FROM assignments a
      WHERE a.assigned_to = $1 AND a.completed_at IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'series_created' as activity_type,
        ss.title as activity_description,
        ss.id as resource_id,
        ss.created_at as activity_date
      FROM sermon_series ss
      WHERE ss.created_by = $1
      
      ORDER BY activity_date DESC
      LIMIT $2
    `;

    const result = await DatabaseService.query(activityQuery, [id, limit]);

    const response: ApiResponse<any[]> = {
      success: true,
      data: result.rows,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

export default router;