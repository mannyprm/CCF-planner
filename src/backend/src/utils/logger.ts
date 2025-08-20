import winston from 'winston';
import path from 'path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(logColors);

// Define custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    let message = `${info.timestamp} [${info.level}]: ${info.message}`;
    
    // Add stack trace for errors
    if (info.stack) {
      message += `\n${info.stack}`;
    }
    
    // Add additional fields if present
    const { timestamp, level, message: msg, stack, ...meta } = info;
    if (Object.keys(meta).length > 0) {
      message += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return message;
  })
);

// Determine log level based on environment
const getLogLevel = (): string => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return 'info';
    case 'test':
      return 'error';
    default:
      return 'debug';
  }
};

// Create transports array
const transports: winston.transport[] = [];

// Console transport (always present)
transports.push(
  new winston.transports.Console({
    level: getLogLevel(),
    format: process.env.NODE_ENV === 'production' ? customFormat : consoleFormat,
  })
);

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Ensure logs directory exists
  const logsDir = path.join(process.cwd(), 'logs');
  
  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      level: 'info',
      format: customFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );

  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: customFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
      tailable: true,
    })
  );

  // HTTP access log
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      format: customFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 7,
      tailable: true,
    })
  );
}

// Create the logger instance
export const logger = winston.createLogger({
  level: getLogLevel(),
  levels: logLevels,
  format: customFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
      format: customFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
      format: customFormat,
    }),
  ],
});

// Prevent process exit on handled exceptions in production
if (process.env.NODE_ENV === 'production') {
  logger.exitOnError = false;
}

// Add request ID to logs if available
logger.defaultMeta = {
  service: 'ccf-sermon-planner-api',
  version: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
};

// Helper functions for structured logging
export const logWithContext = {
  /**
   * Log user action with context
   */
  userAction: (userId: string, action: string, details?: any) => {
    logger.info('User action', {
      userId,
      action,
      details,
      category: 'user_action',
    });
  },

  /**
   * Log API request
   */
  apiRequest: (method: string, url: string, userId?: string, duration?: number) => {
    logger.http('API request', {
      method,
      url,
      userId,
      duration,
      category: 'api_request',
    });
  },

  /**
   * Log database operation
   */
  database: (operation: string, table: string, duration?: number, rowCount?: number) => {
    logger.debug('Database operation', {
      operation,
      table,
      duration,
      rowCount,
      category: 'database',
    });
  },

  /**
   * Log cache operation
   */
  cache: (operation: string, key: string, hit?: boolean) => {
    logger.debug('Cache operation', {
      operation,
      key,
      hit,
      category: 'cache',
    });
  },

  /**
   * Log authentication event
   */
  auth: (event: string, userId?: string, details?: any) => {
    logger.info('Authentication event', {
      event,
      userId,
      details,
      category: 'authentication',
    });
  },

  /**
   * Log security event
   */
  security: (event: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
    logger.warn('Security event', {
      event,
      details,
      severity,
      category: 'security',
    });
  },

  /**
   * Log business logic event
   */
  business: (event: string, details: any) => {
    logger.info('Business event', {
      event,
      details,
      category: 'business',
    });
  },

  /**
   * Log external service call
   */
  external: (service: string, operation: string, success: boolean, duration?: number) => {
    logger.info('External service call', {
      service,
      operation,
      success,
      duration,
      category: 'external_service',
    });
  },

  /**
   * Log performance metric
   */
  performance: (metric: string, value: number, unit: string, details?: any) => {
    logger.info('Performance metric', {
      metric,
      value,
      unit,
      details,
      category: 'performance',
    });
  },

  /**
   * Log error with context
   */
  error: (error: Error, context?: any) => {
    logger.error('Error occurred', {
      message: error.message,
      stack: error.stack,
      context,
      category: 'error',
    });
  },
};

// Performance timing helper
export class PerformanceTimer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = Date.now();
  }

  end(details?: any): number {
    const duration = Date.now() - this.startTime;
    logWithContext.performance(this.label, duration, 'ms', details);
    return duration;
  }
}

// Request logger middleware helper
export const createRequestLogger = (options: { 
  includeBody?: boolean; 
  excludePaths?: string[];
  maxBodyLength?: number;
} = {}) => {
  const { includeBody = false, excludePaths = [], maxBodyLength = 1000 } = options;

  return (req: any, res: any, next: any) => {
    // Skip excluded paths
    if (excludePaths.some(path => req.url.startsWith(path))) {
      return next();
    }

    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add request ID to request object
    req.id = requestId;

    // Log request start
    const requestData: any = {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
    };

    if (includeBody && req.body && Object.keys(req.body).length > 0) {
      let body = JSON.stringify(req.body);
      if (body.length > maxBodyLength) {
        body = body.substring(0, maxBodyLength) + '...';
      }
      requestData.body = body;
    }

    logger.http('Request started', requestData);

    // Capture response
    const originalSend = res.send;
    res.send = function(data: any) {
      const duration = Date.now() - startTime;
      
      logger.http('Request completed', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        userId: req.user?.id,
      });

      // Log slow requests
      if (duration > 5000) {
        logger.warn('Slow request detected', {
          requestId,
          method: req.method,
          url: req.url,
          duration,
          category: 'performance',
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };
};

// Health check logging
export const logHealthCheck = (component: string, status: 'healthy' | 'unhealthy' | 'degraded', details?: any) => {
  const level = status === 'healthy' ? 'info' : 'warn';
  logger.log(level, 'Health check', {
    component,
    status,
    details,
    category: 'health_check',
  });
};

// Audit logging for compliance
export const auditLog = {
  /**
   * Log data access
   */
  dataAccess: (userId: string, resource: string, action: string, success: boolean) => {
    logger.info('Data access audit', {
      userId,
      resource,
      action,
      success,
      timestamp: new Date().toISOString(),
      category: 'audit_data_access',
    });
  },

  /**
   * Log user management action
   */
  userManagement: (adminId: string, targetUserId: string, action: string, details?: any) => {
    logger.info('User management audit', {
      adminId,
      targetUserId,
      action,
      details,
      timestamp: new Date().toISOString(),
      category: 'audit_user_management',
    });
  },

  /**
   * Log permission change
   */
  permissionChange: (adminId: string, targetUserId: string, oldRole: string, newRole: string) => {
    logger.info('Permission change audit', {
      adminId,
      targetUserId,
      oldRole,
      newRole,
      timestamp: new Date().toISOString(),
      category: 'audit_permission_change',
    });
  },

  /**
   * Log configuration change
   */
  configChange: (userId: string, setting: string, oldValue: any, newValue: any) => {
    logger.info('Configuration change audit', {
      userId,
      setting,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
      category: 'audit_config_change',
    });
  },
};

export default logger;