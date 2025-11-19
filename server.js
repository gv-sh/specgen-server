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
  description: z.string().max(config.get('validation.maxDescriptionLength')).default('')
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
  category_id: z.string().min(1, 'Category ID is required'),
  parameter_values: z.union([
    z.array(parameterValueSchema),
    z.object({ on: z.string(), off: z.string() })
  ]).optional()
});

const parameterUpdateSchema = parameterSchema.partial().omit({ category_id: true });

// Content generation schemas
const generationRequestSchema = z.object({
  parameters: z.record(z.any()).default({}),
  year: z.number().int().min(config.get('validation.yearRange.min')).max(config.get('validation.yearRange.max')).nullable().optional()
});

const contentUpdateSchema = z.object({
  title: z.string().min(1).max(config.get('validation.maxTitleLength')).optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field is required for update'
);

// Query schemas
const contentFiltersSchema = z.object({
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(config.get('validation.maxPageSize'))).default('20')
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
 *         description: List of all visible categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "science-fiction"
 *                       name:
 *                         type: string
 *                         example: "Science Fiction"
 *                       description:
 *                         type: string
 *                         example: "Futuristic stories with advanced technology"
 *                       visibility:
 *                         type: string
 *                         enum: [Show, Hide]
 *                         example: "Show"
 *                       year:
 *                         type: number
 *                         nullable: true
 *                         example: 2150
 *                       sort_order:
 *                         type: number
 *                         example: 0
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
 *         description: Category ID (kebab-case format)
 *         schema:
 *           type: string
 *         example: "science-fiction"
 *     responses:
 *       200:
 *         description: Category found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "science-fiction"
 *                     name:
 *                       type: string
 *                       example: "Science Fiction"
 *                     description:
 *                       type: string
 *                       example: "Futuristic stories with advanced technology"
 *                     visibility:
 *                       type: string
 *                       example: "Show"
 *                     year:
 *                       type: number
 *                       nullable: true
 *                       example: 2150
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Category with id science-fiction not found"
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 description: Category name
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Category description
 *               visibility:
 *                 type: string
 *                 enum: [Show, Hide]
 *                 default: Show
 *               year:
 *                 type: number
 *                 nullable: true
 *                 minimum: 1000
 *                 maximum: 9999
 *                 description: Optional year setting
 *           examples:
 *             cyberpunk:
 *               summary: Cyberpunk Category
 *               value:
 *                 name: "Cyberpunk"
 *                 description: "High tech, low life dystopian futures"
 *                 year: 2077
 *             space-opera:
 *               summary: Space Opera Category
 *               value:
 *                 name: "Space Opera"
 *                 description: "Epic adventures across the galaxy"
 *                 visibility: "Show"
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "cyberpunk"
 *                     name:
 *                       type: string
 *                       example: "Cyberpunk"
 *                     description:
 *                       type: string
 *                       example: "High tech, low life dystopian futures"
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Validation failed"
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
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Category ID to update
 *         schema:
 *           type: string
 *         example: "science-fiction"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               visibility:
 *                 type: string
 *                 enum: [Show, Hide]
 *               year:
 *                 type: number
 *                 nullable: true
 *           examples:
 *             update-description:
 *               summary: Update Description
 *               value:
 *                 description: "Updated description for science fiction stories"
 *             change-year:
 *               summary: Change Year Setting
 *               value:
 *                 year: 2200
 *             hide-category:
 *               summary: Hide Category
 *               value:
 *                 visibility: "Hide"
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Updated category object
 *       404:
 *         description: Category not found
 *       400:
 *         description: Validation failed
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
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Category ID to delete
 *         schema:
 *           type: string
 *         example: "cyberpunk"
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Category deleted successfully"
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Category with id cyberpunk not found"
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
 *     parameters:
 *       - name: categoryId
 *         in: query
 *         description: Filter parameters by category ID
 *         schema:
 *           type: string
 *         example: "science-fiction"
 *     responses:
 *       200:
 *         description: List of parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "sci-fi-tech-level"
 *                       name:
 *                         type: string
 *                         example: "Technology Level"
 *                       type:
 *                         type: string
 *                         enum: [select, text, number, boolean, range]
 *                         example: "select"
 *                       parameter_values:
 *                         type: array
 *                         example: [{"label": "Basic", "id": "basic"}, {"label": "Advanced AI", "id": "advanced-ai"}]
 *                       required:
 *                         type: boolean
 *                         example: false
 *   post:
 *     summary: Create a new parameter
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - category_id
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               type:
 *                 type: string
 *                 enum: [select, text, number, boolean, range]
 *               category_id:
 *                 type: string
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               visibility:
 *                 type: string
 *                 enum: [Basic, Advanced, Hide]
 *                 default: Basic
 *               required:
 *                 type: boolean
 *                 default: false
 *               parameter_values:
 *                 type: array
 *                 description: For select type parameters
 *               parameter_config:
 *                 type: object
 *                 description: Additional configuration (min/max for numbers, etc.)
 *           examples:
 *             select-parameter:
 *               summary: Dropdown Selection Parameter
 *               value:
 *                 name: "Character Type"
 *                 type: "select"
 *                 category_id: "fantasy"
 *                 description: "Main character archetype"
 *                 parameter_values: [
 *                   {"label": "Wizard", "id": "wizard"},
 *                   {"label": "Warrior", "id": "warrior"},
 *                   {"label": "Rogue", "id": "rogue"}
 *                 ]
 *             number-parameter:
 *               summary: Number Range Parameter
 *               value:
 *                 name: "Character Count"
 *                 type: "number"
 *                 category_id: "general"
 *                 description: "Number of main characters"
 *                 parameter_config: {"min": 1, "max": 10, "step": 1}
 *             text-parameter:
 *               summary: Text Input Parameter
 *               value:
 *                 name: "Setting Description"
 *                 type: "text"
 *                 category_id: "custom"
 *                 description: "Custom setting description"
 *                 required: false
 *     responses:
 *       201:
 *         description: Parameter created successfully
 *       400:
 *         description: Validation failed
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

/**
 * @swagger
 * /api/admin/parameters/{id}:
 *   get:
 *     summary: Get parameter by ID
 *     tags: [Admin]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Parameter ID
 *         schema:
 *           type: string
 *         example: "sci-fi-tech-level"
 *     responses:
 *       200:
 *         description: Parameter found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "sci-fi-tech-level"
 *                     name:
 *                       type: string
 *                       example: "Technology Level"
 *                     type:
 *                       type: string
 *                       example: "select"
 *                     parameter_values:
 *                       type: array
 *                       example: [{"label": "Basic", "id": "basic"}, {"label": "Advanced AI", "id": "advanced-ai"}]
 *       404:
 *         description: Parameter not found
 */
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

/**
 * @swagger
 * /api/admin/parameters/{id}:
 *   put:
 *     summary: Update a parameter
 *     tags: [Admin]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Parameter ID to update
 *         schema:
 *           type: string
 *         example: "sci-fi-tech-level"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               visibility:
 *                 type: string
 *                 enum: [Basic, Advanced, Hide]
 *               parameter_values:
 *                 type: array
 *                 description: For select type parameters
 *           examples:
 *             update-values:
 *               summary: Update Parameter Values
 *               value:
 *                 parameter_values: [
 *                   {"label": "Quantum Computing", "id": "quantum"},
 *                   {"label": "Neural Networks", "id": "neural"},
 *                   {"label": "Nano Technology", "id": "nano"}
 *                 ]
 *             change-visibility:
 *               summary: Change Visibility
 *               value:
 *                 visibility: "Advanced"
 *     responses:
 *       200:
 *         description: Parameter updated successfully
 *       404:
 *         description: Parameter not found
 */
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

/**
 * @swagger
 * /api/admin/parameters/{id}:
 *   delete:
 *     summary: Delete a parameter
 *     tags: [Admin]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Parameter ID to delete
 *         schema:
 *           type: string
 *         example: "old-parameter-id"
 *     responses:
 *       200:
 *         description: Parameter deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Parameter deleted successfully"
 *       404:
 *         description: Parameter not found
 */
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
 *     responses:
 *       200:
 *         description: System settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   example:
 *                     app_version: "2.0.0"
 *                     max_generations_per_session: 50
 *                     enable_image_generation: true
 *                     rate_limit_per_minute: 10
 *   put:
 *     summary: Update system settings
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           examples:
 *             rate-limits:
 *               summary: Update Rate Limits
 *               value:
 *                 max_generations_per_session: 25
 *                 rate_limit_per_minute: 5
 *             features:
 *               summary: Toggle Features
 *               value:
 *                 enable_image_generation: false
 *                 maintenance_mode: true
 *             new-setting:
 *               summary: Add New Setting
 *               value:
 *                 custom_prompt_prefix: "Generate a story about"
 *                 max_story_length: 2000
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Updated settings object
 *       400:
 *         description: Invalid setting values
 *       500:
 *         description: Server error updating settings
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
    // Simple validation - just check it's an object
    if (!req.body || typeof req.body !== 'object') {
      throw boom.badRequest('Request body must be an object');
    }
    
    const validatedData = req.body;
    
    for (const [key, value] of Object.entries(validatedData)) {
      // Auto-detect data type
      let dataType = 'string';
      if (typeof value === 'number') dataType = 'number';
      else if (typeof value === 'boolean') dataType = 'boolean';
      else if (typeof value === 'object') dataType = 'json';
      
      await dataService.setSetting(key, value, dataType);
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
 *     summary: Generate combined fiction and image content
 *     tags: [Content]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               parameters:
 *                 type: object
 *                 description: Generation parameters based on categories and settings
 *               year:
 *                 type: number
 *                 description: Optional year setting for the story
 *                 example: 2150
 *           examples:
 *             science-fiction:
 *               summary: Science Fiction Story
 *               value:
 *                 parameters:
 *                   category: "science-fiction"
 *                   technology-level: "Advanced AI"
 *                   setting: "Space Station"
 *                   character: "Scientist"
 *                 year: 2150
 *             fantasy:
 *               summary: Fantasy Story
 *               value:
 *                 parameters:
 *                   category: "fantasy"
 *                   magic-system: "Elemental Magic"
 *                   setting: "Ancient Forest"
 *                   character: "Wizard"
 *             historical:
 *               summary: Historical Fiction
 *               value:
 *                 parameters:
 *                   category: "historical"
 *                   time-period: "Victorian Era"
 *                   location: "London"
 *                   character: "Detective"
 *                 year: 1890
 *     responses:
 *       201:
 *         description: Content generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "uuid-string"
 *                     title:
 *                       type: string
 *                       example: "The Quantum Paradox"
 *                     fiction_content:
 *                       type: string
 *                       example: "In the year 2150, Dr. Sarah Chen discovered..."
 *                     image_original_url:
 *                       type: string
 *                       example: "/api/images/uuid-string/original"
 *                     image_thumbnail_url:
 *                       type: string
 *                       example: "/api/images/uuid-string/thumbnail"
 *                     prompt_data:
 *                       type: object
 *                       description: Parameters used to generate this content
 *                     metadata:
 *                       type: object
 *                       description: Generation metadata (model info, tokens, etc.)
 *       500:
 *         description: Generation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "OpenAI API key not configured"
 */
app.post('/api/generate', async (req, res, next) => {
  try {
    const { parameters, year } = generationRequestSchema.parse(req.body);
    
    const startTime = Date.now();
    const result = await aiService.generate(parameters, year);
    
    if (!result.success) {
      throw boom.internal(result.error);
    }

    const contentData = {
      title: result.title,
      fiction_content: result.content,
      image_blob: result.imageBlob || null,
      image_thumbnail: result.imageThumbnail || null,
      image_format: result.imageFormat || 'png',
      image_size_bytes: result.imageSizeBytes || 0,
      thumbnail_size_bytes: result.thumbnailSizeBytes || 0,
      prompt_data: parameters,
      metadata: result.metadata
    };

    const savedContent = await dataService.saveGeneratedContent(contentData);
    const apiContent = await dataService.getGeneratedContentForApi(savedContent.id);
    
    res.status(201).json({ 
      success: true, 
      data: apiContent
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content:
 *   get:
 *     summary: Get all generated content with pagination
 *     tags: [Content]
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Number of items to return (max 100)
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         example: 10
 *     responses:
 *       200:
 *         description: List of generated content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "uuid-string"
 *                       title:
 *                         type: string
 *                         example: "The Quantum Paradox"
 *                       fiction_content:
 *                         type: string
 *                         example: "In the year 2150, Dr. Sarah Chen discovered..."
 *                       image_original_url:
 *                         type: string
 *                         example: "/api/images/uuid-string/original"
 *                       image_thumbnail_url:
 *                         type: string
 *                         example: "/api/images/uuid-string/thumbnail"
 *                       prompt_data:
 *                         type: object
 *                         description: Parameters used to generate this content
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Validation failed"
 */
app.get('/api/content', async (req, res, next) => {
  try {
    const filters = contentFiltersSchema.parse(req.query);
    const limit = parseInt(filters.limit) || 20;
    
    const content = await dataService.getRecentContent(limit);
    res.json({ success: true, data: content });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content/summary:
 *   get:
 *     summary: Get content generation summary statistics
 *     tags: [Content]
 *     responses:
 *       200:
 *         description: Content summary statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_content:
 *                       type: number
 *                       example: 42
 *                     recent_content:
 *                       type: number
 *                       example: 5
 */
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
      created_at: item.created_at
    }));
    
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

// Image serving endpoints
/**
 * @swagger
 * /api/images/{id}/original:
 *   get:
 *     summary: Get original image (1024x1024)
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Content ID
 *         schema:
 *           type: string
 *         example: "uuid-string"
 *     responses:
 *       200:
 *         description: Original image
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Image not found
 */
app.get('/api/images/:id/original', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const content = await dataService.getGeneratedContentById(id);
    
    if (!content.image_blob) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }
    
    res.set({
      'Content-Type': `image/${content.image_format || 'png'}`,
      'Content-Length': content.image_size_bytes,
      'Cache-Control': 'public, max-age=31536000', // 1 year cache
      'ETag': `"${id}-original"`
    });
    
    res.send(content.image_blob);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/images/{id}/thumbnail:
 *   get:
 *     summary: Get thumbnail image (150x150)
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Content ID
 *         schema:
 *           type: string
 *         example: "uuid-string"
 *     responses:
 *       200:
 *         description: Thumbnail image
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Image not found
 */
app.get('/api/images/:id/thumbnail', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const content = await dataService.getGeneratedContentById(id);
    
    if (!content.image_thumbnail) {
      return res.status(404).json({ success: false, error: 'Thumbnail not found' });
    }
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': content.thumbnail_size_bytes,
      'Cache-Control': 'public, max-age=31536000', // 1 year cache
      'ETag': `"${id}-thumbnail"`
    });
    
    res.send(content.image_thumbnail);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content/{id}:
 *   get:
 *     summary: Get specific generated content by ID
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Content ID
 *         schema:
 *           type: string
 *         example: "uuid-string"
 *     responses:
 *       200:
 *         description: Content found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "uuid-string"
 *                     title:
 *                       type: string
 *                       example: "The Quantum Paradox"
 *                     fiction_content:
 *                       type: string
 *                       example: "In the year 2150, Dr. Sarah Chen discovered..."
 *                     image_original_url:
 *                       type: string
 *                       example: "/api/images/uuid-string/original"
 *                     image_thumbnail_url:
 *                       type: string
 *                       example: "/api/images/uuid-string/thumbnail"
 *                     prompt_data:
 *                       type: object
 *                       description: Parameters used to generate this content
 *       404:
 *         description: Content not found
 */
app.get('/api/content/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const content = await dataService.getGeneratedContentForApi(id);
    res.json({ success: true, data: content });
  } catch (error) {
    next(error);
  }
});

app.get('/api/content/:id/image', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const content = await dataService.getGeneratedContentById(id);

    if (!content.image_blob && !content.image_url) {
      throw boom.notFound('Image not found');
    }

    const responseData = {};
    if (content.image_blob) {
      responseData.imageOriginalUrl = `/api/images/${id}/original`;
      responseData.imageThumbnailUrl = `/api/images/${id}/thumbnail`;
    } else if (content.image_url) {
      responseData.imageUrl = content.image_url;
    }

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content/{id}:
 *   put:
 *     summary: Update generated content
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Content ID to update
 *         schema:
 *           type: string
 *         example: "uuid-string"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Updated Story Title"
 *           examples:
 *             update-title:
 *               summary: Update Title
 *               value:
 *                 title: "The Quantum Paradox - Revised Edition"
 *     responses:
 *       200:
 *         description: Content updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Updated content object
 *       404:
 *         description: Content not found
 *       400:
 *         description: Validation failed
 */
app.put('/api/content/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const updates = contentUpdateSchema.parse(req.body);
    const content = await dataService.updateGeneratedContent(id, updates);
    res.json({ success: true, data: content });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content/{id}:
 *   delete:
 *     summary: Delete generated content
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Content ID to delete
 *         schema:
 *           type: string
 *         example: "uuid-string"
 *     responses:
 *       200:
 *         description: Content deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Content deleted successfully"
 *       404:
 *         description: Content not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Content with id uuid-string not found"
 */
app.delete('/api/content/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await dataService.deleteGeneratedContent(id);
    res.json(result);
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

/**
 * @swagger
 * /api/system/database/init:
 *   post:
 *     summary: Initialize database with schema and default data
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Database initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Database initialized successfully"
 *       500:
 *         description: Database initialization failed
 */
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

/**
 * @swagger
 * /api/system/database/status:
 *   get:
 *     summary: Get database connection status and statistics
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Database status and statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "connected"
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         categories:
 *                           type: number
 *                           example: 5
 *                         parameters:
 *                           type: number
 *                           example: 23
 *                         generated_content:
 *                           type: number
 *                           example: 42
 */
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

/**
 * @swagger
 * /api/system/docs.json:
 *   get:
 *     summary: Get OpenAPI specification as JSON
 *     tags: [System]
 *     responses:
 *       200:
 *         description: OpenAPI specification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Complete OpenAPI 3.0 specification for the API
 */
app.get('/api/system/docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// ==================== LEGACY ROUTE MAPPINGS ====================

// Legacy route mappings for backward compatibility
app.all('/api/categories*', async (req, res, next) => {
  if (req.method === 'GET' && req.path === '/api/categories') {
    try {
      const categories = await dataService.getCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

app.all('/api/parameters*', async (req, res, next) => {
  if (req.method === 'GET' && req.path === '/api/parameters') {
    try {
      const filters = req.query.categoryId ? { categoryId: req.query.categoryId } : {};
      const parameters = filters.categoryId 
        ? await dataService.getParametersByCategory(filters.categoryId)
        : await dataService.getParameters();
      res.json({ success: true, data: parameters });
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

app.all('/api/settings*', async (req, res, next) => {
  if (req.method === 'GET' && req.path === '/api/settings') {
    try {
      const settings = await dataService.getSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

app.all('/api/health*', async (req, res, next) => {
  if (req.method === 'GET' && req.path === '/api/health') {
    try {
      // Duplicate health check logic
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
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// ==================== ERROR HANDLING ====================

// JSON parsing error handler
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return next(boom.badRequest('Invalid JSON payload'));
  }
  next(error);
});

// Validation error handler
app.use((error, req, res, next) => {
  if (error instanceof ZodError) {
    const boomError = boom.badRequest('Validation failed');
    boomError.output.payload.details = error.issues;
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
        stack: error.stack
      }),
      ...(error.output.payload.details && { 
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