import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/auth';
import seriesRoutes from './routes/series';
import sermonRoutes from './routes/sermons';
import userRoutes from './routes/users';
import exportRoutes from './routes/exports';
import mcpRoutes from './routes/mcp';

// Import services
import { logger } from './utils/logger';
import { MCPService } from './services/mcp/MCPService';

// Initialize Express app
const app: Express = express();
const httpServer = createServer(app);

// Port configuration
const PORT = process.env.PORT || 6780;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5867', 'http://localhost:3000'],
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Rate limiting
app.use('/api/', rateLimiter);

// Health check route
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/series', seriesRoutes);
app.use('/api/v1/sermons', sermonRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/exports', exportRoutes);
app.use('/api/v1/mcp', mcpRoutes);

// Welcome route
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to CCF Sermon Planning API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      sermons: '/api/v1/sermons',
      series: '/api/v1/series',
      users: '/api/v1/users',
      exports: '/api/v1/exports',
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize MCP Service
const mcpService = MCPService.getInstance();

// Start server
httpServer.listen(PORT, async () => {
  logger.info(`🚀 Server is running on port ${PORT}`);
  logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 API URL: http://localhost:${PORT}/api/v1`);
  logger.info(`💚 Health check: http://localhost:${PORT}/health`);
  
  // Initialize MCP connections
  try {
    await mcpService.initialize();
    logger.info('✅ MCP Service initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize MCP Service:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await mcpService.shutdown();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await mcpService.shutdown();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;