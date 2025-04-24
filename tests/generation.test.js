/* global describe, test, expect, beforeAll, jest */

const { Buffer } = require('buffer');
const { request, createTestCategory, createTestParameters, cleanDatabase, initDatabase } = require('./setup');

const mockImageData = Buffer.from('test-image-data');

// Mock the AI service to avoid actual API calls
jest.mock('../services/aiService', () => ({
  generateContent: jest.fn().mockImplementation(async (parameters, type) => {
    if (type === 'fiction') {
      return {
        success: true,
        content: "This is a test story with mocked content.",
        metadata: {
          model: "gpt-4o-mini-mock",
          tokens: 100
        }
      };
    } else if (type === 'image') {
      return {
        success: true,
        imageData: mockImageData,
        metadata: {
          model: "dall-e-3-mock",
          prompt: "Test prompt for image generation"
        }
      };
    }
    return { success: false, error: "Unsupported content type" };
  })
}));

describe('Generation API Tests', () => {
  let category;
  let parameters;

  // Ensure category and parameters are created before tests
  beforeAll(async () => {
    await initDatabase();
    await cleanDatabase();
    
    // Create category
    category = await createTestCategory();
    
    if (!category || !category.id) {
      throw new Error('Failed to create test category');
    }
    
    // Create parameters
    parameters = await createTestParameters(category.id);
    
    if (!parameters.dropdown || !parameters.slider || !parameters.toggle) {
      throw new Error('Failed to create test parameters');
    }
  });

  test('POST /api/generate - Should generate content with dropdown parameter', async () => {
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.dropdown.id]: parameters.dropdown.values[0].label
        }
      }
    };
      
    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('metadata');
  });

  test('POST /api/generate - Should generate content with slider parameter', async () => {
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.slider.id]: 50
        }
      }
    };
    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('content');
  });
  
  test('POST /api/generate - Should generate content with toggle parameter', async () => {
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.toggle.id]: true
        }
      }
    };
    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('content');
  });

  test('POST /api/generate - Should generate content with multiple parameters', async () => {
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.dropdown.id]: parameters.dropdown.values[0].label,
          [parameters.slider.id]: 75,
          [parameters.toggle.id]: false
        }
      }
    };
    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('metadata');
  });

  test('POST /api/generate - Should require parameters', async () => {
    const response = await request.post('/api/generate').send({});
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Parameters must be a non-null object');
  });

  test('POST /api/generate - Should reject invalid category ID', async () => {
    const requestPayload = {
      parameterValues: {
        ["invalid-category-id"]: {
          [parameters.dropdown.id]: parameters.dropdown.values[0].label
        }
      }
    };
    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Category');
    expect(response.body.error).toContain('not found');
   });

  test('POST /api/generate - Should reject invalid parameter ID', async () => {
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          ["invalid-param-id"]: parameters.dropdown.values[0].label
        }
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Parameter');
    expect(response.body.error).toContain('not found');
  });

  test('POST /api/generate - Should validate parameter values', async () => {
    // Invalid dropdown value
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.dropdown.id]: "Invalid Value"
        }
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('not valid for dropdown parameter');
  });

  test('POST /api/generate - Should validate slider range', async () => {
    // Out of range slider value
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.slider.id]: 150
        }
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('outside the range');
  });

  test('POST /api/generate - Should validate toggle value type', async () => {
    // Wrong type for toggle (string instead of boolean)
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.toggle.id]: "Not a boolean"
        }
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('must be a boolean');
  });

  test('POST /api/generate - Should generate fiction content when explicitly requested', async () => {
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.dropdown.id]: parameters.dropdown.values[0].label
        }
      },
      contentType: 'fiction'
    };
      
    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('metadata');
    expect(response.body).not.toHaveProperty('imageData');
  });

  test('POST /api/generate - Should generate image content when requested', async () => {
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.dropdown.id]: parameters.dropdown.values[0].label
        }
      },
      contentType: 'image'
    };
      
    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('imageData');
    expect(response.body).toHaveProperty('metadata');
    expect(response.body).not.toHaveProperty('content');
    expect(response.body.metadata).toHaveProperty('prompt');
  });

  test('POST /api/generate - Should reject invalid content type', async () => {
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.dropdown.id]: parameters.dropdown.values[0].label
        }
      },
      contentType: 'invalid-type'
    };
      
    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Content type must be either');
  });
});