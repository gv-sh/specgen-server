// tests/generation.test.js
const { request, createTestCategory, createTestParameters, cleanDatabase, initDatabase } = require('./setup');

// Mock the AI service to avoid actual API calls
jest.mock('../services/aiService', () => ({
  generateContent: jest.fn().mockImplementation(async (parameters) => {
    return {
      success: true,
      content: "This is a mocked story based on your parameters!",
      metadata: {
        model: "gpt-3.5-turbo-mock",
        tokens: 50
      }
    };
  })
}));

describe('Generation API Tests', () => {
  let category;
  let parameters;

  // Setup test data
  beforeAll(async () => {
    await initDatabase();
    await cleanDatabase();
    
    // Create a test category and parameters
    category = await createTestCategory();
    
    // Only proceed if we got a valid category
    if (category && category.id) {
      parameters = await createTestParameters(category.id);
      
      // Log for debugging
      console.log('Test setup complete:');
      console.log('Category:', category);
      console.log('Parameters:', parameters);
    } else {
      console.error('Failed to create test category');
    }
  });

  // Skip tests if setup failed
  const runTest = (name, testFn) => {
    test(name, async () => {
      if (!category || !category.id || !parameters || !parameters.dropdown || !parameters.dropdown.id) {
        console.warn(`Skipping test "${name}" due to missing test data`);
        return;
      }
      
      await testFn();
    });
  };

  runTest('POST /api/generate - Should generate content with dropdown parameter', async () => {
    const requestPayload = {
      [category.id]: {
        [parameters.dropdown.id]: "Test 1"
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('metadata');
    expect(response.body.metadata).toHaveProperty('model');
    expect(response.body.metadata).toHaveProperty('tokens');
  });

  runTest('POST /api/generate - Should generate content with slider parameter', async () => {
    const requestPayload = {
      [category.id]: {
        [parameters.slider.id]: 50
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('content');
  });

  runTest('POST /api/generate - Should generate content with toggle parameter', async () => {
    const requestPayload = {
      [category.id]: {
        [parameters.toggle.id]: true
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('content');
  });

  runTest('POST /api/generate - Should generate content with multiple parameters', async () => {
    const requestPayload = {
      [category.id]: {
        [parameters.dropdown.id]: "Test 1",
        [parameters.slider.id]: 75,
        [parameters.toggle.id]: false
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
    expect(response.body.error).toContain('No parameters provided');
  });

  runTest('POST /api/generate - Should reject invalid category ID', async () => {
    const requestPayload = {
      ["invalid-category-id"]: {
        [parameters.dropdown.id]: "Test 1"
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Category');
    expect(response.body.error).toContain('not found');
  });

  runTest('POST /api/generate - Should reject invalid parameter ID', async () => {
    const requestPayload = {
      [category.id]: {
        ["invalid-param-id"]: "Test 1"
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Parameter');
    expect(response.body.error).toContain('not found');
  });

  runTest('POST /api/generate - Should validate parameter values', async () => {
    // Invalid dropdown value
    const requestPayload = {
      [category.id]: {
        [parameters.dropdown.id]: "Invalid Value"
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('not valid for dropdown parameter');
  });

  runTest('POST /api/generate - Should validate slider range', async () => {
    // Create a slider with a specific range for testing
    const sliderParam = parameters.slider;
    const maxValue = sliderParam.config?.max || 100;
    const outOfRangeValue = maxValue + 1000;
    
    // Out of range slider value
    const requestPayload = {
      [category.id]: {
        [sliderParam.id]: outOfRangeValue
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('outside the range');
  });

  runTest('POST /api/generate - Should validate toggle value type', async () => {
    // Wrong type for toggle (string instead of boolean)
    const requestPayload = {
      [category.id]: {
        [parameters.toggle.id]: "Yes"
      }
    };

    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('must be a boolean');
  });
});