import { Router, Request, Response } from 'express';
import { 
  AuthenticatedRequest,
  Sermon,
  CreateSermonRequest,
  UpdateSermonRequest,
  SermonQueryParams,
  ApiResponse,
  PaginationInfo,
  UserRole,
  SermonStatus
} from '../types';
import { 
  validate, 
  createSermonSchema, 
  updateSermonSchema,
  sermonQuerySchema,
  validateDateRange,
  validateFutureDate
} from '../middleware/validation';
import { 
  requireRole, 
  requireWorkspaceAccess, 
  requireOwnership 
} from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { DatabaseService } from '../services/database';
import { RedisService } from '../services/redis';
import { logger } from '../utils/logger';
import { 
  NotFoundError, 
  ConflictError, 
  BusinessLogicError 
} from '../types';

const router = Router();

/**
 * GET /api/v1/sermons
 * Get all sermons with pagination and filtering
 */
router.get('/',
  validate(sermonQuerySchema, 'query'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const {
      page,
      limit,
      series_id,
      speaker_id,
      status,
      service_date_from,
      service_date_to,
      search,
      tags,
      sort_by,
      sort_order
    } = req.query as SermonQueryParams;

    // Build WHERE conditions
    const conditions = ['s.workspace_id = $1'];
    const params = [user.workspace_id];
    let paramIndex = 2;

    if (series_id) {
      conditions.push(`s.series_id = $${paramIndex}`);
      params.push(series_id);
      paramIndex++;
    }

    if (speaker_id) {
      conditions.push(`s.speaker_id = $${paramIndex}`);
      params.push(speaker_id);
      paramIndex++;
    }

    if (status) {
      conditions.push(`s.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (service_date_from) {
      conditions.push(`s.service_date >= $${paramIndex}`);
      params.push(service_date_from);
      paramIndex++;
    }

    if (service_date_to) {
      conditions.push(`s.service_date <= $${paramIndex}`);
      params.push(service_date_to);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(
        s.title ILIKE $${paramIndex} OR 
        s.subtitle ILIKE $${paramIndex} OR 
        s.description ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      conditions.push(`s.tags && $${paramIndex}`);
      params.push(tagArray);
      paramIndex++;
    }

    // Calculate offset
    const offset = (page! - 1) * limit!;

    // Build the main query
    const query = `
      SELECT 
        s.id, s.workspace_id, s.series_id, s.title, s.subtitle,
        s.speaker_id, s.service_date, s.service_time, s.duration_minutes,
        s.status, s.sermon_type, s.scripture_references, s.main_points,
        s.target_audience, s.description, s.notes, s.preparation_status,
        s.tags, s.is_published, s.published_at, s.created_by,
        s.created_at, s.updated_at,
        -- Speaker info
        speaker.display_name as speaker_name,
        speaker.email as speaker_email,
        -- Series info
        series.title as series_title,
        series.color_theme as series_color,
        -- Resource count
        (SELECT COUNT(*) FROM sermon_resources sr WHERE sr.sermon_id = s.id) as resource_count,
        -- Assignment count
        (SELECT COUNT(*) FROM assignments a WHERE a.sermon_id = s.id) as assignment_count
      FROM sermons s
      LEFT JOIN users speaker ON s.speaker_id = speaker.id
      LEFT JOIN sermon_series series ON s.series_id = series.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.${sort_by} ${sort_order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM sermons s
      WHERE ${conditions.join(' AND ')}
    `;

    const [sermonsResult, countResult] = await Promise.all([
      DatabaseService.query(query, params),
      DatabaseService.query(countQuery, params.slice(0, -2)) // Remove limit and offset
    ]);

    const sermons = sermonsResult.rows;
    const total = parseInt(countResult.rows[0].total);

    const pagination: PaginationInfo = {
      page: page!,
      limit: limit!,
      total,
      pages: Math.ceil(total / limit!),
      has_next: page! < Math.ceil(total / limit!),
      has_prev: page! > 1
    };

    const response: ApiResponse<Sermon[]> = {
      success: true,
      data: sermons,
      pagination,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * GET /api/v1/sermons/:id
 * Get a specific sermon by ID
 */
router.get('/:id',
  requireWorkspaceAccess(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    const query = `
      SELECT 
        s.*,
        -- Speaker info
        speaker.display_name as speaker_name,
        speaker.email as speaker_email,
        speaker.profile_picture as speaker_picture,
        -- Series info
        series.title as series_title,
        series.description as series_description,
        series.color_theme as series_color,
        -- Creator info
        creator.display_name as created_by_name
      FROM sermons s
      LEFT JOIN users speaker ON s.speaker_id = speaker.id
      LEFT JOIN sermon_series series ON s.series_id = series.id
      LEFT JOIN users creator ON s.created_by = creator.id
      WHERE s.id = $1 AND s.workspace_id = $2
    `;

    const result = await DatabaseService.query(query, [id, user.workspace_id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Sermon not found');
    }

    const sermon = result.rows[0];

    // Get resources
    const resourcesResult = await DatabaseService.query(
      `SELECT sr.*, u.display_name as uploaded_by_name
       FROM sermon_resources sr
       LEFT JOIN users u ON sr.uploaded_by = u.id
       WHERE sr.sermon_id = $1
       ORDER BY sr.created_at DESC`,
      [id]
    );

    // Get assignments
    const assignmentsResult = await DatabaseService.query(
      `SELECT a.*, 
        assigned_user.display_name as assigned_to_name,
        assigned_user.email as assigned_to_email,
        assigner.display_name as assigned_by_name
       FROM assignments a
       LEFT JOIN users assigned_user ON a.assigned_to = assigned_user.id
       LEFT JOIN users assigner ON a.assigned_by = assigner.id
       WHERE a.sermon_id = $1
       ORDER BY a.due_date ASC`,
      [id]
    );

    sermon.resources = resourcesResult.rows;
    sermon.assignments = assignmentsResult.rows;

    const response: ApiResponse<Sermon> = {
      success: true,
      data: sermon,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * POST /api/v1/sermons
 * Create a new sermon
 */
router.post('/',
  requireRole([UserRole.ADMIN, UserRole.PASTOR, UserRole.VOLUNTEER]),
  validate(createSermonSchema),
  validateDateRange,
  validateFutureDate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const sermonData = req.body as CreateSermonRequest;

    // Check if series exists and belongs to workspace
    if (sermonData.series_id) {
      const seriesResult = await DatabaseService.query(
        'SELECT id FROM sermon_series WHERE id = $1 AND workspace_id = $2',
        [sermonData.series_id, user.workspace_id]
      );

      if (seriesResult.rows.length === 0) {
        throw new NotFoundError('Series not found');
      }
    }

    // Check if speaker exists and belongs to workspace
    const speakerResult = await DatabaseService.query(
      'SELECT id FROM users WHERE id = $1 AND workspace_id = $2',
      [sermonData.speaker_id, user.workspace_id]
    );

    if (speakerResult.rows.length === 0) {
      throw new NotFoundError('Speaker not found');
    }

    // Check for scheduling conflicts
    const conflictResult = await DatabaseService.query(
      `SELECT id, title FROM sermons 
       WHERE service_date = $1 AND service_time = $2 AND workspace_id = $3 AND id != $4`,
      [sermonData.service_date, sermonData.service_time, user.workspace_id, 'new']
    );

    if (conflictResult.rows.length > 0) {
      throw new ConflictError(
        `Another sermon "${conflictResult.rows[0].title}" is already scheduled for this time`
      );
    }

    // Create sermon
    const query = `
      INSERT INTO sermons (
        workspace_id, series_id, title, subtitle, speaker_id,
        service_date, service_time, duration_minutes, sermon_type,
        scripture_references, main_points, target_audience,
        description, notes, tags, status, created_by,
        preparation_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING *
    `;

    const preparationStatus = {
      outline_complete: false,
      research_complete: false,
      slides_complete: false,
      notes_complete: false,
      practice_complete: false,
      last_updated: new Date()
    };

    const params = [
      user.workspace_id,
      sermonData.series_id || null,
      sermonData.title,
      sermonData.subtitle || null,
      sermonData.speaker_id,
      sermonData.service_date,
      sermonData.service_time,
      sermonData.duration_minutes,
      sermonData.sermon_type,
      JSON.stringify(sermonData.scripture_references),
      JSON.stringify(sermonData.main_points),
      sermonData.target_audience || null,
      sermonData.description || null,
      sermonData.notes || null,
      JSON.stringify(sermonData.tags || []),
      SermonStatus.PLANNING,
      user.id,
      JSON.stringify(preparationStatus)
    ];

    const result = await DatabaseService.query(query, params);
    const sermon = result.rows[0];

    logger.info(`Sermon created: ${sermon.title} by ${user.email}`);

    // Clear cache
    await RedisService.del(`sermons:workspace:${user.workspace_id}`);

    const response: ApiResponse<Sermon> = {
      success: true,
      data: sermon,
      message: 'Sermon created successfully',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  })
);

/**
 * PUT /api/v1/sermons/:id
 * Update a sermon
 */
router.put('/:id',
  requireRole([UserRole.ADMIN, UserRole.PASTOR, UserRole.VOLUNTEER]),
  requireOwnership('sermon'),
  validate(updateSermonSchema),
  validateDateRange,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const updateData = req.body as UpdateSermonRequest;

    // Get current sermon
    const currentResult = await DatabaseService.query(
      'SELECT * FROM sermons WHERE id = $1 AND workspace_id = $2',
      [id, user.workspace_id]
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundError('Sermon not found');
    }

    const currentSermon = currentResult.rows[0];

    // Check if series exists and belongs to workspace (if updating series)
    if (updateData.series_id && updateData.series_id !== currentSermon.series_id) {
      const seriesResult = await DatabaseService.query(
        'SELECT id FROM sermon_series WHERE id = $1 AND workspace_id = $2',
        [updateData.series_id, user.workspace_id]
      );

      if (seriesResult.rows.length === 0) {
        throw new NotFoundError('Series not found');
      }
    }

    // Check if speaker exists and belongs to workspace (if updating speaker)
    if (updateData.speaker_id && updateData.speaker_id !== currentSermon.speaker_id) {
      const speakerResult = await DatabaseService.query(
        'SELECT id FROM users WHERE id = $1 AND workspace_id = $2',
        [updateData.speaker_id, user.workspace_id]
      );

      if (speakerResult.rows.length === 0) {
        throw new NotFoundError('Speaker not found');
      }
    }

    // Check for scheduling conflicts (if updating date/time)
    if (updateData.service_date || updateData.service_time) {
      const newDate = updateData.service_date || currentSermon.service_date;
      const newTime = updateData.service_time || currentSermon.service_time;

      const conflictResult = await DatabaseService.query(
        `SELECT id, title FROM sermons 
         WHERE service_date = $1 AND service_time = $2 AND workspace_id = $3 AND id != $4`,
        [newDate, newTime, user.workspace_id, id]
      );

      if (conflictResult.rows.length > 0) {
        throw new ConflictError(
          `Another sermon "${conflictResult.rows[0].title}" is already scheduled for this time`
        );
      }
    }

    // Validate future date if not admin/pastor
    if (updateData.service_date && ![UserRole.ADMIN, UserRole.PASTOR].includes(user.role)) {
      const serviceDate = new Date(updateData.service_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (serviceDate < today) {
        throw new BusinessLogicError('Service date cannot be in the past');
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const params = [id, user.workspace_id];
    let paramIndex = 3;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'scripture_references' || key === 'main_points' || key === 'tags') {
          updateFields.push(`${key} = $${paramIndex}`);
          params.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramIndex}`);
          params.push(value);
        }
        paramIndex++;
      }
    });

    updateFields.push(`updated_at = NOW()`);

    const query = `
      UPDATE sermons 
      SET ${updateFields.join(', ')}
      WHERE id = $1 AND workspace_id = $2
      RETURNING *
    `;

    const result = await DatabaseService.query(query, params);
    const sermon = result.rows[0];

    logger.info(`Sermon updated: ${sermon.title} by ${user.email}`);

    // Clear cache
    await RedisService.del(`sermon:${id}`);
    await RedisService.del(`sermons:workspace:${user.workspace_id}`);

    const response: ApiResponse<Sermon> = {
      success: true,
      data: sermon,
      message: 'Sermon updated successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * DELETE /api/v1/sermons/:id
 * Delete a sermon
 */
router.delete('/:id',
  requireRole([UserRole.ADMIN, UserRole.PASTOR]),
  requireOwnership('sermon'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    // Check if sermon exists
    const sermonResult = await DatabaseService.query(
      'SELECT title FROM sermons WHERE id = $1 AND workspace_id = $2',
      [id, user.workspace_id]
    );

    if (sermonResult.rows.length === 0) {
      throw new NotFoundError('Sermon not found');
    }

    const sermonTitle = sermonResult.rows[0].title;

    // Delete sermon (cascade will handle related records)
    await DatabaseService.query(
      'DELETE FROM sermons WHERE id = $1 AND workspace_id = $2',
      [id, user.workspace_id]
    );

    logger.info(`Sermon deleted: ${sermonTitle} by ${user.email}`);

    // Clear cache
    await RedisService.del(`sermon:${id}`);
    await RedisService.del(`sermons:workspace:${user.workspace_id}`);

    const response: ApiResponse = {
      success: true,
      message: 'Sermon deleted successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * PATCH /api/v1/sermons/:id/status
 * Update sermon status
 */
router.patch('/:id/status',
  requireRole([UserRole.ADMIN, UserRole.PASTOR, UserRole.VOLUNTEER]),
  requireOwnership('sermon'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user!;

    if (!Object.values(SermonStatus).includes(status)) {
      throw new BusinessLogicError('Invalid status value');
    }

    const result = await DatabaseService.query(
      `UPDATE sermons 
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND workspace_id = $3
       RETURNING title, status`,
      [status, id, user.workspace_id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Sermon not found');
    }

    const sermon = result.rows[0];

    logger.info(`Sermon status updated: ${sermon.title} -> ${status} by ${user.email}`);

    // Clear cache
    await RedisService.del(`sermon:${id}`);

    const response: ApiResponse<{ title: string; status: SermonStatus }> = {
      success: true,
      data: sermon,
      message: 'Sermon status updated successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * PATCH /api/v1/sermons/:id/publish
 * Publish or unpublish a sermon
 */
router.patch('/:id/publish',
  requireRole([UserRole.ADMIN, UserRole.PASTOR]),
  requireOwnership('sermon'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { is_published } = req.body;
    const user = req.user!;

    const publishedAt = is_published ? 'NOW()' : 'NULL';
    
    const result = await DatabaseService.query(
      `UPDATE sermons 
       SET is_published = $1, published_at = ${publishedAt}, updated_at = NOW()
       WHERE id = $2 AND workspace_id = $3
       RETURNING title, is_published, published_at`,
      [is_published, id, user.workspace_id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Sermon not found');
    }

    const sermon = result.rows[0];

    logger.info(`Sermon ${is_published ? 'published' : 'unpublished'}: ${sermon.title} by ${user.email}`);

    // Clear cache
    await RedisService.del(`sermon:${id}`);

    const response: ApiResponse<any> = {
      success: true,
      data: sermon,
      message: `Sermon ${is_published ? 'published' : 'unpublished'} successfully`,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * GET /api/v1/sermons/:id/timeline
 * Get sermon timeline (history of changes)
 */
router.get('/:id/timeline',
  requireWorkspaceAccess(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    // Check if sermon exists
    const sermonResult = await DatabaseService.query(
      'SELECT id FROM sermons WHERE id = $1 AND workspace_id = $2',
      [id, user.workspace_id]
    );

    if (sermonResult.rows.length === 0) {
      throw new NotFoundError('Sermon not found');
    }

    // Get audit trail (if implemented) or related events
    const timelineQuery = `
      SELECT 
        'sermon_created' as event_type,
        s.created_at as event_date,
        creator.display_name as user_name,
        'Sermon created' as description
      FROM sermons s
      LEFT JOIN users creator ON s.created_by = creator.id
      WHERE s.id = $1
      
      UNION ALL
      
      SELECT 
        'assignment_created' as event_type,
        a.created_at as event_date,
        assigner.display_name as user_name,
        CONCAT('Assignment created: ', a.title) as description
      FROM assignments a
      LEFT JOIN users assigner ON a.assigned_by = assigner.id
      WHERE a.sermon_id = $1
      
      UNION ALL
      
      SELECT 
        'resource_uploaded' as event_type,
        sr.created_at as event_date,
        uploader.display_name as user_name,
        CONCAT('Resource uploaded: ', sr.title) as description
      FROM sermon_resources sr
      LEFT JOIN users uploader ON sr.uploaded_by = uploader.id
      WHERE sr.sermon_id = $1
      
      ORDER BY event_date DESC
    `;

    const result = await DatabaseService.query(timelineQuery, [id]);

    const response: ApiResponse<any[]> = {
      success: true,
      data: result.rows,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

export default router;