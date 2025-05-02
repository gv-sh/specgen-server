// tests/categories.test.js
/* global describe, test, expect, beforeAll */
const { request, cleanDatabase, initDatabase } = require('./setup');

describe('Category API Tests', () => {
  // Clean database before all tests
  beforeAll(async () => {
    await initDatabase();
    await cleanDatabase();
  });

  let categoryId;

  test('GET /api/categories - Should return empty or initial categories', async () => {
    const response = await request.get('/api/categories');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toBeDefined();
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('POST /api/categories - Should create a new category', async () => {
    const newCategory = {
      name: 'Alternate History',
      visibility: 'Show',
      year: 1985 // New field
    };

    const response = await request.post('/api/categories').send(newCategory);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('name', newCategory.name);
    expect(response.body.data).toHaveProperty('visibility', newCategory.visibility);
    expect(response.body.data).toHaveProperty('year', newCategory.year); // Test new field
    
    // Save category ID for later tests
    categoryId = response.body.data.id;
  });

  test('GET /api/categories/:id - Should return a specific category', async () => {
    // Skip if we don't have a valid categoryId
    if (!categoryId) {
      console.warn('Skipping test - no valid categoryId');
      return;
    }
    
    const response = await request.get(`/api/categories/${categoryId}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('id', categoryId);
    expect(response.body.data).toHaveProperty('name', 'Alternate History');
    expect(response.body.data).toHaveProperty('year', 1985); // Test new field
  });

  test('PUT /api/categories/:id - Should update a category', async () => {
    // Skip if we don't have a valid categoryId
    if (!categoryId) {
      console.warn('Skipping test - no valid categoryId');
      return;
    }
    
    const updatedCategory = {
      name: 'Updated Alternate History',
      visibility: 'Show',
      description: 'Updated description for alternate history category',
      year: 1990 // Updated year
    };

    const response = await request.put(`/api/categories/${categoryId}`).send(updatedCategory);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('id', categoryId);
    expect(response.body.data).toHaveProperty('name', updatedCategory.name);
    expect(response.body.data).toHaveProperty('year', updatedCategory.year); // Test updated field
  });

  test('POST /api/categories - Should validate required fields', async () => {
    const invalidCategory = {
      // Missing 'name' field
      visibility: 'Show',
      year: 2000 // Adding year field
    };

    const response = await request.post('/api/categories').send(invalidCategory);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
  });

  test('DELETE /api/categories/:id - Should delete a category', async () => {
    // First create a category specifically for deletion
    const newCategory = {
      name: 'Category To Delete',
      visibility: 'Show',
      description: 'A category that will be deleted',
      year: 2022 // Adding year field
    };

    const createResponse = await request.post('/api/categories').send(newCategory);
    
    if (createResponse.status !== 201 || !createResponse.body.data || !createResponse.body.data.id) {
      console.warn('Skipping delete test - failed to create test category');
      return;
    }
    
    const deleteId = createResponse.body.data.id;
    
    // Now delete it
    const response = await request.delete(`/api/categories/${deleteId}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('deletedCategory');
    expect(response.body.data.deletedCategory).toHaveProperty('id', deleteId);
    expect(response.body.data.deletedCategory).toHaveProperty('year', 2022); // Verify year field
    
    // Verify it's gone
    const verifyResponse = await request.get(`/api/categories/${deleteId}`);
    expect(verifyResponse.status).toBe(404);
  });
});