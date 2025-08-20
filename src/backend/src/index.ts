import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';

// Load environment variables
dotenv.config();

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/auth';

// Import routes
import authRoutes from './routes/auth';
import workspaceRoutes from './routes/workspaces';
import seriesRoutes from './routes/series';
import sermonRoutes from './routes/sermons';
import timelineRoutes from './routes/timeline';
import meetingRoutes from './routes/meetings';
import assetRoutes from './routes/assets';
import exportRoutes from './routes/exports';

// Import services
import { DatabaseService } from './services/database';
import { RedisService } from './services/redis';
import { FirebaseService } from './services/firebase';
import { WebSocketService } from './services/websocket';
import { logger } from './utils/logger';

// Initialize Express app
const app: Express = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
});

// Port configuration
const PORT = process.env.API_PORT || 8080;

// Initialize services
const initializeServices = async () => {
  try {
    // Initialize database
    await DatabaseService.initialize();
    logger.info('Database connected successfully');

    // Initialize Redis
    await RedisService.initialize();
    logger.info('Redis connected successfully');

    // Initialize Firebase
    await FirebaseService.initialize();
    logger.info('Firebase initialized successfully');

    // Initialize WebSocket service
    WebSocketService.initialize(io);
    logger.info('WebSocket service initialized');

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

// Configure middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
} else {
  app.use(morgan('dev'));
}

// Rate limiting
app.use('/api/', rateLimiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API version endpoint
app.get('/api/v1', (req: Request, res: Response) => {
  res.json({
    name: 'Cape Christian Sermon Planning API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
  });
});

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', authMiddleware, workspaceRoutes);
app.use('/api/v1/series', authMiddleware, seriesRoutes);
app.use('/api/v1/sermons', authMiddleware, sermonRoutes);
app.use('/api/v1/timeline', authMiddleware, timelineRoutes);
app.use('/api/v1/meetings', authMiddleware, meetingRoutes);
app.use('/api/v1/assets', authMiddleware, assetRoutes);
app.use('/api/v1/exports', authMiddleware, exportRoutes);

// Static files for uploaded assets (if not using S3 exclusively)
app.use('/uploads', express.static(path.join(__dirname, '../../../uploads')));

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Starting graceful shutdown...');
  
  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database connections
  await DatabaseService.close();
  logger.info('Database connections closed');

  // Close Redis connection
  await RedisService.close();
  logger.info('Redis connection closed');

  // Exit process
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Start server
const startServer = async () => {
  try {
    // Initialize services
    await initializeServices();

    // Start listening
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}/api/v1`);
      logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();