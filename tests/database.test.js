/* global describe, test, expect, beforeEach, beforeAll, jest */

const { request, cleanDatabase, initDatabase } = require('./setup');
const fs = require('fs').promises;
const path = require('path');
const databaseService = require('../services/databaseService');

// Correct way to mock the entire module
jest.mock('../services/databaseService', () => ({
  getData: jest.fn(),
  saveData: jest.fn()
}));

describe('Database API Tests', () => {
  // Sample test data
  const sampleData = {
    categories: [
      { id: 1, name: 'Test Category' }
    ],
    parameters: [
      { id: 1, name: 'Test Parameter' }
    ]
  };

  // Setup before all tests
  beforeAll(async () => {
    await initDatabase();
    await cleanDatabase();
  });

  // Reset mocks before each test
  beforeEach(() => {
    // Clear all mocks to ensure clean state
    jest.clearAllMocks();
  });

  test('GET /api/database/download - Should successfully download database data', async () => {
    // Properly mock the getData method to return sample data
    databaseService.getData.mockResolvedValue(sampleData);

    const response = await request.get('/api/database/download');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual(sampleData);
    
    // Ensure getData was called
    expect(databaseService.getData).toHaveBeenCalledTimes(1);
  });

  test('GET /api/database/download - Should handle errors when data retrieval fails', async () => {
    // Properly mock getData to throw an error
    databaseService.getData.mockRejectedValue(new Error('Retrieval failed'));

    const response = await request.get('/api/database/download');
    
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error', 'Failed to download database');
  });

  test('POST /api/database/restore - Should successfully restore database from a valid file', async () => {
    // Prepare a temporary file with test data
    const tempFilePath = path.join(path.resolve('.'), 'tests/test-restore.json');
    await fs.writeFile(tempFilePath, JSON.stringify(sampleData));

    // Mock saveData method to resolve successfully
    databaseService.saveData.mockResolvedValue();

    const response = await request
      .post('/api/database/restore')
      .attach('file', tempFilePath);
    
    // Clean up temporary file
    await fs.unlink(tempFilePath);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Database restored successfully'
    });

    // Ensure saveData was called with correct data
    expect(databaseService.saveData).toHaveBeenCalledWith(sampleData);
  });

  test('POST /api/database/restore - Should reject restore with no file', async () => {
    const response = await request.post('/api/database/restore');
    
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'No file uploaded'
    });
  });

  test('POST /api/database/restore - Should reject restore with invalid JSON', async () => {
    // Prepare a temporary file with invalid JSON
    const tempFilePath = path.join(path.resolve('.'), 'tests/invalid-test.json');
    await fs.writeFile(tempFilePath, 'Invalid JSON');

    const response = await request
      .post('/api/database/restore')
      .attach('file', tempFilePath);
    
    // Clean up temporary file
    await fs.unlink(tempFilePath);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Invalid JSON file'
    });
  });

  test('POST /api/database/restore - Should reject restore with invalid database structure', async () => {
    // Prepare a temporary file with invalid database structure
    // Prepare the file path
    const tempFilePath = path.join(path.resolve('.'), 'tests/invalid-structure.json');
    await fs.writeFile(tempFilePath, JSON.stringify({
      invalid: 'structure'
    }));

    const response = await request
      .post('/api/database/restore')
      .attach('file', tempFilePath);
    
    // Clean up temporary file
    await fs.unlink(tempFilePath);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Invalid database structure. File must contain categories and parameters arrays.'
    });
  });

  test('POST /api/database/reset - Should successfully reset the database', async () => {
    // Mock saveData method to resolve successfully
    databaseService.saveData.mockResolvedValue();

    const response = await request.post('/api/database/reset');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Database reset successfully'
    });

    // Ensure saveData was called with empty database
    expect(databaseService.saveData).toHaveBeenCalledWith({
      categories: [],
      parameters: []
    });
  });

  test('POST /api/database/reset - Should handle errors during database reset', async () => {
    // Mock saveData to reject with an error
    databaseService.saveData.mockRejectedValue(new Error('Reset failed'));

    const response = await request.post('/api/database/reset');
    
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error', 'Failed to reset database');
  });
});