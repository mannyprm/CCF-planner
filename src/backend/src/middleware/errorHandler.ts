import { Request, Response, NextFunction } from 'express';
import { 
  AppError, 
  ValidationErrorClass, 
  AuthenticationError, 
  AuthorizationError, 
  NotFoundError, 
  ConflictError 
} from '../types';
import { logger } from '../utils/logger';

/**
 * Global error handling middleware
 * Must be the last middleware in the chain
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: any[] | undefined;

  // Log the error for debugging
  logger.error('Error caught by error handler:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: (req as any).user?.id || 'anonymous'
  });

  // Handle known error types
  if (error instanceof ValidationErrorClass) {
    statusCode = 400;
    message = error.message;
    errors = error.errors;
  } else if (error instanceof AuthenticationError) {
    statusCode = 401;
    message = error.message;
  } else if (error instanceof AuthorizationError) {
    statusCode = 403;
    message = error.message;
  } else if (error instanceof NotFoundError) {
    statusCode = 404;
    message = error.message;
  } else if (error instanceof ConflictError) {
    statusCode = 409;
    message = error.message;
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    // Joi validation errors
    statusCode = 400;
    message = 'Validation failed';
    errors = (error as any).details?.map((detail: any) => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));
  } else if (error.name === 'CastError') {
    // Database casting errors (invalid IDs, etc.)
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    // MongoDB specific errors
    if ((error as any).code === 11000) {
      statusCode = 409;
      message = 'Duplicate key error';
      
      // Extract field name from duplicate key error
      const field = Object.keys((error as any).keyValue || {})[0];
      if (field) {
        errors = [{
          field,
          message: `${field} already exists`,
          value: (error as any).keyValue[field]
        }];
      }
    }
  } else if (error.name === 'PostgresError' || error.name === 'DatabaseError') {
    // PostgreSQL specific errors
    const pgError = error as any;
    if (pgError.code === '23505') { // Unique violation
      statusCode = 409;
      message = 'Duplicate key error';
    } else if (pgError.code === '23503') { // Foreign key violation
      statusCode = 400;
      message = 'Invalid reference';
    } else if (pgError.code === '23502') { // Not null violation
      statusCode = 400;
      message = 'Required field missing';
    }
  } else if (error.name === 'MulterError') {
    // File upload errors
    statusCode = 400;
    if ((error as any).code === 'LIMIT_FILE_SIZE') {
      message = 'File too large';
    } else if ((error as any).code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files';
    } else if ((error as any).code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field';
    } else {
      message = 'File upload error';
    }
  } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    // JSON parsing errors
    statusCode = 400;
    message = 'Invalid JSON format';
  } else if (error.name === 'RateLimiterError') {
    // Rate limiting errors
    statusCode = 429;
    message = 'Too many requests';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
  }

  // Send error response
  const errorResponse: any = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errors) {
    errorResponse.errors = errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  // Include request ID if available
  const requestId = (req as any).id || req.headers['x-request-id'];
  if (requestId) {
    errorResponse.request_id = requestId;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 * Should be placed before the error handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`);
  next(error);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass them to error handler
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error classes for specific scenarios
 */
export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message = 'External service unavailable') {
    super(`${service}: ${message}`, 503);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429);
  }
}

export class FileUploadError extends AppError {
  constructor(message = 'File upload failed') {
    super(message, 400);
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}

/**
 * Validation helper for route parameters
 */
export const validateRouteParams = (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;
  
  if (id && !isValidUUID(id)) {
    const error = new ValidationErrorClass([{
      field: 'id',
      message: 'Invalid ID format',
      value: id
    }]);
    next(error);
    return;
  }
  
  next();
};

/**
 * UUID validation helper
 */
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Handle uncaught exceptions gracefully
 */
export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    
    // Give the logger time to write the log
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
};

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Give the logger time to write the log
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
};

/**
 * Graceful shutdown handler
 */
export const gracefulShutdown = (server: any): void => {
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close((error?: Error) => {
      if (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
      
      logger.info('Server closed successfully');
      process.exit(0);
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

/**
 * Health check error types
 */
export class HealthCheckError extends AppError {
  public readonly component: string;
  
  constructor(component: string, message: string) {
    super(`Health check failed for ${component}: ${message}`, 503);
    this.component = component;
  }
}

/**
 * API versioning error
 */
export class UnsupportedApiVersionError extends AppError {
  constructor(version: string) {
    super(`API version ${version} is not supported`, 400);
  }
}

/**
 * Resource limit exceeded error
 */
export class ResourceLimitError extends AppError {
  constructor(resource: string, limit: number) {
    super(`${resource} limit of ${limit} exceeded`, 429);
  }
}

/**
 * Maintenance mode error
 */
export class MaintenanceModeError extends AppError {
  constructor() {
    super('Service temporarily unavailable for maintenance', 503);
  }
}