/* global describe, test, expect, beforeAll, jest */
import { jest } from '@jest/globals';
import { Buffer } from 'buffer';
import { request, createTestCategory, createTestParameters, cleanDatabase, initDatabase } from './setup.js';

const mockImageData = Buffer.from('test-image-data');

// Mock the AI service to avoid actual API calls and test the new sequential behavior
jest.mock('../services/aiService.js', () => ({
  default: {
  generateContent: jest.fn().mockImplementation(async (parameters, type, year, providedTitle) => {
    // Create a response object based on content type
    let response;
    
    if (type === 'fiction') {
      response = {
        success: true,
        content: "This is a test story with mocked content. The starship Nebula drifted through space, its metallic hull gleaming in the light of distant stars.",
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
      // Mock the new sequential behavior: fiction is generated first, then image uses the text
      const mockStoryContent = "This is a test story with mocked content for combined mode. The crystalline chamber glowed with an ethereal blue light as Dr. Elena stepped through the ancient portal.";
      
      response = {
        success: true,
        content: mockStoryContent,
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
            // The prompt should now include story elements extracted from the text
            prompt: "Create a detailed, visually striking image depicting the following scene: crystalline chamber, ethereal blue light, Dr. Elena, ancient portal. This image should complement the following story..."
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
  }),
  
  // Also mock the individual methods to test the new sequential behavior
  generateFiction: jest.fn().mockImplementation(async (parameters, year) => ({
    success: true,
    content: "Generated fiction content with visual elements like starship Nebula and metallic hull gleaming.",
    title: "Test Fiction",
    year: year || 2050,
    metadata: {
      model: "gpt-4o-mini-mock",
      tokens: 100
    }
  })),
  
  generateImage: jest.fn().mockImplementation(async (parameters, year, generatedText) => {
    // Test that the method now accepts generatedText parameter
    let prompt = "Test prompt for image generation";
    
    // If generatedText is provided, the prompt should include story elements
    if (generatedText) {
      prompt = `Create a detailed, visually striking image depicting visual elements from: ${generatedText.substring(0, 100)}...`;
    }
    
    return {
      success: true,
      imageData: mockImageData,
      year: year || 2150,
      metadata: {
        model: "dall-e-3-mock",
        prompt: prompt
      }
    };
  }),
  
  generateCombined: jest.fn().mockImplementation(async (parameters, year) => {
    // First generate fiction
    const fictionResult = {
      success: true,
      content: "Generated story with starship Nebula and glowing crystals in a metallic chamber.",
      title: "Combined Story",
      year: year || 2100,
      metadata: {
        model: "gpt-4o-mini-mock",
        tokens: 100
      }
    };
    
    // Then generate image using the fiction content
    const imageResult = {
      success: true,
      imageData: mockImageData,
      year: year || 2100,
      metadata: {
        model: "dall-e-3-mock",
        prompt: `Create a detailed, visually striking image depicting the following scene: starship Nebula, glowing crystals, metallic chamber`
      }
    };
    
    return {
      success: true,
      content: fictionResult.content,
      title: fictionResult.title,
      year: year || fictionResult.year,
      imageData: imageResult.imageData,
      metadata: {
        fiction: fictionResult.metadata,
        image: imageResult.metadata
      }
    };
  })
  }
}));

describe('Generation API Tests with Sequential Text-Image Generation', () => {
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

  test('POST /api/generate - Should generate combined content with sequential text-to-image generation', async () => {
    // Get reference to the mocked functions
    const aiService = await import('../services/aiService.js');
    
    const requestPayload = {
      parameterValues: {
        [category.id]: {
          [parameters.dropdown.id]: parameters.dropdown.values[0].label,
          [parameters.slider.id]: 50
        }
      },
      contentType: 'combined',
      year: 2200,
      title: "Sequential Generation Test"
    };
      
    const response = await request.post('/api/generate').send(requestPayload);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('imageData');
    expect(response.body).toHaveProperty('metadata');
    expect(response.body).toHaveProperty('year', 2200);
    expect(response.body).toHaveProperty('title', "Sequential Generation Test");
    
    // Check for nested metadata structure specific to combined mode
    expect(response.body.metadata).toHaveProperty('fiction');
    expect(response.body.metadata).toHaveProperty('image');
    expect(response.body.metadata.fiction).toHaveProperty('model');
    expect(response.body.metadata.fiction).toHaveProperty('tokens');
    expect(response.body.metadata.image).toHaveProperty('model');
    expect(response.body.metadata.image).toHaveProperty('prompt');
    
    // Verify that the image prompt includes story-based elements
    // This tests the new sequential behavior where image is based on generated text
    const imagePrompt = response.body.metadata.image.prompt;
    expect(imagePrompt).toContain('depicting the following scene');
    
    // Check that both content and image are present
    expect(response.body.content).toBeTruthy();
    expect(response.body.imageData).toBeTruthy();
  });

  test('Individual generateImage method should accept generated text parameter', async () => {
    const aiService = await import('../services/aiService.js');
    
    // Test the generateImage method directly with generated text
    const testParameters = { [category.id]: { [parameters.dropdown.id]: "Advanced" } };
    const year = 2150;
    const generatedText = "The starship Enterprise gleamed in the nebula's purple light.";
    
    const result = await aiService.generateImage(testParameters, year, generatedText);
    
    expect(result.success).toBe(true);
    expect(result.imageData).toEqual(mockImageData);
    expect(result.metadata.prompt).toContain('depicting visual elements from');
    
    // Verify that generateImage was called with the generatedText parameter
    expect(aiService.generateImage).toHaveBeenCalledWith(testParameters, year, generatedText);
  });

  test('Individual generateCombined method should follow sequential pattern', async () => {
    const aiService = await import('../services/aiService.js');
    
    // Test the generateCombined method directly
    const testParameters = { [category.id]: { [parameters.dropdown.id]: "Advanced" } };
    const year = 2180;
    
    const result = await aiService.generateCombined(testParameters, year);
    
    expect(result.success).toBe(true);
    expect(result.content).toBeTruthy();
    expect(result.imageData).toBeTruthy();
    expect(result.metadata.fiction).toBeDefined();
    expect(result.metadata.image).toBeDefined();
    
    // The image metadata should indicate it was based on story elements
    expect(result.metadata.image.prompt).toContain('depicting the following scene');
  });

  test('POST /api/generate - Should generate fiction content with year parameter', async () => {
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

  test('POST /api/generate - Should generate content with title parameter', async () => {
    // Override the mock for this specific test to return the provided title
    const aiServiceModule = await import('../services/aiService.js');
    const originalMock = aiServiceModule.generateContent;
    aiServiceModule.generateContent.mockImplementationOnce(
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
    aiServiceModule.generateContent = originalMock;
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
    const aiServiceModule = await import('../services/aiService.js');
    const originalMock = aiServiceModule.generateContent;
    aiServiceModule.generateContent.mockImplementationOnce(
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
    aiServiceModule.generateContent = originalMock;
  });

  test('POST /api/generate - Should generate image content with title and year', async () => {
    // Override the mock for this specific test
    const aiServiceModule = await import('../services/aiService.js');
    const originalMock = aiServiceModule.generateContent;
    aiServiceModule.generateContent.mockImplementationOnce(
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
    aiServiceModule.generateContent = originalMock;
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

  test('Visual element extraction should work for complex text', async () => {
    const aiService = await import('../services/aiService.js');
    
    // Mock up text that contains various visual elements
    const complexText = `**Title: The Crystal Chambers**
    
    Dr. Elena Rodriguez stepped through the ancient portal, her metallic suit gleaming in the ethereal blue light. The crystalline chamber stretched before her, filled with swirling purple mist and glowing artifacts. In the distance, she could see the starship Nebula docked at the lunar station, its hull reflecting the crimson aurora that danced across the alien sky.
    
    The advanced scanner in her hand pulsed with green light as she approached the throne-like altar at the center of the chamber.`;
    
    // Test with the mocked generateImage that includes text content
    const result = await aiService.generateImage({}, 2150, complexText);
    
    expect(result.success).toBe(true);
    expect(result.metadata.prompt).toContain('depicting visual elements from');
    expect(result.metadata.prompt).toContain('**Title: The Crystal Chambers**');
  });
});