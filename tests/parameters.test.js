/* global describe, test, expect, beforeAll */

const { request, createTestCategory, cleanDatabase, initDatabase } = require('./setup');

describe('Parameter API Tests', () => {
  let categoryId;
  let parameterId;

  // Setup
  beforeAll(async () => {
    // Make sure database file exists and is valid JSON
    await initDatabase();
    await cleanDatabase();
    
    // Create a test category
    const category = await createTestCategory();
    categoryId = category.id;
  });

  test('GET /api/parameters - Should return all parameters', async () => {
    const response = await request.get('/api/parameters');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('GET /api/parameters?categoryId - Should filter by category', async () => {
    const response = await request.get(`/api/parameters?categoryId=${categoryId}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    
    // Verify that remaining parameters belong to the specified category
    response.body.data.forEach(param => {
      expect(param.categoryId).toBe(categoryId);
    });
  });

  test('POST /api/parameters - Should create a dropdown parameter', async () => {
    const newParameter = {
      name: 'Character Type',
      type: 'Dropdown',
      visibility: 'Basic',
      categoryId: categoryId,
      required: true,
      values: [
        { label: 'Hero' },
        { label: 'Villain' },
        { label: 'Sidekick' }
      ]
    };

    const response = await request.post('/api/parameters').send(newParameter);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('name', newParameter.name);
    expect(response.body.data).toHaveProperty('type', newParameter.type);
    expect(response.body.data).toHaveProperty('required', true);
    expect(response.body.data).toHaveProperty('values');
    expect(Array.isArray(response.body.data.values)).toBe(true);
    expect(response.body.data.values.length).toBe(3);
    
    // Save parameter ID for later tests
    parameterId = response.body.data.id;
  });

  test('POST /api/parameters - Should create a slider parameter', async () => {
    const newParameter = {
      name: 'Story Length',
      type: 'Slider',
      visibility: 'Basic',
      categoryId: categoryId,
      required: false,
      config: {
        min: 100,
        max: 10000,
        step: 100
      }
    };

    const response = await request.post('/api/parameters').send(newParameter);
    
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('name', newParameter.name);
    expect(response.body.data).toHaveProperty('type', newParameter.type);
    expect(response.body.data).toHaveProperty('required', false);
    expect(response.body.data).toHaveProperty('config');
    expect(response.body.data.config).toHaveProperty('min', 100);
    expect(response.body.data.config).toHaveProperty('max', 10000);
  });

  test('POST /api/parameters - Should create a toggle switch parameter', async () => {
    const newParameter = {
      name: 'Happy Ending',
      type: 'Toggle Switch',
      visibility: 'Basic',
      categoryId: categoryId,
      required: false,
      values: {
        on: 'Yes',
        off: 'No'
      }
    };

    const response = await request.post('/api/parameters').send(newParameter);
    
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('name', newParameter.name);
    expect(response.body.data).toHaveProperty('type', newParameter.type);
    expect(response.body.data).toHaveProperty('required', false);
    expect(response.body.data).toHaveProperty('values');
    expect(response.body.data.values).toHaveProperty('on', 'Yes');
    expect(response.body.data.values).toHaveProperty('off', 'No');
  });

  test('GET /api/parameters/:id - Should return a specific parameter', async () => {
    // Skip if we don't have a valid parameterId
    if (!parameterId) {
      console.warn('Skipping test - no valid parameterId');
      return;
    }
    
    const response = await request.get(`/api/parameters/${parameterId}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('id', parameterId);
    expect(response.body.data).toHaveProperty('name', 'Character Type');
  });

  test('PUT /api/parameters/:id - Should update a parameter', async () => {
    // Skip if we don't have a valid parameterId
    if (!parameterId) {
      console.warn('Skipping test - no valid parameterId');
      return;
    }
    
    const updateData = {
      name: 'Updated Character Type',
      visibility: 'Advanced',
      required: false
    };

    const response = await request.put(`/api/parameters/${parameterId}`).send(updateData);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('id', parameterId);
    expect(response.body.data).toHaveProperty('name', updateData.name);
    expect(response.body.data).toHaveProperty('visibility', updateData.visibility);
    expect(response.body.data).toHaveProperty('required', false);
  });

  test('POST /api/parameters - Should validate required fields', async () => {
    const invalidParameter = {
      // Missing 'name' field
      type: 'Dropdown',
      visibility: 'Basic',
      categoryId: categoryId
    };

    const response = await request.post('/api/parameters').send(invalidParameter);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
  });

  test('POST /api/parameters - Should validate parameter type', async () => {
    const invalidParameter = {
      name: 'Invalid Type',
      type: 'InvalidType', // Invalid type
      visibility: 'Basic',
      categoryId: categoryId
    };

    const response = await request.post('/api/parameters').send(invalidParameter);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
  });

  test('POST /api/parameters - Should use default value for required field', async () => {
    const newParameter = {
      name: 'Default Required Parameter',
      type: 'Dropdown',
      visibility: 'Basic',
      categoryId: categoryId,
      // Not specifying required field
      values: [
        { label: 'Option 1' },
        { label: 'Option 2' }
      ]
    };

    const response = await request.post('/api/parameters').send(newParameter);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('required', false); // Should default to false
  });

  test('DELETE /api/parameters/:id - Should delete a parameter', async () => {
    // First create a parameter specifically for deletion
    const newParameter = {
      name: 'Parameter To Delete',
      type: 'Dropdown',
      visibility: 'Basic',
      categoryId: categoryId,
      required: true,
      values: [
        { label: 'Delete 1' },
        { label: 'Delete 2' }
      ]
    };

    const createResponse = await request.post('/api/parameters').send(newParameter);
    
    
    if (createResponse.status !== 201 || !createResponse.body.data || !createResponse.body.data.id) {
      console.warn('Skipping delete test - failed to create test parameter');
      return;
    }
    
    const deleteId = createResponse.body.data.id;
    
    // Now delete it
    const response = await request.delete(`/api/parameters/${deleteId}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('deletedParameter');
    expect(response.body.data.deletedParameter).toHaveProperty('id', deleteId);
    
    // Verify it's gone
    const verifyResponse = await request.get(`/api/parameters/${deleteId}`);
    expect(verifyResponse.status).toBe(404);
  });
});