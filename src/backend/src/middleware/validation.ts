import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { 
  ValidationErrorClass, 
  ValidationError, 
  SermonType, 
  UserRole, 
  AssignmentStatus,
  TaskType,
  Priority,
  ExportFormat
} from '../types';
import { logger } from '../utils/logger';

/**
 * Generic validation middleware factory
 * @param schema Joi validation schema
 * @param source Where to validate (body, params, query)
 */
export const validate = (schema: Joi.ObjectSchema, source: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source];
    const { error, value } = schema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      const validationError = new ValidationErrorClass(validationErrors);
      
      logger.warn('Validation failed:', { errors: validationErrors, data });
      
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Replace the validated and sanitized data
    req[source] = value;
    next();
  };
};

// ==================== COMMON SCHEMAS ====================

const objectIdSchema = Joi.string().uuid().required();
const optionalObjectIdSchema = Joi.string().uuid().optional();
const emailSchema = Joi.string().email().required();
const dateSchema = Joi.date().iso().required();
const optionalDateSchema = Joi.date().iso().optional();

// ==================== AUTHENTICATION SCHEMAS ====================

export const loginSchema = Joi.object({
  firebase_token: Joi.string().required()
});

export const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required()
});

// ==================== USER SCHEMAS ====================

export const createUserSchema = Joi.object({
  email: emailSchema,
  display_name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid(...Object.values(UserRole)).required(),
  workspace_id: objectIdSchema,
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system').default('system'),
    notifications: Joi.object({
      email: Joi.boolean().default(true),
      push: Joi.boolean().default(true),
      sermon_reminders: Joi.boolean().default(true),
      deadline_alerts: Joi.boolean().default(true)
    }).default(),
    timezone: Joi.string().default('UTC'),
    language: Joi.string().default('en')
  }).optional()
});

export const updateUserSchema = Joi.object({
  display_name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  role: Joi.string().valid(...Object.values(UserRole)).optional(),
  is_active: Joi.boolean().optional(),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system').optional(),
    notifications: Joi.object({
      email: Joi.boolean().optional(),
      push: Joi.boolean().optional(),
      sermon_reminders: Joi.boolean().optional(),
      deadline_alerts: Joi.boolean().optional()
    }).optional(),
    timezone: Joi.string().optional(),
    language: Joi.string().optional()
  }).optional()
});

// ==================== WORKSPACE SCHEMAS ====================

export const createWorkspaceSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional(),
  church_name: Joi.string().min(2).max(100).required(),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zip_code: Joi.string().required(),
    country: Joi.string().required()
  }).optional(),
  settings: Joi.object({
    time_zone: Joi.string().default('UTC'),
    default_service_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    advance_planning_weeks: Joi.number().integer().min(1).max(52).default(12),
    sermon_length_minutes: Joi.number().integer().min(15).max(180).default(30),
    allow_guest_speakers: Joi.boolean().default(true),
    require_approval: Joi.boolean().default(false),
    branding: Joi.object({
      logo_url: Joi.string().uri().optional(),
      primary_color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).required(),
      secondary_color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).required()
    }).required()
  }).required()
});

// ==================== SERMON SERIES SCHEMAS ====================

export const createSeriesSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(1000).optional(),
  theme_scripture: Joi.string().max(200).optional(),
  start_date: dateSchema,
  end_date: optionalDateSchema,
  color_theme: Joi.string().pattern(/^#[0-9A-F]{6}$/i).required(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).default([]),
  metadata: Joi.object({
    target_audience: Joi.string().max(100).optional(),
    series_type: Joi.string().valid('expository', 'topical', 'narrative', 'seasonal', 'other').required(),
    estimated_sermons: Joi.number().integer().min(1).max(100).required(),
    resources: Joi.array().items(Joi.string().uri()).default([])
  }).required()
});

export const updateSeriesSchema = Joi.object({
  title: Joi.string().min(2).max(200).optional(),
  description: Joi.string().max(1000).optional(),
  theme_scripture: Joi.string().max(200).optional(),
  start_date: optionalDateSchema,
  end_date: optionalDateSchema,
  is_active: Joi.boolean().optional(),
  color_theme: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  metadata: Joi.object({
    target_audience: Joi.string().max(100).optional(),
    series_type: Joi.string().valid('expository', 'topical', 'narrative', 'seasonal', 'other').optional(),
    estimated_sermons: Joi.number().integer().min(1).max(100).optional(),
    actual_sermons: Joi.number().integer().min(0).optional(),
    resources: Joi.array().items(Joi.string().uri()).optional()
  }).optional()
});

// ==================== SERMON SCHEMAS ====================

const scriptureReferenceSchema = Joi.object({
  book: Joi.string().min(2).max(50).required(),
  chapter: Joi.number().integer().min(1).required(),
  verse_start: Joi.number().integer().min(1).optional(),
  verse_end: Joi.number().integer().min(1).optional(),
  version: Joi.string().max(10).default('NIV'),
  is_primary: Joi.boolean().default(false)
});

export const createSermonSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  subtitle: Joi.string().max(200).optional(),
  series_id: optionalObjectIdSchema,
  speaker_id: objectIdSchema,
  service_date: dateSchema,
  service_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  duration_minutes: Joi.number().integer().min(5).max(300).default(30),
  sermon_type: Joi.string().valid(...Object.values(SermonType)).required(),
  scripture_references: Joi.array().items(scriptureReferenceSchema).min(1).required(),
  main_points: Joi.array().items(Joi.string().max(200)).min(1).max(10).required(),
  target_audience: Joi.string().max(100).optional(),
  description: Joi.string().max(1000).optional(),
  notes: Joi.string().max(5000).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).default([])
});

export const updateSermonSchema = Joi.object({
  title: Joi.string().min(2).max(200).optional(),
  subtitle: Joi.string().max(200).optional(),
  series_id: optionalObjectIdSchema,
  speaker_id: optionalObjectIdSchema,
  service_date: optionalDateSchema,
  service_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  duration_minutes: Joi.number().integer().min(5).max(300).optional(),
  sermon_type: Joi.string().valid(...Object.values(SermonType)).optional(),
  scripture_references: Joi.array().items(scriptureReferenceSchema).min(1).optional(),
  main_points: Joi.array().items(Joi.string().max(200)).min(1).max(10).optional(),
  target_audience: Joi.string().max(100).optional(),
  description: Joi.string().max(1000).optional(),
  notes: Joi.string().max(5000).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  status: Joi.string().valid('planning', 'in_preparation', 'ready', 'delivered', 'archived').optional(),
  is_published: Joi.boolean().optional()
});

// ==================== ASSIGNMENT SCHEMAS ====================

export const createAssignmentSchema = Joi.object({
  sermon_id: objectIdSchema,
  assigned_to: objectIdSchema,
  task_type: Joi.string().valid(...Object.values(TaskType)).required(),
  title: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(1000).optional(),
  due_date: dateSchema,
  priority: Joi.string().valid(...Object.values(Priority)).default(Priority.MEDIUM),
  estimated_hours: Joi.number().min(0.5).max(100).optional()
});

export const updateAssignmentSchema = Joi.object({
  assigned_to: optionalObjectIdSchema,
  task_type: Joi.string().valid(...Object.values(TaskType)).optional(),
  title: Joi.string().min(2).max(200).optional(),
  description: Joi.string().max(1000).optional(),
  due_date: optionalDateSchema,
  status: Joi.string().valid(...Object.values(AssignmentStatus)).optional(),
  priority: Joi.string().valid(...Object.values(Priority)).optional(),
  estimated_hours: Joi.number().min(0.5).max(100).optional(),
  actual_hours: Joi.number().min(0).max(100).optional(),
  notes: Joi.string().max(2000).optional()
});

// ==================== QUERY PARAMETER SCHEMAS ====================

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

export const sermonQuerySchema = paginationSchema.keys({
  series_id: optionalObjectIdSchema,
  speaker_id: optionalObjectIdSchema,
  status: Joi.string().valid('planning', 'in_preparation', 'ready', 'delivered', 'archived').optional(),
  service_date_from: optionalDateSchema,
  service_date_to: optionalDateSchema,
  search: Joi.string().max(100).optional(),
  tags: Joi.string().optional(), // Comma-separated tags
  sort_by: Joi.string().valid('service_date', 'created_at', 'title').default('service_date'),
  sort_order: Joi.string().valid('asc', 'desc').default('asc')
});

export const seriesQuerySchema = paginationSchema.keys({
  is_active: Joi.boolean().optional(),
  search: Joi.string().max(100).optional(),
  tags: Joi.string().optional(), // Comma-separated tags
  sort_by: Joi.string().valid('start_date', 'created_at', 'title').default('start_date'),
  sort_order: Joi.string().valid('asc', 'desc').default('asc')
});

export const userQuerySchema = paginationSchema.keys({
  role: Joi.string().valid(...Object.values(UserRole)).optional(),
  is_active: Joi.boolean().optional(),
  search: Joi.string().max(100).optional(),
  sort_by: Joi.string().valid('created_at', 'display_name', 'email').default('display_name'),
  sort_order: Joi.string().valid('asc', 'desc').default('asc')
});

// ==================== EXPORT SCHEMAS ====================

export const exportRequestSchema = Joi.object({
  format: Joi.string().valid(...Object.values(ExportFormat)).required(),
  date_range: Joi.object({
    start: dateSchema,
    end: dateSchema
  }).optional(),
  series_ids: Joi.array().items(objectIdSchema).optional(),
  sermon_ids: Joi.array().items(objectIdSchema).optional(),
  include_resources: Joi.boolean().default(false),
  template: Joi.string().max(50).optional()
});

// ==================== FILE UPLOAD SCHEMAS ====================

export const fileUploadSchema = Joi.object({
  resource_type: Joi.string().valid('outline', 'slides', 'audio', 'video', 'handout', 'scripture', 'research', 'image', 'other').required(),
  title: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(500).optional()
});

// ==================== CUSTOM VALIDATION HELPERS ====================

/**
 * Validate that end_date is after start_date
 */
export const validateDateRange = (req: Request, res: Response, next: NextFunction): void => {
  const { start_date, end_date } = req.body;
  
  if (start_date && end_date && new Date(end_date) <= new Date(start_date)) {
    res.status(400).json({
      success: false,
      message: 'End date must be after start date',
      errors: [{
        field: 'end_date',
        message: 'End date must be after start date',
        value: end_date
      }],
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  next();
};

/**
 * Validate that service_date is not in the past (except for admin/pastor roles)
 */
export const validateFutureDate = (req: Request, res: Response, next: NextFunction): void => {
  const { service_date } = req.body;
  const user = (req as any).user;
  
  if (service_date && user) {
    const serviceDate = new Date(service_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (serviceDate < today && ![UserRole.ADMIN, UserRole.PASTOR].includes(user.role)) {
      res.status(400).json({
        success: false,
        message: 'Service date cannot be in the past',
        errors: [{
          field: 'service_date',
          message: 'Service date cannot be in the past',
          value: service_date
        }],
        timestamp: new Date().toISOString()
      });
      return;
    }
  }
  
  next();
};

/**
 * Validate file size and type for uploads
 */
export const validateFileUpload = (allowedTypes: string[], maxSizeMB: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const file = (req as any).file;
    
    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      res.status(400).json({
        success: false,
        message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        errors: [{
          field: 'file',
          message: 'Invalid file type',
          value: file.mimetype
        }],
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      res.status(400).json({
        success: false,
        message: `File too large. Maximum size: ${maxSizeMB}MB`,
        errors: [{
          field: 'file',
          message: 'File size exceeds limit',
          value: `${(file.size / 1024 / 1024).toFixed(2)}MB`
        }],
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    next();
  };
};