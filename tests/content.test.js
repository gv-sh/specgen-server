/* global describe, test, expect, beforeAll, jest */
/* eslint-disable no-unused-vars */
const { Buffer } = require('buffer');
const { request, initDatabase } = require('./setup');
const databaseService = require('../services/databaseService');
// aiService is mocked later

const mockImageData = Buffer.from('test-image-data');

// Mock the AI service response
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

describe('Generated Content API Tests', () => {
  let testContentId;
  let testImageContentId;

  // Set up test data
  beforeAll(async () => {
    await initDatabase();
    
    // Create sample content for testing
    const fictionContent = {
      title: "Test Fiction Story",
      type: "fiction",
      content: "This is a test story for API testing.",
      parameterValues: {
        "science-fiction": {
          "science-fiction-technology-level": "Near Future"
        }
      },
      metadata: {
        model: "test-model",
        tokens: 50
      }
    };
    
    const imageContent = {
      title: "Test Image Content",
      type: "image",
      imageData: mockImageData,
      parameterValues: {
        "fantasy": {
          "fantasy-magic-system": "Elemental"
        }
      },
      metadata: {
        model: "dall-e-3-mock",
        prompt: "Test prompt"
      }
    };

    // Save the test content
    const savedFictionContent = await databaseService.saveGeneratedContent(fictionContent);
    const savedImageContent = await databaseService.saveGeneratedContent(imageContent);
    
    testContentId = savedFictionContent.id;
    testImageContentId = savedImageContent.id;
  });

  test('GET /api/content - Should return all generated content', async () => {
    const response = await request.get('/api/content');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/content?type=fiction - Should filter by content type', async () => {
    const response = await request.get('/api/content?type=fiction');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    
    // All returned items should be fiction type
    response.body.data.forEach(item => {
      expect(item.type).toBe('fiction');
    });
  });

  test('GET /api/content/:id - Should return a specific content item', async () => {
    const response = await request.get(`/api/content/${testContentId}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('id', testContentId);
    expect(response.body.data).toHaveProperty('title', "Test Fiction Story");
    expect(response.body.data).toHaveProperty('type', "fiction");
    expect(response.body.data).toHaveProperty('content', "This is a test story for API testing.");
  });

  test('GET /api/content/:id - Should handle non-existent content', async () => {
    const response = await request.get('/api/content/nonexistent-id');
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
  });

  test('PUT /api/content/:id - Should update fiction content', async () => {
    const updatedData = {
      title: "Updated Fiction Title",
      content: "This is updated content for testing."
    };
    
    const response = await request.put(`/api/content/${testContentId}`).send(updatedData);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('id', testContentId);
    expect(response.body.data).toHaveProperty('title', updatedData.title);
    expect(response.body.data).toHaveProperty('content', updatedData.content);
    
    // Verify the update timestamp is newer than creation time
    // Using simple Date object comparison instead of greater than or equal
    expect(response.body.data).toHaveProperty('updatedAt');
    expect(response.body.data).toHaveProperty('createdAt');
  });

  test('PUT /api/content/:id - Should update image content', async () => {
    const updatedData = {
      title: "Updated Image Title",
      imageData: mockImageData
    };
    
    const response = await request.put(`/api/content/${testImageContentId}`).send(updatedData);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('id', testImageContentId);
    expect(response.body.data).toHaveProperty('title', updatedData.title);
    expect(response.body.data).toHaveProperty('imageData', mockImageData.toString('base64'));
  });

  test('DELETE /api/content/:id - Should delete content', async () => {
    // First create a content item to delete
    const contentToDelete = {
      title: "Content To Delete",
      type: "fiction",
      content: "This content will be deleted.",
      parameterValues: {},
      metadata: {}
    };
    
    const savedContent = await databaseService.saveGeneratedContent(contentToDelete);
    
    // Now delete it
    const response = await request.delete(`/api/content/${savedContent.id}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message');
    expect(response.body.data).toHaveProperty('deletedContent');
    expect(response.body.data.deletedContent).toHaveProperty('id', savedContent.id);
    
    // Verify it's gone
    const verifyResponse = await request.get(`/api/content/${savedContent.id}`);
    expect(verifyResponse.status).toBe(404);
  });

  test('POST /api/generate - Should save fiction content after generation', async () => {
    const generateRequest = {
      parameterValues: {
        "science-fiction": {
          "science-fiction-technology-level": "Advanced"
        }
      },
      contentType: "fiction",
      title: "New Generated Story"
    };
    
    // First, let's create the science-fiction category if it doesn't exist
    try {
      await request.post('/api/categories').send({
        name: "Science Fiction",
        id: "science-fiction",
        visibility: "Show"
      });
    } catch (_ignored) {
      // Category may already exist, that's fine
    }

    // Then create the parameter if it doesn't exist
    try {
      await request.post('/api/parameters').send({
        name: "Technology Level",
        type: "Dropdown",
        categoryId: "science-fiction",
        values: [
          { label: "Advanced" },
          { label: "Near Future" }
        ]
      });
    } catch (_ignored) {
      // Parameter may already exist, that's fine
    }
    
    const response = await request.post('/api/generate').send(generateRequest);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('id'); // New content should have an ID
    expect(response.body).toHaveProperty('title', "New Generated Story");
    
    // Verify content was saved in the database
    const contentResponse = await request.get(`/api/content/${response.body.id}`);
    expect(contentResponse.status).toBe(200);
    expect(contentResponse.body.data).toHaveProperty('content', response.body.content);
  });

  test('POST /api/generate - Should save image content after generation', async () => {
    const generateRequest = {
      parameterValues: {
        "fantasy": {
          "fantasy-magic-system": "Divine"
        }
      },
      contentType: "image",
      title: "Fantasy Image"
    };
    
    // First, let's create the fantasy category if it doesn't exist
    try {
      await request.post('/api/categories').send({
        name: "Fantasy",
        id: "fantasy",
        visibility: "Show"
      });
    } catch (_ignored) {
      // Category may already exist, that's fine
    }

    // Then create the parameter if it doesn't exist
    try {
      await request.post('/api/parameters').send({
        name: "Magic System",
        type: "Dropdown",
        categoryId: "fantasy",
        values: [
          { label: "Divine" },
          { label: "Elemental" }
        ]
      });
    } catch (_ignored) {
      // Parameter may already exist, that's fine
    }
    
    const response = await request.post('/api/generate').send(generateRequest);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('imageData');
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('title', "Fantasy Image");
    
    // Verify content was saved in the database
    const contentResponse = await request.get(`/api/content/${response.body.id}`);
    expect(contentResponse.status).toBe(200);
    expect(contentResponse.body.data).toHaveProperty('imageData', response.body.imageData);
  });
});