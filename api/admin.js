/**
 * Admin API routes - Categories, Parameters, Settings
 * Consolidates categoryController, parameterController, settingsController
 */

import { Router } from 'express';
import boom from '@hapi/boom';
import dataService from '../lib/data.js';
import { 
  categorySchema, 
  categoryUpdateSchema,
  parameterSchema,
  parameterUpdateSchema,
  settingsSchema,
  idParamSchema,
  parameterFiltersSchema 
} from '../lib/schemas.js';

const router = Router();

// === CATEGORIES ===

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Admin]
 */
router.get('/categories', async (req, res, next) => {
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
 */
router.get('/categories/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const category = await dataService.getCategoryById(id);
    
    if (!category) {
      throw boom.notFound(`Category with ID ${id} not found`);
    }
    
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
router.post('/categories', async (req, res, next) => {
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
router.put('/categories/:id', async (req, res, next) => {
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
router.delete('/categories/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await dataService.deleteCategory(id);
    res.json({ 
      success: true, 
      message: `Category '${result.deletedCategory.name}' deleted successfully`,
      data: result 
    });
  } catch (error) {
    next(error);
  }
});

// === PARAMETERS ===

/**
 * @swagger
 * /api/admin/parameters:
 *   get:
 *     summary: Get all parameters or filter by categoryId
 *     tags: [Admin]
 */
router.get('/parameters', async (req, res, next) => {
  try {
    const { categoryId } = parameterFiltersSchema.parse(req.query);
    const parameters = await dataService.getParameters(categoryId);
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
 */
router.get('/parameters/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const parameter = await dataService.getParameterById(id);
    
    if (!parameter) {
      throw boom.notFound(`Parameter with ID ${id} not found`);
    }
    
    res.json({ success: true, data: parameter });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/parameters:
 *   post:
 *     summary: Create a new parameter
 *     tags: [Admin]
 */
router.post('/parameters', async (req, res, next) => {
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
 */
router.put('/parameters/:id', async (req, res, next) => {
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
 */
router.delete('/parameters/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const parameter = await dataService.deleteParameter(id);
    res.json({ 
      success: true, 
      message: `Parameter '${parameter.name}' deleted successfully`,
      data: { deletedParameter: parameter }
    });
  } catch (error) {
    next(error);
  }
});

// === SETTINGS ===

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Get all settings
 *     tags: [Admin]
 */
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await dataService.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/settings:
 *   put:
 *     summary: Update settings
 *     tags: [Admin]
 */
router.put('/settings', async (req, res, next) => {
  try {
    const validatedData = settingsSchema.parse(req.body);
    const settings = await dataService.updateSettings(validatedData);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

export default router;