/**
 * System API routes - Health, Database, Swagger docs
 * Consolidates health, database, and swagger routes
 */

import { Router } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import dataService from '../lib/dataService.js';
import config from '../config/index.js';

const router = Router();

// === HEALTH CHECK ===

/**
 * @swagger
 * /api/system/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 */
router.get('/health', async (req, res) => {
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
    // Test database connection
    await dataService.init();
    await dataService.getCategories();
    healthStatus.database = 'connected';
  } catch (error) {
    healthStatus.database = 'disconnected';
    healthStatus.status = 'degraded';
  }

  try {
    // Test AI service availability
    if (config.get('ai.openai.apiKey')) {
      healthStatus.ai = 'configured';
    } else {
      healthStatus.ai = 'not_configured';
      if (config.get('env') !== 'test') {
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

// === DATABASE OPERATIONS ===

/**
 * @swagger
 * /api/system/database/init:
 *   post:
 *     summary: Initialize database tables
 *     tags: [System]
 */
router.post('/database/init', async (req, res, next) => {
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

/**
 * @swagger
 * /api/system/database/status:
 *   get:
 *     summary: Get database status and statistics
 *     tags: [System]
 */
router.get('/database/status', async (req, res, next) => {
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

// === SWAGGER DOCUMENTATION ===

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SpecGen API',
      version: '1.0.0',
      description: 'AI-powered speculative fiction generator API',
      contact: {
        name: 'SpecGen Support'
      }
    },
    servers: [
      {
        url: config.get('env') === 'production' ? 'https://api.specgen.app' : `http://localhost:${config.get('server.port')}`,
        description: config.get('env') === 'production' ? 'Production server' : 'Development server'
      }
    ],
    tags: [
      { name: 'Admin', description: 'Administrative operations' },
      { name: 'Content', description: 'Content generation and management' },
      { name: 'System', description: 'System operations and monitoring' }
    ]
  },
  apis: [
    './api/*.js', // Include all API files
    './lib/*.js'  // Include lib files if they have schemas
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * @swagger
 * /api/system/docs:
 *   get:
 *     summary: Swagger UI documentation
 *     tags: [System]
 */
router.use('/docs', swaggerUi.serve);
router.get('/docs', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SpecGen API Documentation'
}));

/**
 * @swagger
 * /api/system/docs.json:
 *   get:
 *     summary: Get OpenAPI specification as JSON
 *     tags: [System]
 */
router.get('/docs.json', (req, res) => {
  res.json(swaggerSpec);
});

export default router;