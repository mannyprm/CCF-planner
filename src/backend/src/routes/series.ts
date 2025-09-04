import { Router, Request, Response } from 'express';
import { 
  AuthenticatedRequest,
  SermonSeries,
  CreateSeriesRequest,
  SeriesQueryParams,
  ApiResponse,
  PaginationInfo,
  UserRole
} from '../types';
import { 
  validate, 
  createSeriesSchema, 
  updateSeriesSchema,
  seriesQuerySchema,
  validateDateRange
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
 * GET /api/v1/series
 * Get all sermon series with pagination and filtering
 */
router.get('/',
  validate(seriesQuerySchema, 'query'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const {
      page,
      limit,
      is_active,
      search,
      tags,
      sort_by,
      sort_order
    } = req.query as SeriesQueryParams;

    // Build WHERE conditions
    const conditions = ['ss.workspace_id = $1'];
    const params: any[] = [user.workspace_id];
    let paramIndex = 2;

    if (is_active !== undefined) {
      conditions.push(`ss.is_active = $${paramIndex}`);
      params.push(is_active);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(
        ss.title ILIKE $${paramIndex} OR 
        ss.description ILIKE $${paramIndex} OR
        ss.theme_scripture ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      conditions.push(`ss.tags && $${paramIndex}`);
      params.push(tagArray);
      paramIndex++;
    }

    // Calculate offset
    const offset = (page! - 1) * limit!;

    // Build the main query
    const query = `
      SELECT 
        ss.id, ss.workspace_id, ss.title, ss.description,
        ss.theme_scripture, ss.start_date, ss.end_date,
        ss.is_active, ss.series_image, ss.color_theme,
        ss.tags, ss.metadata, ss.created_by, ss.created_at,
        ss.updated_at,
        -- Creator info
        creator.display_name as created_by_name,
        creator.email as created_by_email,
        -- Sermon count
        (SELECT COUNT(*) FROM sermons s WHERE s.series_id = ss.id) as sermon_count,
        -- Status counts
        (SELECT COUNT(*) FROM sermons s WHERE s.series_id = ss.id AND s.status = 'planning') as planning_count,
        (SELECT COUNT(*) FROM sermons s WHERE s.series_id = ss.id AND s.status = 'in_preparation') as preparation_count,
        (SELECT COUNT(*) FROM sermons s WHERE s.series_id = ss.id AND s.status = 'ready') as ready_count,
        (SELECT COUNT(*) FROM sermons s WHERE s.series_id = ss.id AND s.status = 'delivered') as delivered_count
      FROM sermon_series ss
      LEFT JOIN users creator ON ss.created_by = creator.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ss.${sort_by} ${sort_order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM sermon_series ss
      WHERE ${conditions.join(' AND ')}
    `;

    const [seriesResult, countResult] = await Promise.all([
      DatabaseService.query(query, params),
      DatabaseService.query(countQuery, params.slice(0, -2)) // Remove limit and offset
    ]);

    const series = seriesResult.rows;
    const total = parseInt(countResult.rows[0].total);

    const pagination: PaginationInfo = {
      page: page!,
      limit: limit!,
      total,
      pages: Math.ceil(total / limit!),
      has_next: page! < Math.ceil(total / limit!),
      has_prev: page! > 1
    };

    const response: ApiResponse<SermonSeries[]> = {
      success: true,
      data: series,
      pagination,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * GET /api/v1/series/:id
 * Get a specific sermon series by ID
 */
router.get('/:id',
  requireWorkspaceAccess(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    const query = `
      SELECT 
        ss.*,
        -- Creator info
        creator.display_name as created_by_name,
        creator.email as created_by_email,
        creator.profile_picture as created_by_picture
      FROM sermon_series ss
      LEFT JOIN users creator ON ss.created_by = creator.id
      WHERE ss.id = $1 AND ss.workspace_id = $2
    `;

    const result = await DatabaseService.query(query, [id, user.workspace_id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Series not found');
    }

    const series = result.rows[0];

    // Get sermons in this series
    const sermonsResult = await DatabaseService.query(
      `SELECT 
        s.id, s.title, s.subtitle, s.service_date, s.service_time,
        s.status, s.duration_minutes, s.is_published,
        speaker.display_name as speaker_name,
        speaker.email as speaker_email
       FROM sermons s
       LEFT JOIN users speaker ON s.speaker_id = speaker.id
       WHERE s.series_id = $1
       ORDER BY s.service_date ASC`,
      [id]
    );

    series.sermons = sermonsResult.rows;

    // Calculate series progress
    const totalSermons = sermonsResult.rows.length;
    const deliveredSermons = sermonsResult.rows.filter(s => s.status === 'delivered').length;
    series.progress = totalSermons > 0 ? Math.round((deliveredSermons / totalSermons) * 100) : 0;

    const response: ApiResponse<SermonSeries> = {
      success: true,
      data: series,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * POST /api/v1/series
 * Create a new sermon series
 */
router.post('/',
  requireRole([UserRole.ADMIN, UserRole.PASTOR]),
  validate(createSeriesSchema),
  validateDateRange,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const seriesData = req.body as CreateSeriesRequest;

    // Check for duplicate titles in workspace
    const duplicateResult = await DatabaseService.query(
      'SELECT id FROM sermon_series WHERE title = $1 AND workspace_id = $2 AND is_active = true',
      [seriesData.title, user.workspace_id]
    );

    if (duplicateResult.rows.length > 0) {
      throw new ConflictError('A series with this title already exists');
    }

    // Validate date logic
    if (seriesData.end_date && new Date(seriesData.end_date) <= new Date(seriesData.start_date)) {
      throw new BusinessLogicError('End date must be after start date');
    }

    // Create series
    const query = `
      INSERT INTO sermon_series (
        workspace_id, title, description, theme_scripture,
        start_date, end_date, is_active, color_theme,
        tags, metadata, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10
      ) RETURNING *
    `;

    const params = [
      user.workspace_id,
      seriesData.title,
      seriesData.description || null,
      seriesData.theme_scripture || null,
      seriesData.start_date,
      seriesData.end_date || null,
      seriesData.color_theme,
      JSON.stringify(seriesData.tags || []),
      JSON.stringify(seriesData.metadata),
      user.id
    ];

    const result = await DatabaseService.query(query, params);
    const series = result.rows[0];

    logger.info(`Series created: ${series.title} by ${user.email}`);

    // Clear cache
    await RedisService.del(`series:workspace:${user.workspace_id}`);

    const response: ApiResponse<SermonSeries> = {
      success: true,
      data: series,
      message: 'Series created successfully',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  })
);

/**
 * PUT /api/v1/series/:id
 * Update a sermon series
 */
router.put('/:id',
  requireRole([UserRole.ADMIN, UserRole.PASTOR]),
  requireOwnership('series'),
  validate(updateSeriesSchema),
  validateDateRange,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const updateData = req.body;

    // Get current series
    const currentResult = await DatabaseService.query(
      'SELECT * FROM sermon_series WHERE id = $1 AND workspace_id = $2',
      [id, user.workspace_id]
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundError('Series not found');
    }

    const currentSeries = currentResult.rows[0];

    // Check for duplicate titles (if updating title)
    if (updateData.title && updateData.title !== currentSeries.title) {
      const duplicateResult = await DatabaseService.query(
        'SELECT id FROM sermon_series WHERE title = $1 AND workspace_id = $2 AND id != $3 AND is_active = true',
        [updateData.title, user.workspace_id, id]
      );

      if (duplicateResult.rows.length > 0) {
        throw new ConflictError('A series with this title already exists');
      }
    }

    // Validate date logic
    if (updateData.start_date || updateData.end_date) {
      const startDate = updateData.start_date || currentSeries.start_date;
      const endDate = updateData.end_date || currentSeries.end_date;

      if (endDate && new Date(endDate) <= new Date(startDate)) {
        throw new BusinessLogicError('End date must be after start date');
      }
    }

    // Check if there are sermons scheduled outside the new date range
    if (updateData.start_date || updateData.end_date) {
      const newStartDate = updateData.start_date || currentSeries.start_date;
      const newEndDate = updateData.end_date || currentSeries.end_date;

      let dateConflictQuery = `
        SELECT COUNT(*) as count FROM sermons 
        WHERE series_id = $1 AND (service_date < $2`;
      let dateParams: any[] = [id, newStartDate];

      if (newEndDate) {
        dateConflictQuery += ` OR service_date > $3)`;
        dateParams.push(newEndDate);
      } else {
        dateConflictQuery += ')';
      }

      const conflictResult = await DatabaseService.query(dateConflictQuery, dateParams);
      
      if (parseInt(conflictResult.rows[0].count) > 0) {
        throw new ConflictError('Cannot update date range: some sermons are scheduled outside the new range');
      }
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const params: any[] = [id, user.workspace_id];
    let paramIndex = 3;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'tags' || key === 'metadata') {
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
      UPDATE sermon_series 
      SET ${updateFields.join(', ')}
      WHERE id = $1 AND workspace_id = $2
      RETURNING *
    `;

    const result = await DatabaseService.query(query, params);
    const series = result.rows[0];

    logger.info(`Series updated: ${series.title} by ${user.email}`);

    // Clear cache
    await RedisService.del(`series:${id}`);
    await RedisService.del(`series:workspace:${user.workspace_id}`);

    const response: ApiResponse<SermonSeries> = {
      success: true,
      data: series,
      message: 'Series updated successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * DELETE /api/v1/series/:id
 * Delete a sermon series
 */
router.delete('/:id',
  requireRole([UserRole.ADMIN, UserRole.PASTOR]),
  requireOwnership('series'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    // Check if series exists
    const seriesResult = await DatabaseService.query(
      'SELECT title FROM sermon_series WHERE id = $1 AND workspace_id = $2',
      [id, user.workspace_id]
    );

    if (seriesResult.rows.length === 0) {
      throw new NotFoundError('Series not found');
    }

    const seriesTitle = seriesResult.rows[0].title;

    // Check if there are sermons in this series
    const sermonCountResult = await DatabaseService.query(
      'SELECT COUNT(*) as count FROM sermons WHERE series_id = $1',
      [id]
    );

    const sermonCount = parseInt(sermonCountResult.rows[0].count);

    if (sermonCount > 0) {
      // Option 1: Soft delete (mark as inactive)
      await DatabaseService.query(
        'UPDATE sermon_series SET is_active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );

      logger.info(`Series soft deleted (has ${sermonCount} sermons): ${seriesTitle} by ${user.email}`);

      const response: ApiResponse = {
        success: true,
        message: `Series archived (${sermonCount} sermons moved to standalone)`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } else {
      // Option 2: Hard delete (no sermons)
      await DatabaseService.query(
        'DELETE FROM sermon_series WHERE id = $1 AND workspace_id = $2',
        [id, user.workspace_id]
      );

      logger.info(`Series deleted: ${seriesTitle} by ${user.email}`);

      const response: ApiResponse = {
        success: true,
        message: 'Series deleted successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    }

    // Clear cache
    await RedisService.del(`series:${id}`);
    await RedisService.del(`series:workspace:${user.workspace_id}`);
  })
);

/**
 * PATCH /api/v1/series/:id/activate
 * Activate or deactivate a series
 */
router.patch('/:id/activate',
  requireRole([UserRole.ADMIN, UserRole.PASTOR]),
  requireOwnership('series'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { is_active } = req.body;
    const user = req.user!;

    const result = await DatabaseService.query(
      `UPDATE sermon_series 
       SET is_active = $1, updated_at = NOW()
       WHERE id = $2 AND workspace_id = $3
       RETURNING title, is_active`,
      [is_active, id, user.workspace_id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Series not found');
    }

    const series = result.rows[0];

    logger.info(`Series ${is_active ? 'activated' : 'deactivated'}: ${series.title} by ${user.email}`);

    // Clear cache
    await RedisService.del(`series:${id}`);

    const response: ApiResponse<{ title: string; is_active: boolean }> = {
      success: true,
      data: series,
      message: `Series ${is_active ? 'activated' : 'deactivated'} successfully`,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * POST /api/v1/series/:id/duplicate
 * Duplicate a series with optional modifications
 */
router.post('/:id/duplicate',
  requireRole([UserRole.ADMIN, UserRole.PASTOR]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const { 
      title, 
      start_date, 
      include_sermons = false,
      date_offset_weeks = 0 
    } = req.body;

    // Get original series
    const originalResult = await DatabaseService.query(
      'SELECT * FROM sermon_series WHERE id = $1 AND workspace_id = $2',
      [id, user.workspace_id]
    );

    if (originalResult.rows.length === 0) {
      throw new NotFoundError('Series not found');
    }

    const original = originalResult.rows[0];

    // Check for duplicate title
    const duplicateTitle = title || `${original.title} (Copy)`;
    const duplicateResult = await DatabaseService.query(
      'SELECT id FROM sermon_series WHERE title = $1 AND workspace_id = $2 AND is_active = true',
      [duplicateTitle, user.workspace_id]
    );

    if (duplicateResult.rows.length > 0) {
      throw new ConflictError('A series with this title already exists');
    }

    // Calculate new dates
    const newStartDate = start_date || new Date(
      new Date(original.start_date).getTime() + (date_offset_weeks * 7 * 24 * 60 * 60 * 1000)
    );
    
    let newEndDate = null;
    if (original.end_date) {
      newEndDate = new Date(
        new Date(original.end_date).getTime() + (date_offset_weeks * 7 * 24 * 60 * 60 * 1000)
      );
    }

    // Create duplicate series
    const createQuery = `
      INSERT INTO sermon_series (
        workspace_id, title, description, theme_scripture,
        start_date, end_date, is_active, color_theme,
        tags, metadata, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10
      ) RETURNING *
    `;

    const createParams = [
      user.workspace_id,
      duplicateTitle,
      original.description,
      original.theme_scripture,
      newStartDate,
      newEndDate,
      original.color_theme,
      original.tags,
      original.metadata,
      user.id
    ];

    const newSeriesResult = await DatabaseService.query(createQuery, createParams);
    const newSeries = newSeriesResult.rows[0];

    // Optionally duplicate sermons
    if (include_sermons) {
      const sermonsResult = await DatabaseService.query(
        'SELECT * FROM sermons WHERE series_id = $1 ORDER BY service_date ASC',
        [id]
      );

      for (const sermon of sermonsResult.rows) {
        const originalServiceDate = new Date(sermon.service_date);
        const newServiceDate = new Date(
          originalServiceDate.getTime() + (date_offset_weeks * 7 * 24 * 60 * 60 * 1000)
        );

        await DatabaseService.query(
          `INSERT INTO sermons (
            workspace_id, series_id, title, subtitle, speaker_id,
            service_date, service_time, duration_minutes, sermon_type,
            scripture_references, main_points, target_audience,
            description, notes, tags, status, created_by, preparation_status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'planning', $16, $17
          )`,
          [
            user.workspace_id,
            newSeries.id,
            sermon.title,
            sermon.subtitle,
            sermon.speaker_id,
            newServiceDate,
            sermon.service_time,
            sermon.duration_minutes,
            sermon.sermon_type,
            sermon.scripture_references,
            sermon.main_points,
            sermon.target_audience,
            sermon.description,
            sermon.notes,
            sermon.tags,
            user.id,
            JSON.stringify({
              outline_complete: false,
              research_complete: false,
              slides_complete: false,
              notes_complete: false,
              practice_complete: false,
              last_updated: new Date()
            })
          ]
        );
      }
    }

    logger.info(`Series duplicated: ${original.title} -> ${duplicateTitle} by ${user.email}`);

    // Clear cache
    await RedisService.del(`series:workspace:${user.workspace_id}`);

    const response: ApiResponse<SermonSeries> = {
      success: true,
      data: newSeries,
      message: `Series duplicated successfully${include_sermons ? ' with sermons' : ''}`,
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  })
);

/**
 * GET /api/v1/series/:id/stats
 * Get series statistics
 */
router.get('/:id/stats',
  requireWorkspaceAccess(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    // Check if series exists
    const seriesResult = await DatabaseService.query(
      'SELECT title FROM sermon_series WHERE id = $1 AND workspace_id = $2',
      [id, user.workspace_id]
    );

    if (seriesResult.rows.length === 0) {
      throw new NotFoundError('Series not found');
    }

    // Get comprehensive stats
    const statsQuery = `
      SELECT 
        -- Basic counts
        COUNT(*) as total_sermons,
        COUNT(CASE WHEN status = 'planning' THEN 1 END) as planning_count,
        COUNT(CASE WHEN status = 'in_preparation' THEN 1 END) as preparation_count,
        COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_count,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
        COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_count,
        COUNT(CASE WHEN is_published = true THEN 1 END) as published_count,
        
        -- Date info
        MIN(service_date) as first_service_date,
        MAX(service_date) as last_service_date,
        
        -- Duration stats
        AVG(duration_minutes) as avg_duration,
        SUM(duration_minutes) as total_duration,
        
        -- Speaker diversity
        COUNT(DISTINCT speaker_id) as unique_speakers
      FROM sermons 
      WHERE series_id = $1
    `;

    const statsResult = await DatabaseService.query(statsQuery, [id]);
    const stats = statsResult.rows[0];

    // Get speaker breakdown
    const speakersResult = await DatabaseService.query(
      `SELECT 
        u.display_name, 
        u.email,
        COUNT(*) as sermon_count
       FROM sermons s
       JOIN users u ON s.speaker_id = u.id
       WHERE s.series_id = $1
       GROUP BY u.id, u.display_name, u.email
       ORDER BY sermon_count DESC`,
      [id]
    );

    // Calculate progress percentage
    const totalSermons = parseInt(stats.total_sermons) || 0;
    const deliveredSermons = parseInt(stats.delivered_count) || 0;
    const progress = totalSermons > 0 ? Math.round((deliveredSermons / totalSermons) * 100) : 0;

    const response: ApiResponse<any> = {
      success: true,
      data: {
        ...stats,
        progress_percentage: progress,
        speakers: speakersResult.rows,
        completion_status: {
          total: totalSermons,
          completed: deliveredSermons,
          remaining: totalSermons - deliveredSermons
        }
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

export default router;
