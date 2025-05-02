/* global describe, test, expect, beforeAll, jest */

const { Buffer } = require('buffer');
const { request, createTestCategory, createTestParameters, cleanDatabase, initDatabase } = require('./setup');

const mockImageData = Buffer.from('test-image-data');

// Mock the AI service to avoid actual API calls
jest.mock('../services/aiService', () => ({
  generateContent: jest.fn().mockImplementation(async (parameters, type, year, providedTitle) => {
    // Create a response object based on content type
    let response;
    
    if (type === 'fiction') {
      response = {
        success: true,
        content: "This is a test story with mocked content.",
        title: "Mocked Story Title",
        year: year || 2050,
        metadata: {
          model: "gpt-4o-mini-mock",
          tokens: 100
        }
      };
    } else if (type === 'image') {
      response = {
        success: true,
        imageData: mockImageData,
        title: "Mocked Image Title",
        year: year || 2150,
        metadata: {
          model: "dall-e-3-mock",
          prompt: "Test prompt for image generation"
        }
      };
    } else if (type === 'combined') {
      response = {
        success: true,
        content: "This is a test story with mocked content for combined mode.",
        imageData: mockImageData,
        title: "Mocked Combined Title",
        year: year || 2100,
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
    } else {
      return { success: false, error: "Unsupported content type" };
    }
    
    // Important: Set title to null so that the controller will use the user-provided title
    // This is necessary because the controller uses: title: result.title || title || "Untitled Story"
    response.title = null;
    
    return response;
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

  test('POST /api/generate - Should generate content with year parameter', async () => {
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.dropdown.id]: parameters.dropdown.values[0].label
        }
      },
      year: 2075
    };
      
    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('year', 2075);
    expect(response.body).toHaveProperty('title');
    expect(response.body).toHaveProperty('metadata');
  });

  // We're mocking the generateController.js to avoid the call to AI service
  // This means we need to mock the entire behavior of the controller
  test('POST /api/generate - Should generate content with title parameter', async () => {
    // Override the mock for this specific test to return the provided title
    const originalMock = require('../services/aiService').generateContent;
    require('../services/aiService').generateContent.mockImplementationOnce(
      async (parameters, type) => ({
        success: true,
        content: "This is a test story with mocked content.",
        title: null, // This null value will make the controller use the provided title
        metadata: {
          model: "gpt-4o-mini-mock",
          tokens: 100
        }
      })
    );
    
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.slider.id]: 50
        }
      },
      title: "Custom Test Title"
    };
    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('title', "Custom Test Title");
    
    // Restore the original mock for other tests
    require('../services/aiService').generateContent = originalMock;
  });
  
  test('POST /api/generate - Should generate content with toggle parameter and use default title', async () => {
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
    expect(response.body).toHaveProperty('title'); // Should have a default title
    expect(response.body.title).toBeTruthy(); // Title should not be empty
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

  test('POST /api/generate - Should generate fiction content with both year and title', async () => {
    // Override the mock for this specific test
    const originalMock = require('../services/aiService').generateContent;
    require('../services/aiService').generateContent.mockImplementationOnce(
      async (parameters, type, year) => ({
        success: true,
        content: "This is a test story with mocked content.",
        title: null, // Null allows controller to use provided title
        year: year,
        metadata: {
          model: "gpt-4o-mini-mock",
          tokens: 100
        }
      })
    );
    
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.dropdown.id]: parameters.dropdown.values[0].label
        }
      },
      contentType: 'fiction',
      year: 2095,
      title: "My Custom Fiction Story"
    };
      
    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('metadata');
    expect(response.body).toHaveProperty('year', 2095);
    expect(response.body).toHaveProperty('title', "My Custom Fiction Story");
    expect(response.body).not.toHaveProperty('imageData');
    
    // Restore the original mock
    require('../services/aiService').generateContent = originalMock;
  });

  test('POST /api/generate - Should generate image content with title and year', async () => {
    // Override the mock for this specific test
    const originalMock = require('../services/aiService').generateContent;
    require('../services/aiService').generateContent.mockImplementationOnce(
      async (parameters, type, year) => ({
        success: true,
        imageData: mockImageData,
        title: null, // Null allows controller to use provided title
        year: year,
        metadata: {
          model: "dall-e-3-mock",
          prompt: "Test prompt for image generation"
        }
      })
    );
    
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.dropdown.id]: parameters.dropdown.values[0].label
        }
      },
      contentType: 'image',
      year: 2120,
      title: "My Custom Test Image"
    };
      
    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('imageData');
    expect(response.body).toHaveProperty('metadata');
    expect(response.body).toHaveProperty('year', 2120);
    expect(response.body).toHaveProperty('title', "My Custom Test Image");
    expect(response.body).not.toHaveProperty('content');
    expect(response.body.metadata).toHaveProperty('prompt');
    
    // Restore the original mock
    require('../services/aiService').generateContent = originalMock;
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

  test('POST /api/generate - Should generate combined content with title and year', async () => {
    // Override the mock for this specific test
    const originalMock = require('../services/aiService').generateContent;
    require('../services/aiService').generateContent.mockImplementationOnce(
      async (parameters, type, year) => ({
        success: true,
        content: "This is a test story with mocked content for combined mode.",
        imageData: mockImageData,
        title: null, // Null allows controller to use provided title
        year: year,
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
      })
    );
    
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.dropdown.id]: parameters.dropdown.values[0].label,
          [parameters.slider.id]: 50
        }
      },
      contentType: 'combined',
      year: 2200,
      title: "My Combined Story and Image"
    };
      
    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('imageData');
    expect(response.body).toHaveProperty('metadata');
    expect(response.body).toHaveProperty('year', 2200);
    expect(response.body).toHaveProperty('title', "My Combined Story and Image");
    
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
    
    // Restore the original mock
    require('../services/aiService').generateContent = originalMock;
  });
});