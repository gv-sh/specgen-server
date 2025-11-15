/**
 * Content API routes - Generation, CRUD, and content management
 * Consolidates contentController and generateController
 */

import { Router } from 'express';
import boom from '@hapi/boom';
import dataService from '../lib/dataService.js';
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
      content_type: result.type,
      fiction_content: result.content || null,
      image_url: result.imageUrl || null,
      image_prompt: result.imagePrompt || null,
      prompt_data: parameters,
      metadata: result.metadata,
      generation_time: result.generationTime || 0,
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
    const limit = parseInt(filters.limit) || 20;
    const contentType = filters.type || null;
    
    const content = await dataService.getRecentContent(limit, contentType);
    res.json({ success: true, data: content });
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
    const limit = parseInt(filters.limit) || 20;
    const contentType = filters.type || null;
    
    // Get content without large fields for summary view
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
    const content = await dataService.getGeneratedContentById(id);
    
    if (!content.image_url) {
      throw boom.notFound('Image not found');
    }

    // Return the image URL instead of binary data
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
    const content = await dataService.getGeneratedContentById(id);
    
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
    
    // For now, just return not implemented since we don't have update method in DataService
    throw boom.notImplemented('Content updates not yet implemented');
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
    
    // For now, just return not implemented since we don't have delete method in DataService
    throw boom.notImplemented('Content deletion not yet implemented');
  } catch (error) {
    next(error);
  }
});

export default router;