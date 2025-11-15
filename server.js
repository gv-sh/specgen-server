/**
 * SpecGen Server - Consolidated Express Application
 * All routes, middleware, and logic in a single maintainable file
 */

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import boom from '@hapi/boom';
import pino from 'pino';
import { z, ZodError } from 'zod';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import config from './config.js';
import { dataService, aiService } from './services.js';

// Initialize logger
const logger = pino({
  level: config.get('logging.level'),
  transport: config.isDevelopment() ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

// Create Express app
const app = express();
const PORT = config.get('server.port');

// ==================== VALIDATION SCHEMAS ====================

// Category schemas
const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(config.get('validation.maxNameLength')),
  description: z.string().max(config.get('validation.maxDescriptionLength')).default(''),
  visibility: z.enum(['Show', 'Hide']).default('Show'),
  year: z.number().int().min(config.get('validation.yearRange.min')).max(config.get('validation.yearRange.max')).nullable().optional()
});

const categoryUpdateSchema = categorySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'At least one field is required for update'
);

// Parameter schemas
const parameterValueSchema = z.object({
  label: z.string(),
  id: z.string().optional()
});

const parameterConfigSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional()
});

const parameterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(config.get('validation.maxNameLength')),
  description: z.string().max(config.get('validation.maxDescriptionLength')).default(''),
  type: z.enum(['select', 'text', 'number', 'boolean', 'range']),
  visibility: z.enum(['Basic', 'Advanced', 'Hide']).default('Basic'),
  category_id: z.string().min(1, 'Category ID is required'),
  required: z.boolean().default(false),
  parameter_values: z.union([
    z.array(parameterValueSchema),
    z.object({ on: z.string(), off: z.string() })
  ]).optional(),
  parameter_config: parameterConfigSchema.optional()
});

const parameterUpdateSchema = parameterSchema.partial().omit({ category_id: true });

// Content generation schemas
const generationRequestSchema = z.object({
  type: z.enum(['fiction', 'image', 'combined']).default('fiction'),
  parameters: z.record(z.any()).default({}),
  year: z.number().int().min(config.get('validation.yearRange.min')).max(config.get('validation.yearRange.max')).nullable().optional()
});

const contentUpdateSchema = z.object({
  title: z.string().min(1).max(config.get('validation.maxTitleLength')).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional()
});

// Query schemas
const contentFiltersSchema = z.object({
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(config.get('validation.maxPageSize'))).default('20'),
  type: z.enum(['fiction', 'image', 'combined']).optional()
});

const parameterFiltersSchema = z.object({
  categoryId: z.string().optional()
});

const settingsSchema = z.record(z.any());

// Common param schemas
const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required')
});

const yearParamSchema = z.object({
  year: z.string().transform(val => parseInt(val)).pipe(z.number().int())
});

// ==================== MIDDLEWARE SETUP ====================

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
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

if (config.isFeatureEnabled('enableRateLimit')) {
  app.use('/api/', limiter);
}

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

// ==================== SWAGGER DOCUMENTATION ====================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: config.get('docs.swagger.title'),
      version: config.get('docs.swagger.version'),
      description: config.get('docs.swagger.description'),
      contact: { name: 'SpecGen Support' }
    },
    servers: [
      {
        url: config.getSwaggerServer(),
        description: config.isProduction() ? 'Production server' : 'Development server'
      }
    ],
    tags: [
      { name: 'Admin', description: 'Administrative operations' },
      { name: 'Content', description: 'Content generation and management' },
      { name: 'System', description: 'System operations and monitoring' }
    ]
  },
  apis: ['./server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ==================== ROUTE HANDLERS ====================

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

// ==================== ADMIN ROUTES ====================

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/api/admin/categories', async (req, res, next) => {
  try {
    const categories = await dataService.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Admin]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 */
app.get('/api/admin/categories/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const category = await dataService.getCategoryById(id);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Admin]
 */
app.post('/api/admin/categories', async (req, res, next) => {
  try {
    const validatedData = categorySchema.parse(req.body);
    const category = await dataService.createCategory(validatedData);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Admin]
 */
app.put('/api/admin/categories/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const updates = categoryUpdateSchema.parse(req.body);
    const category = await dataService.updateCategory(id, updates);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Delete category and its parameters
 *     tags: [Admin]
 */
app.delete('/api/admin/categories/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await dataService.deleteCategory(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Parameters
/**
 * @swagger
 * /api/admin/parameters:
 *   get:
 *     summary: Get all parameters or filter by categoryId
 *     tags: [Admin]
 */
app.get('/api/admin/parameters', async (req, res, next) => {
  try {
    const { categoryId } = parameterFiltersSchema.parse(req.query);
    const parameters = categoryId 
      ? await dataService.getParametersByCategory(categoryId)
      : await dataService.getParameters();
    res.json({ success: true, data: parameters });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/parameters/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const parameter = await dataService.getParameterById(id);
    res.json({ success: true, data: parameter });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/parameters', async (req, res, next) => {
  try {
    const validatedData = parameterSchema.parse(req.body);
    const parameter = await dataService.createParameter(validatedData);
    res.status(201).json({ success: true, data: parameter });
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/parameters/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const updates = parameterUpdateSchema.parse(req.body);
    const parameter = await dataService.updateParameter(id, updates);
    res.json({ success: true, data: parameter });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/parameters/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await dataService.deleteParameter(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Settings
/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Get all settings
 *     tags: [Admin]
 */
app.get('/api/admin/settings', async (req, res, next) => {
  try {
    const settings = await dataService.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/settings', async (req, res, next) => {
  try {
    const validatedData = settingsSchema.parse(req.body);
    
    for (const [key, value] of Object.entries(validatedData)) {
      await dataService.setSetting(key, value);
    }
    
    const settings = await dataService.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

// ==================== CONTENT ROUTES ====================

/**
 * @swagger
 * /api/generate:
 *   post:
 *     summary: Generate new content (fiction, image, or combined)
 *     tags: [Content]
 */
app.post('/api/generate', async (req, res, next) => {
  try {
    const { type, parameters, year } = generationRequestSchema.parse(req.body);
    
    const startTime = Date.now();
    const result = await aiService.generate(type, parameters, year);
    
    if (!result.success) {
      throw boom.internal(result.error);
    }

    const contentData = {
      title: result.title,
      content_type: result.type,
      fiction_content: result.content || null,
      image_url: result.imageUrl || null,
      image_prompt: result.imagePrompt || null,
      prompt_data: parameters,
      metadata: result.metadata,
      generation_time: Date.now() - startTime,
      word_count: result.wordCount || 0
    };

    const savedContent = await dataService.saveGeneratedContent(contentData);
    
    res.status(201).json({ 
      success: true, 
      data: savedContent
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content:
 *   get:
 *     summary: Get all generated content with pagination and filters
 *     tags: [Content]
 */
app.get('/api/content', async (req, res, next) => {
  try {
    const filters = contentFiltersSchema.parse(req.query);
    const limit = parseInt(filters.limit) || 20;
    const contentType = filters.type || null;
    
    const content = await dataService.getRecentContent(limit, contentType);
    res.json({ success: true, data: content });
  } catch (error) {
    next(error);
  }
});

app.get('/api/content/summary', async (req, res, next) => {
  try {
    const filters = contentFiltersSchema.parse(req.query);
    const limit = parseInt(filters.limit) || 20;
    const contentType = filters.type || null;
    
    const content = await dataService.getRecentContent(limit, contentType);
    const summary = content.map(item => ({
      id: item.id,
      title: item.title,
      content_type: item.content_type,
      word_count: item.word_count,
      created_at: item.created_at
    }));
    
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

app.get('/api/content/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const content = await dataService.getGeneratedContentById(id);
    res.json({ success: true, data: content });
  } catch (error) {
    next(error);
  }
});

app.get('/api/content/:id/image', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const content = await dataService.getGeneratedContentById(id);
    
    if (!content.image_url) {
      throw boom.notFound('Image not found');
    }

    res.json({ 
      success: true, 
      data: { 
        imageUrl: content.image_url,
        imagePrompt: content.image_prompt
      } 
    });
  } catch (error) {
    next(error);
  }
});

app.put('/api/content/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const updates = contentUpdateSchema.parse(req.body);
    throw boom.notImplemented('Content updates not yet implemented');
  } catch (error) {
    next(error);
  }
});

app.delete('/api/content/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    throw boom.notImplemented('Content deletion not yet implemented');
  } catch (error) {
    next(error);
  }
});

// ==================== SYSTEM ROUTES ====================

/**
 * @swagger
 * /api/system/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 */
app.get('/api/system/health', async (req, res) => {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.get('env'),
    version: config.get('app.version'),
    database: 'unknown',
    ai: 'unknown'
  };

  try {
    await dataService.init();
    await dataService.getCategories();
    healthStatus.database = 'connected';
  } catch (error) {
    healthStatus.database = 'disconnected';
    healthStatus.status = 'degraded';
  }

  try {
    if (config.get('ai.openai.apiKey')) {
      healthStatus.ai = 'configured';
    } else {
      healthStatus.ai = 'not_configured';
      if (!config.isTest()) {
        healthStatus.status = 'degraded';
      }
    }
  } catch (error) {
    healthStatus.ai = 'error';
    healthStatus.status = 'degraded';
  }

  const statusCode = healthStatus.status === 'ok' ? 200 : 503;
  res.status(statusCode).json({
    success: healthStatus.status === 'ok',
    data: healthStatus
  });
});

app.post('/api/system/database/init', async (req, res, next) => {
  try {
    await dataService.init();
    res.json({ 
      success: true, 
      message: 'Database initialized successfully' 
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/system/database/status', async (req, res, next) => {
  try {
    await dataService.init();
    
    const stats = {
      categories: (await dataService.getCategories()).length,
      parameters: (await dataService.getParameters()).length,
      generatedContent: (await dataService.getRecentContent(1)).length,
      settings: Object.keys(await dataService.getSettings()).length
    };

    res.json({
      success: true,
      data: {
        status: 'connected',
        statistics: stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Swagger documentation
app.use('/api/system/docs', swaggerUi.serve);
app.get('/api/system/docs', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SpecGen API Documentation'
}));

app.get('/api/system/docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// ==================== LEGACY ROUTE MAPPINGS ====================

// Legacy route mappings for backward compatibility
app.use('/api/categories', (req, res, next) => {
  req.url = req.url.replace('/api/categories', '/api/admin/categories');
  app._router.handle(req, res, next);
});

app.use('/api/parameters', (req, res, next) => {
  req.url = req.url.replace('/api/parameters', '/api/admin/parameters');
  app._router.handle(req, res, next);
});

app.use('/api/settings', (req, res, next) => {
  req.url = req.url.replace('/api/settings', '/api/admin/settings');
  app._router.handle(req, res, next);
});

app.use('/api/health', (req, res, next) => {
  req.url = req.url.replace('/api/health', '/api/system/health');
  app._router.handle(req, res, next);
});

// ==================== ERROR HANDLING ====================

// Validation error handler
app.use((error, req, res, next) => {
  if (error instanceof ZodError) {
    const boomError = boom.badRequest('Validation failed');
    boomError.output.payload.details = error.errors;
    return next(boomError);
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
      ...(config.isDevelopment() && { 
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
    ...(config.isDevelopment() && { 
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

// ==================== SERVER STARTUP ====================

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, config.get('server.timeouts.gracefulShutdown'));
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