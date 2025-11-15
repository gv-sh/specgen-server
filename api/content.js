/**
 * Content API routes - Generation, CRUD, and content management
 * Consolidates contentController and generateController
 */

import { Router } from 'express';
import boom from '@hapi/boom';
import dataService from '../lib/data.js';
import aiService from '../lib/ai.js';
import { 
  generationRequestSchema,
  contentUpdateSchema,
  contentFiltersSchema,
  idParamSchema,
  yearParamSchema 
} from '../lib/schemas.js';

const router = Router();

// === GENERATION ===

/**
 * @swagger
 * /api/generate:
 *   post:
 *     summary: Generate new content (fiction, image, or combined)
 *     tags: [Content]
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { type, parameters, year } = generationRequestSchema.parse(req.body);
    
    // Generate content using AI service
    const result = await aiService.generate(type, parameters, year);
    
    if (!result.success) {
      throw boom.internal(result.error);
    }

    // Save to database
    const contentData = {
      title: result.title,
      type: result.type,
      content: result.content || null,
      imageData: result.imageData || null,
      parameterValues: parameters,
      metadata: result.metadata,
      year: year || null
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

// === CONTENT CRUD ===

/**
 * @swagger
 * /api/content:
 *   get:
 *     summary: Get all generated content with pagination and filters
 *     tags: [Content]
 */
router.get('/', async (req, res, next) => {
  try {
    const filters = contentFiltersSchema.parse(req.query);
    const result = await dataService.getGeneratedContent(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content/summary:
 *   get:
 *     summary: Get content summaries without image data
 *     tags: [Content]
 */
router.get('/summary', async (req, res, next) => {
  try {
    const filters = contentFiltersSchema.parse(req.query);
    const result = await dataService.getContentSummary(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content/years:
 *   get:
 *     summary: Get all years with content
 *     tags: [Content]
 */
router.get('/years', async (req, res, next) => {
  try {
    const years = await dataService.getAvailableYears();
    res.json({ success: true, data: years });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content/year/{year}:
 *   get:
 *     summary: Get content by year
 *     tags: [Content]
 */
router.get('/year/:year', async (req, res, next) => {
  try {
    const { year } = yearParamSchema.parse(req.params);
    const filters = { year, ...contentFiltersSchema.parse(req.query) };
    const result = await dataService.getGeneratedContent(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content/{id}/image:
 *   get:
 *     summary: Get image for a specific content item
 *     tags: [Content]
 */
router.get('/:id/image', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const content = await dataService.getContentById(id);
    
    if (!content) {
      throw boom.notFound('Content not found');
    }
    
    if (!content.imageData) {
      throw boom.notFound('Image not found');
    }

    // Set caching headers
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
      'ETag': `"${id}"`
    });
    
    res.send(content.imageData);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content/{id}:
 *   get:
 *     summary: Get a specific generated content
 *     tags: [Content]
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const content = await dataService.getContentById(id);
    
    if (!content) {
      throw boom.notFound(`Content with ID ${id} not found`);
    }
    
    res.json({ success: true, data: content });
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
 */
router.put('/:id', async (req, res, next) => {
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
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const content = await dataService.deleteGeneratedContent(id);
    res.json({ 
      success: true, 
      message: `Content '${content.title}' deleted successfully`,
      data: { deletedContent: content }
    });
  } catch (error) {
    next(error);
  }
});

export default router;