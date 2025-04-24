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
    } else if (type === 'combined') {
      return {
        success: true,
        content: "This is a test story with mocked content for combined mode.",
        imageData: mockImageData,
        metadata: {
          fiction: {
            model: "gpt-4o-mini-mock",
            tokens: 100
          },
          image: {
            model: "dall-e-3-mock",
            prompt: "Test prompt for image generation"
          }
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

  test('POST /api/generate - Should handle invalid category ID by skipping', async () => {
    const requestPayload = {
      parameterValues: {
        ["invalid-category-id"]: {
          [parameters.dropdown.id]: parameters.dropdown.values[0].label
        }
      }
    };
    const response = await request.post('/api/generate').send(requestPayload);
    
    // Should still return 200 but with empty parameter set
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
   });

  test('POST /api/generate - Should handle invalid parameter ID by skipping', async () => {
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          ["invalid-param-id"]: parameters.dropdown.values[0].label
        }
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    // Should still return 200 but with filtered parameters
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });

  test('POST /api/generate - Should skip invalid parameter values', async () => {
    // Invalid dropdown value
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.dropdown.id]: "Invalid Value"
        }
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    // Should still return 200 but with filtered parameters
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });

  test('POST /api/generate - Should skip out-of-range slider values', async () => {
    // Out of range slider value
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.slider.id]: 150
        }
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    // Should still return 200 but with filtered parameters
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });

  test('POST /api/generate - Should skip invalid toggle value types', async () => {
    // Wrong type for toggle (string instead of boolean)
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.toggle.id]: "Not a boolean"
        }
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    // Should still return 200 but with filtered parameters
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
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
    expect(response.body.error).toContain('fiction');
    expect(response.body.error).toContain('image');
    expect(response.body.error).toContain('combined');
  });

  test('POST /api/generate - Should generate combined content when requested', async () => {
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.dropdown.id]: parameters.dropdown.values[0].label,
          [parameters.slider.id]: 50
        }
      },
      contentType: 'combined'
    };
      
    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('imageData');
    expect(response.body).toHaveProperty('metadata');
    
    // Check for nested metadata structure specific to combined mode
    expect(response.body.metadata).toHaveProperty('fiction');
    expect(response.body.metadata).toHaveProperty('image');
    expect(response.body.metadata.fiction).toHaveProperty('model');
    expect(response.body.metadata.fiction).toHaveProperty('tokens');
    expect(response.body.metadata.image).toHaveProperty('model');
    expect(response.body.metadata.image).toHaveProperty('prompt');
    
    // Check that both content and image are present
    expect(response.body.content).toBeTruthy();
    expect(response.body.imageData).toBeTruthy();
  });
});