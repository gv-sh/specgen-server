const { request, createTestCategory, createTestParameters, cleanDatabase, initDatabase } = require('./setup');

// Mock the AI service to avoid actual API calls
jest.mock('../services/aiService', () => ({
  generateContent: jest.fn().mockImplementation(async (parameters) => {
    console.log('Mocked AI Service Parameters:', JSON.stringify(parameters, null, 2));
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

  // Ensure category and parameters are created before tests
  beforeAll(async () => {
    await initDatabase();
    await cleanDatabase();
    
    // Create category
    category = await createTestCategory();
    console.log('Test Category:', JSON.stringify(category, null, 2));
    
    if (!category || !category.id) {
      throw new Error('Failed to create test category');
    }
    
    // Create parameters
    parameters = await createTestParameters(category.id);
    console.log('Test Parameters:', JSON.stringify(parameters, null, 2));
    
    if (!parameters.dropdown || !parameters.slider || !parameters.toggle) {
      throw new Error('Failed to create test parameters');
    }
  });

  // Diagnostic helper function
  const logTestDetails = (testName, payload) => {
    console.log(`\n--- ${testName} ---`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('Category ID:', category.id);
    console.log('Dropdown Parameter:', JSON.stringify(parameters.dropdown, null, 2));
  };

  test('POST /api/generate - Should generate content with dropdown parameter', async () => {
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.dropdown.id]: parameters.dropdown.values[0].label
        }
      }
    };
    
    logTestDetails('Dropdown Parameter Test', requestPayload);
  
    const response = await request.post('/api/generate').send(requestPayload);
    
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(response.body, null, 2));
    
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
});