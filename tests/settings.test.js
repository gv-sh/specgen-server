/* global describe, test, expect, beforeAll, beforeEach, jest */

const { request, cleanDatabase, initDatabase } = require('./setup');
const settingsService = require('../services/settingsService');

// Mock the settings service
jest.mock('../services/settingsService', () => ({
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
  getSetting: jest.fn()
}));

const DEFAULT_SETTINGS = {
  ai: {
    models: {
      fiction: "gpt-4o-mini",
      image: "dall-e-3"
    },
    parameters: {
      fiction: {
        temperature: 0.8,
        max_tokens: 1000,
        default_story_length: 500,
        system_prompt: "You are a speculative fiction generator that creates compelling, imaginative stories based on the parameters provided by the user."
      },
      image: {
        size: "1024x1024",
        quality: "standard",
        prompt_suffix: "Use high-quality, photorealistic rendering with attention to lighting, detail, and composition. The image should be visually cohesive and striking."
      }
    }
  },
  defaults: {
    content_type: "fiction"
  }
};

describe('Settings API Tests', () => {
  // Setup before all tests
  beforeAll(async () => {
    await initDatabase();
    await cleanDatabase();
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    settingsService.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
  });

  test('GET /api/settings - Should return all settings', async () => {
    const response = await request.get('/api/settings');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('ai');
    expect(response.body.data.ai).toHaveProperty('models');
    expect(response.body.data.ai).toHaveProperty('parameters');
    expect(response.body.data).toHaveProperty('defaults');
    
    // Check that the service was called
    expect(settingsService.getSettings).toHaveBeenCalled();
  });

  test('PUT /api/settings - Should update settings', async () => {
    // Setup mock for update
    const updatedSettings = {
      ...DEFAULT_SETTINGS,
      ai: {
        ...DEFAULT_SETTINGS.ai,
        parameters: {
          ...DEFAULT_SETTINGS.ai.parameters,
          fiction: {
            ...DEFAULT_SETTINGS.ai.parameters.fiction,
            temperature: 0.9,
            max_tokens: 1500
          }
        }
      }
    };
    
    settingsService.updateSettings.mockResolvedValue(updatedSettings);
    
    // Send update request
    const updateData = {
      ai: {
        parameters: {
          fiction: {
            temperature: 0.9,
            max_tokens: 1500
          }
        }
      }
    };
    
    const response = await request.put('/api/settings').send(updateData);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.ai.parameters.fiction).toHaveProperty('temperature', 0.9);
    expect(response.body.data.ai.parameters.fiction).toHaveProperty('max_tokens', 1500);
    
    // Check that the service was called with correct data
    expect(settingsService.updateSettings).toHaveBeenCalledWith(updateData);
  });

  test('PUT /api/settings - Should handle service errors', async () => {
    // For this test, we'll mock the service to throw an error
    const errorMessage = 'Service error occurred';
    settingsService.updateSettings.mockImplementation(() => {
      // Return a rejected promise with our error message
      return Promise.reject(new Error(errorMessage));
    });
    
    // Send a valid update that will pass middleware validation
    const response = await request.put('/api/settings').send({
      test: "value"
    });
    
    // We expect a 500 from the controller's catch block
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error', 'Failed to update settings');
    expect(response.body).toHaveProperty('detail', errorMessage);
  });

  test('POST /api/settings/reset - Should reset settings to defaults', async () => {
    // Setup mock for reset
    settingsService.updateSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
    
    const response = await request.post('/api/settings/reset');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('reset to defaults');
    expect(response.body).toHaveProperty('data');
    
    // Verify the default settings are returned
    expect(response.body.data).toHaveProperty('ai');
    expect(response.body.data.ai).toHaveProperty('models');
    expect(response.body.data.ai.models).toHaveProperty('fiction', 'gpt-4o-mini');
    expect(response.body.data.ai.models).toHaveProperty('image', 'dall-e-3');
  });
});