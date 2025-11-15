/**
 * Basic tests for simplified application structure
 */

import request from 'supertest';
import app from '../app.js';

describe('Simplified SpecGen API', () => {
  test('GET / - Should return API information', async () => {
    const response = await request(app).get('/');
    
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('SpecGen API');
    expect(response.body.endpoints).toHaveProperty('admin');
    expect(response.body.endpoints).toHaveProperty('content');
    expect(response.body.endpoints).toHaveProperty('system');
  });

  test('GET /api/system/health - Should return health status', async () => {
    const response = await request(app).get('/api/system/health');
    
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('status');
  });

  test('GET /api/admin/categories - Should return categories', async () => {
    const response = await request(app).get('/api/admin/categories');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('POST /api/admin/categories - Should create category with validation', async () => {
    const response = await request(app)
      .post('/api/admin/categories')
      .send({
        name: 'Test Category',
        description: 'A test category'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Test Category');
  });

  test('GET /nonexistent - Should return 404 with helpful message', async () => {
    const response = await request(app).get('/nonexistent');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty('availableEndpoints');
  });
});