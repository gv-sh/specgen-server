/**
 * Comprehensive Tests for SpecGen Server
 * Single file testing all endpoints with SQLite database support
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import fs from 'fs/promises';

import app from './server.js';
import { dataService } from './services.js';
import config from './config.js';
import schema from './schema.js';

// Global jest for compatibility
global.jest = jest;

// Test database path
const TEST_DB_PATH = config.getDatabasePath();

/**
 * Test Database Initialization
 * Creates clean SQLite database with test data
 */
async function initTestDatabase() {
  // Delete existing test database
  try {
    await fs.unlink(TEST_DB_PATH);
  } catch (err) {
    // File might not exist, that's ok
  }

  // Initialize new database (this will create schema automatically)
  await dataService.init();

  // Create test categories
  await dataService.createCategory({
    id: 'science-fiction',
    name: 'Science Fiction',
    description: 'Stories set in the future with advanced technology',
    sort_order: 1
  });

  await dataService.createCategory({
    id: 'fantasy',
    name: 'Fantasy', 
    description: 'Stories with magic and mythical creatures',
    sort_order: 2
  });

  await dataService.createCategory({
    id: 'hidden-category',
    name: 'Hidden Category',
    description: 'This category should not appear in results',
    sort_order: 3
  });

  // Create test parameters
  await dataService.createParameter({
    id: 'sci-fi-tech-level',
    name: 'Technology Level',
    description: 'Level of technological advancement',
    type: 'select',
    category_id: 'science-fiction',
    sort_order: 1,
    parameter_values: [
      { id: 'near-future', label: 'Near Future' },
      { id: 'advanced', label: 'Advanced Technology' },
      { id: 'post-human', label: 'Post-Human' }
    ]
  });

  await dataService.createParameter({
    id: 'fantasy-magic-system',
    name: 'Magic System',
    description: 'Type of magical system',
    type: 'select',
    category_id: 'fantasy',
    sort_order: 1,
    parameter_values: [
      { id: 'elemental', label: 'Elemental Magic' },
      { id: 'divine', label: 'Divine Magic' },
      { id: 'arcane', label: 'Arcane Magic' }
    ]
  });

  await dataService.createParameter({
    id: 'story-length',
    name: 'Story Length',
    description: 'Length of the generated story',
    type: 'select',
    category_id: 'fantasy',
    sort_order: 2,
    parameter_values: [
      { id: 'short', label: 'Short (100-500 words)' },
      { id: 'medium', label: 'Medium (500-1000 words)' },
      { id: 'long', label: 'Long (1000+ words)' }
    ]
  });

  // Create test settings
  await dataService.setSetting('app_version', '2.0.0', 'string');
  await dataService.setSetting('max_generations_per_session', 50, 'number');
  await dataService.setSetting('enable_image_generation', true, 'boolean');
}

/**
 * Clean up test database
 */
async function cleanupTestDatabase() {
  try {
    await dataService.close();
    await fs.unlink(TEST_DB_PATH);
  } catch (err) {
    // Ignore cleanup errors
  }
}

// Setup and teardown
beforeAll(async () => {
  await initTestDatabase();
});

afterAll(async () => {
  await cleanupTestDatabase();
});

// Refresh database between tests to avoid conflicts
beforeEach(async () => {
  await initTestDatabase();
});

describe('SpecGen Server - System Endpoints', () => {
  test('GET / - Should return API information', async () => {
    const response = await request(app).get('/');
    
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('SpecGen API');
    expect(response.body.version).toBeDefined();
    expect(response.body.endpoints).toEqual({
      admin: '/api/admin',
      content: '/api/content', 
      system: '/api/system'
    });
  });

  test('GET /api/system/health - Should return health status', async () => {
    const response = await request(app).get('/api/system/health');
    
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.body.success).toBeDefined();
    expect(response.body.data.status).toMatch(/^(ok|degraded)$/);
    expect(response.body.data.database).toBe('connected');
    expect(response.body.data.environment).toBe('test');
    expect(typeof response.body.data.uptime).toBe('number');
  });

  test('POST /api/system/database/init - Should initialize database', async () => {
    const response = await request(app).post('/api/system/database/init');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Database initialized successfully');
  });

  test('GET /api/system/database/status - Should return database statistics', async () => {
    const response = await request(app).get('/api/system/database/status');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('connected');
    expect(response.body.data.statistics).toHaveProperty('categories');
    expect(response.body.data.statistics).toHaveProperty('parameters');
    expect(typeof response.body.data.statistics.categories).toBe('number');
  });

  test('GET /api/system/docs.json - Should return OpenAPI specification', async () => {
    const response = await request(app).get('/api/system/docs.json');
    
    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.0');
    expect(response.body.info.title).toBe('SpecGen API');
    expect(response.body.paths).toBeDefined();
  });

  test('GET /nonexistent - Should return 404 with helpful message', async () => {
    const response = await request(app).get('/nonexistent-endpoint');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Endpoint not found');
    expect(response.body.availableEndpoints).toEqual([
      '/api/admin', 
      '/api/content', 
      '/api/system'
    ]);
  });
});

describe('SpecGen Server - Admin Categories', () => {
  test('GET /api/admin/categories - Should return all categories', async () => {
    const response = await request(app).get('/api/admin/categories');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(3); // All categories (no visibility filtering)
    
    const categoryNames = response.body.data.map(c => c.name);
    expect(categoryNames).toContain('Science Fiction');
    expect(categoryNames).toContain('Fantasy');
    expect(categoryNames).toContain('Hidden Category');
  });

  test('GET /api/admin/categories/:id - Should return specific category', async () => {
    const response = await request(app).get('/api/admin/categories/science-fiction');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('science-fiction');
    expect(response.body.data.name).toBe('Science Fiction');
  });

  test('GET /api/admin/categories/:id - Should return 404 for non-existent category', async () => {
    const response = await request(app).get('/api/admin/categories/non-existent');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not found');
  });

  test('POST /api/admin/categories - Should create new category', async () => {
    const newCategory = {
      name: 'Cyberpunk',
      description: 'High tech, low life stories'
    };

    const response = await request(app)
      .post('/api/admin/categories')
      .send(newCategory);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Cyberpunk');
    expect(response.body.data.id).toBe('cyberpunk');
  });

  test('POST /api/admin/categories - Should validate required fields', async () => {
    const response = await request(app)
      .post('/api/admin/categories')
      .send({ description: 'Missing name field' });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Validation failed');
  });

  test('PUT /api/admin/categories/:id - Should update category', async () => {
    const updates = {
      description: 'Updated description for sci-fi'
    };

    const response = await request(app)
      .put('/api/admin/categories/science-fiction')
      .send(updates);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.description).toBe('Updated description for sci-fi');
    expect(response.body.data.name).toBe('Science Fiction'); // Should remain unchanged
  });

  test('DELETE /api/admin/categories/:id - Should delete category', async () => {
    const response = await request(app).delete('/api/admin/categories/fantasy');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('deleted successfully');

    // Verify category is gone
    const getResponse = await request(app).get('/api/admin/categories/fantasy');
    expect(getResponse.status).toBe(404);
  });
});

describe('SpecGen Server - Admin Parameters', () => {
  test('GET /api/admin/parameters - Should return all parameters', async () => {
    const response = await request(app).get('/api/admin/parameters');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    
    // Check parameter structure
    const param = response.body.data[0];
    expect(param).toHaveProperty('id');
    expect(param).toHaveProperty('name');
    expect(param).toHaveProperty('type');
    expect(param).toHaveProperty('category_id');
  });

  test('GET /api/admin/parameters?categoryId=science-fiction - Should filter by category', async () => {
    const response = await request(app)
      .get('/api/admin/parameters')
      .query({ categoryId: 'science-fiction' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    
    // All parameters should belong to science-fiction category
    response.body.data.forEach(param => {
      expect(param.category_id).toBe('science-fiction');
    });
  });

  test('GET /api/admin/parameters/:id - Should return specific parameter', async () => {
    const response = await request(app).get('/api/admin/parameters/sci-fi-tech-level');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('sci-fi-tech-level');
    expect(response.body.data.name).toBe('Technology Level');
    expect(response.body.data.category_id).toBe('science-fiction');
    expect(Array.isArray(response.body.data.parameter_values)).toBe(true);
  });

  test('POST /api/admin/parameters - Should create new parameter', async () => {
    const newParameter = {
      name: 'Character Count',
      description: 'Number of main characters',
      type: 'select',
      category_id: 'fantasy',
      parameter_values: [
        { id: '1', label: '1 Character' },
        { id: '2', label: '2 Characters' },
        { id: '3', label: '3 Characters' }
      ]
    };

    const response = await request(app)
      .post('/api/admin/parameters')
      .send(newParameter);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Character Count');
    expect(response.body.data.type).toBe('select');
  });

  test('POST /api/admin/parameters - Should validate category exists', async () => {
    const invalidParameter = {
      name: 'Test Parameter',
      type: 'text',
      category_id: 'non-existent-category'
    };

    const response = await request(app)
      .post('/api/admin/parameters')
      .send(invalidParameter);
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test('DELETE /api/admin/parameters/:id - Should delete parameter', async () => {
    const response = await request(app).delete('/api/admin/parameters/story-length');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Verify parameter is gone
    const getResponse = await request(app).get('/api/admin/parameters/story-length');
    expect(getResponse.status).toBe(404);
  });
});

describe('SpecGen Server - Admin Settings', () => {
  test('GET /api/admin/settings - Should return all settings', async () => {
    const response = await request(app).get('/api/admin/settings');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.data).toBe('object');
    expect(response.body.data.app_version).toBe('2.0.0');
    expect(response.body.data.max_generations_per_session).toBe(50);
    expect(response.body.data.enable_image_generation).toBe(true);
  });

  test('PUT /api/admin/settings - Should update settings', async () => {
    const updates = {
      max_generations_per_session: 20,
      enable_image_generation: false,
      new_setting: 'test value'
    };

    const response = await request(app)
      .put('/api/admin/settings')
      .send(updates);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.max_generations_per_session).toBe(20);
    expect(response.body.data.enable_image_generation).toBe(false);
    expect(response.body.data.new_setting).toBe('test value');
  });
});

describe('SpecGen Server - Content Management', () => {
  test('GET /api/content - Should return empty content list initially', async () => {
    const response = await request(app).get('/api/content');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(0);
  });

  test('GET /api/content/summary - Should return content summary', async () => {
    const response = await request(app).get('/api/content/summary');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('POST /api/generate - Should handle generation request with validation error', async () => {
    // Test without OpenAI key configured - should fail
    const response = await request(app)
      .post('/api/generate')
      .send({
        parameters: { category: 'science-fiction' },
        year: 2150
      });
    
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Internal Server Error'); // Generic error in test env
  });

  test('POST /api/generate - Should validate generation request schema', async () => {
    const response = await request(app)
      .post('/api/generate')
      .send({
        parameters: 'not-an-object'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Validation failed');
  });

  test('GET /api/content/:id - Should return 404 for non-existent content', async () => {
    const response = await request(app).get('/api/content/non-existent-id');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test('PUT /api/content/:id - Should update content title', async () => {
    // First create some content
    const contentData = {
      title: 'Original Title',
      fiction_content: 'Test story content',
      prompt_data: { test: 'data' },
      metadata: {}
    };
    const savedContent = await dataService.saveGeneratedContent(contentData);

    // Update the title
    const response = await request(app)
      .put(`/api/content/${savedContent.id}`)
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Updated Title');
  });

  test('PUT /api/content/:id - Should return 404 for non-existent content', async () => {
    const response = await request(app)
      .put('/api/content/non-existent-id')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test('DELETE /api/content/:id - Should delete content', async () => {
    // First create some content
    const contentData = {
      title: 'Test Title',
      fiction_content: 'Test story content',
      prompt_data: { test: 'data' },
      metadata: {}
    };
    const savedContent = await dataService.saveGeneratedContent(contentData);

    // Delete it
    const response = await request(app).delete(`/api/content/${savedContent.id}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('deleted successfully');

    // Verify it's gone
    const getResponse = await request(app).get(`/api/content/${savedContent.id}`);
    expect(getResponse.status).toBe(404);
  });

  test('DELETE /api/content/:id - Should return 404 for non-existent content', async () => {
    const response = await request(app).delete('/api/content/non-existent-id');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});

describe('SpecGen Server - Legacy Route Compatibility', () => {
  test('GET /api/categories - Should redirect to admin/categories', async () => {
    const response = await request(app).get('/api/categories');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('GET /api/parameters - Should redirect to admin/parameters', async () => {
    const response = await request(app).get('/api/parameters');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('GET /api/settings - Should redirect to admin/settings', async () => {
    const response = await request(app).get('/api/settings');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.data).toBe('object');
  });

  test('GET /api/health - Should redirect to system/health', async () => {
    const response = await request(app).get('/api/health');
    
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.body.success).toBeDefined();
    expect(response.body.data.status).toMatch(/^(ok|degraded)$/);
  });
});

describe('SpecGen Server - Error Handling', () => {
  test('Should handle validation errors properly', async () => {
    const response = await request(app)
      .post('/api/admin/categories')
      .send({ name: '' }); // Empty name should fail validation
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details).toBeDefined();
  });

  test('Should handle Boom errors properly', async () => {
    const response = await request(app).get('/api/admin/categories/non-existent');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not found');
  });

  test('Should handle malformed JSON', async () => {
    const response = await request(app)
      .post('/api/admin/categories')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');
    
    expect(response.status).toBe(400);
  });

  test('Should handle large payloads within limits', async () => {
    const largeDescription = 'x'.repeat(400); // Within limit (500 char max)
    
    const response = await request(app)
      .post('/api/admin/categories')
      .send({
        name: 'Large Category',
        description: largeDescription
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});