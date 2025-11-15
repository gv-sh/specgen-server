/**
 * SpecGen Server - Simplified Express application
 * Replaces index.js with modern patterns and consolidated structure
 */

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import boom from '@hapi/boom';
import pino from 'pino';
import { ZodError } from 'zod';
import config from './config/index.js';

// Import API routes
import adminRoutes from './api/admin.js';
import contentRoutes from './api/content.js';
import systemRoutes from './api/system.js';

// Initialize logger
const logger = pino({
  level: config.get('logging.level'),
  transport: config.get('env') !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

// Create Express app
const app = express();
const PORT = config.get('server.port');

// === MIDDLEWARE ===

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Required for Swagger UI
  contentSecurityPolicy: false     // Required for Swagger UI
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.get('security.rateLimiting.windowMs'),
  max: config.get('security.rateLimiting.maxRequests'),
  message: { 
    success: false, 
    error: 'Too many requests, please try again later' 
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: config.getCorsOrigins(),
  credentials: true
}));

// Body parsing and compression
app.use(compression());
app.use(express.json({ limit: config.get('server.bodyLimit') }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

// === ROUTES ===

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/content', contentRoutes);
app.use('/api', contentRoutes); // Legacy generate endpoint
app.use('/api/system', systemRoutes);

// Legacy route mappings for backward compatibility
app.use('/api/categories', adminRoutes);
app.use('/api/parameters', adminRoutes);
app.use('/api/settings', adminRoutes);
app.use('/api/health', systemRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: config.get('app.name'),
    version: config.get('app.version'),
    description: config.get('app.description'),
    documentation: '/api/system/docs',
    health: '/api/system/health',
    endpoints: {
      admin: '/api/admin',
      content: '/api/content',
      system: '/api/system'
    }
  });
});

// === ERROR HANDLING ===

// Validation error handler
app.use((error, req, res, next) => {
  if (error instanceof ZodError) {
    const boom_error = boom.badRequest('Validation failed');
    boom_error.output.payload.details = error.errors;
    return next(boom_error);
  }
  next(error);
});

// Boom error handler
app.use((error, req, res, next) => {
  if (boom.isBoom(error)) {
    logger.error({
      error: error.message,
      statusCode: error.output.statusCode,
      method: req.method,
      url: req.url
    });
    
    return res.status(error.output.statusCode).json({
      success: false,
      error: error.output.payload.message,
      ...(config.get('env') === 'development' && { 
        stack: error.stack,
        details: error.output.payload.details 
      })
    });
  }
  next(error);
});

// Generic error handler
app.use((error, req, res, next) => {
  logger.error({
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url
  });

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    ...(config.get('env') === 'development' && { 
      stack: error.stack 
    })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: ['/api/admin', '/api/content', '/api/system']
  });
});

// === SERVER STARTUP ===

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, () => {
  logger.info({
    message: 'SpecGen API Server started',
    port: PORT,
    environment: config.get('env'),
    docs: `http://localhost:${PORT}/api/system/docs`
  });
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({
    message: 'Unhandled Promise Rejection',
    reason: reason,
    promise: promise
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({
    message: 'Uncaught Exception',
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

export default app;