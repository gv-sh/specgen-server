/**
 * Comprehensive Tests for SpecGen Server
 * Single file testing all endpoints with SQLite database support
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';

import app from './server.js';
import { dataService } from './services.js';
import config from './config.js';

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

  // Initialize new database
  await dataService.init();

  // Create database schema
  await dataService.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      visibility TEXT DEFAULT 'Show' CHECK(visibility IN ('Show', 'Hide')),
      year INTEGER,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataService.run(`
    CREATE TABLE IF NOT EXISTS parameters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      type TEXT NOT NULL CHECK(type IN ('select', 'text', 'number', 'boolean', 'range')),
      visibility TEXT DEFAULT 'Basic' CHECK(visibility IN ('Basic', 'Advanced', 'Hide')),
      category_id TEXT NOT NULL,
      required INTEGER DEFAULT 0 CHECK(required IN (0, 1)),
      sort_order INTEGER DEFAULT 0,
      parameter_values TEXT,
      parameter_config TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  await dataService.run(`
    CREATE TABLE IF NOT EXISTS generated_content (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      fiction_content TEXT NOT NULL,
      image_blob BLOB,
      image_thumbnail BLOB,
      image_format TEXT DEFAULT 'png',
      image_prompt TEXT,
      prompt_data TEXT,
      metadata TEXT,
      generation_time INTEGER DEFAULT 0,
      word_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'generating', 'completed', 'failed')),
      share_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataService.run(`
    CREATE TABLE IF NOT EXISTS instagram_shares (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL,
      user_instagram_handle TEXT,
      caption TEXT,
      hashtags TEXT,
      share_status TEXT DEFAULT 'pending' CHECK(share_status IN ('pending', 'success', 'failed')),
      instagram_media_id TEXT,
      instagram_post_url TEXT,
      retry_data TEXT,
      shared_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (content_id) REFERENCES generated_content(id) ON DELETE CASCADE
    )
  `);

  await dataService.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      data_type TEXT DEFAULT 'string' CHECK(data_type IN ('string', 'number', 'boolean', 'json'))
    )
  `);

  // Create test categories
  await dataService.createCategory({
    id: 'science-fiction',
    name: 'Science Fiction',
    description: 'Stories set in the future with advanced technology',
    visibility: 'Show',
    year: 2150,
    sort_order: 1
  });

  await dataService.createCategory({
    id: 'fantasy',
    name: 'Fantasy', 
    description: 'Stories with magic and mythical creatures',
    visibility: 'Show',
    year: 1250,
    sort_order: 2
  });

  await dataService.createCategory({
    id: 'hidden-category',
    name: 'Hidden Category',
    description: 'This category should not appear in results',
    visibility: 'Hide',
    year: 2000,
    sort_order: 3
  });

  // Create test parameters
  await dataService.createParameter({
    id: 'sci-fi-tech-level',
    name: 'Technology Level',
    description: 'Level of technological advancement',
    type: 'select',
    visibility: 'Basic',
    category_id: 'science-fiction',
    required: false,
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
    visibility: 'Basic',
    category_id: 'fantasy',
    required: true,
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
    type: 'range',
    visibility: 'Advanced',
    category_id: 'fantasy',
    required: false,
    sort_order: 2,
    parameter_config: { min: 100, max: 2000, step: 50 }
  });

  // Create test settings
  await dataService.setSetting('api_version', '2.0.0', 'string');
  await dataService.setSetting('max_generations_per_hour', 10, 'number');
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
  test('GET /api/admin/categories - Should return visible categories', async () => {
    const response = await request(app).get('/api/admin/categories');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(2); // Only visible categories
    
    const categoryNames = response.body.data.map(c => c.name);
    expect(categoryNames).toContain('Science Fiction');
    expect(categoryNames).toContain('Fantasy');
    expect(categoryNames).not.toContain('Hidden Category');
  });

  test('GET /api/admin/categories/:id - Should return specific category', async () => {
    const response = await request(app).get('/api/admin/categories/science-fiction');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('science-fiction');
    expect(response.body.data.name).toBe('Science Fiction');
    expect(response.body.data.year).toBe(2150);
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
      description: 'High tech, low life stories',
      visibility: 'Show',
      year: 2077
    };

    const response = await request(app)
      .post('/api/admin/categories')
      .send(newCategory);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Cyberpunk');
    expect(response.body.data.id).toBe('cyberpunk');
    expect(response.body.data.year).toBe(2077);
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
      description: 'Updated description for sci-fi',
      year: 2200
    };

    const response = await request(app)
      .put('/api/admin/categories/science-fiction')
      .send(updates);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.description).toBe('Updated description for sci-fi');
    expect(response.body.data.year).toBe(2200);
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
      type: 'number',
      visibility: 'Basic',
      category_id: 'fantasy',
      required: false,
      parameter_config: { min: 1, max: 10, step: 1 }
    };

    const response = await request(app)
      .post('/api/admin/parameters')
      .send(newParameter);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Character Count');
    expect(response.body.data.type).toBe('number');
    expect(response.body.data.parameter_config).toEqual({ min: 1, max: 10, step: 1 });
  });

  test('POST /api/admin/parameters - Should validate category exists', async () => {
    const invalidParameter = {
      name: 'Test Parameter',
      type: 'text',
      category_id: 'non-existent-category',
      visibility: 'Basic'
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
    expect(response.body.data.api_version).toBe('2.0.0');
    expect(response.body.data.max_generations_per_hour).toBe(10);
    expect(response.body.data.enable_image_generation).toBe(true);
  });

  test('PUT /api/admin/settings - Should update settings', async () => {
    const updates = {
      max_generations_per_hour: 20,
      enable_image_generation: false,
      new_setting: 'test value'
    };

    const response = await request(app)
      .put('/api/admin/settings')
      .send(updates);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.max_generations_per_hour).toBe(20); // Now properly typed
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

  test('PUT /api/content/:id - Should return not implemented', async () => {
    const response = await request(app)
      .put('/api/content/some-id')
      .send({ title: 'Updated Title' });
    
    expect(response.status).toBe(501);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not yet implemented');
  });

  test('DELETE /api/content/:id - Should return not implemented', async () => {
    const response = await request(app).delete('/api/content/some-id');
    
    expect(response.status).toBe(501);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not yet implemented');
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
    const largeDescription = 'x'.repeat(1000); // Within limit
    
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

describe('SpecGen Server - Instagram Sharing', () => {
  test('Should create Instagram share record', async () => {
    // First create some test content
    const contentData = {
      title: 'Test Story',
      fiction_content: 'This is a test story for Instagram sharing.',
      word_count: 10,
      metadata: { test: true }
    };
    
    const content = await dataService.saveGeneratedContent(contentData);
    
    // Create Instagram share
    const shareData = {
      user_instagram_handle: 'testuser',
      caption: 'Amazing AI story!',
      hashtags: ['#ai', '#story', '#test']
    };
    
    const share = await dataService.createInstagramShare(content.id, shareData);
    
    expect(share.content_id).toBe(content.id);
    expect(share.user_instagram_handle).toBe('testuser');
    expect(share.caption).toBe('Amazing AI story!');
    expect(share.hashtags).toEqual(['#ai', '#story', '#test']);
    expect(share.share_status).toBe('pending');
    expect(share.retry_data.attempt_count).toBe(0);
  });

  test('Should get Instagram shares by content ID', async () => {
    const contentData = {
      title: 'Test Story 2',
      fiction_content: 'Another test story.',
      word_count: 5
    };
    
    const content = await dataService.saveGeneratedContent(contentData);
    
    // Create multiple shares
    await dataService.createInstagramShare(content.id, { user_instagram_handle: 'user1' });
    await dataService.createInstagramShare(content.id, { user_instagram_handle: 'user2' });
    
    const shares = await dataService.getInstagramSharesByContentId(content.id);
    
    expect(shares).toHaveLength(2);
    expect(shares[0].user_instagram_handle).toBe('user2'); // Newest first
    expect(shares[1].user_instagram_handle).toBe('user1');
  });

  test('Should update Instagram share status', async () => {
    const contentData = {
      title: 'Test Story 3',
      fiction_content: 'Test story for status update.',
      word_count: 6
    };
    
    const content = await dataService.saveGeneratedContent(contentData);
    const share = await dataService.createInstagramShare(content.id, { user_instagram_handle: 'testuser' });
    
    // Update to success
    const updatedShare = await dataService.updateInstagramShareStatus(share.id, 'success', {
      instagram_media_id: 'IG123456',
      instagram_post_url: 'https://instagram.com/p/123456'
    });
    
    expect(updatedShare.share_status).toBe('success');
    expect(updatedShare.instagram_media_id).toBe('IG123456');
    expect(updatedShare.instagram_post_url).toBe('https://instagram.com/p/123456');
    expect(updatedShare.shared_at).toBeDefined();
  });

  test('Should get failed Instagram shares for retry', async () => {
    const contentData = {
      title: 'Test Story 4',
      fiction_content: 'Failed story share.',
      word_count: 4
    };
    
    const content = await dataService.saveGeneratedContent(contentData);
    const share = await dataService.createInstagramShare(content.id, { user_instagram_handle: 'failuser' });
    
    // Update to failed with retry data
    await dataService.updateInstagramShareStatus(share.id, 'failed', {
      retry_data: {
        attempt_count: 1,
        last_attempt_at: new Date().toISOString(),
        error_message: 'API rate limit exceeded'
      }
    });
    
    const failedShares = await dataService.getFailedInstagramShares(3);
    
    expect(failedShares).toHaveLength(1);
    expect(failedShares[0].share_status).toBe('failed');
    expect(failedShares[0].retry_data.attempt_count).toBe(1);
    expect(failedShares[0].retry_data.error_message).toBe('API rate limit exceeded');
  });

  test('Should filter out shares exceeding max retry attempts', async () => {
    const contentData = {
      title: 'Test Story 5',
      fiction_content: 'Max retries exceeded.',
      word_count: 4
    };
    
    const content = await dataService.saveGeneratedContent(contentData);
    const share = await dataService.createInstagramShare(content.id, { user_instagram_handle: 'maxuser' });
    
    // Update to failed with max retries exceeded
    await dataService.updateInstagramShareStatus(share.id, 'failed', {
      retry_data: {
        attempt_count: 5, // Exceeds default max of 3
        last_attempt_at: new Date().toISOString(),
        error_message: 'Max retries exceeded'
      }
    });
    
    const failedShares = await dataService.getFailedInstagramShares(3);
    
    // Should be filtered out
    expect(failedShares.some(s => s.id === share.id)).toBe(false);
  });
});