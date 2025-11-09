/* global beforeAll, afterAll */
import { jest } from '@jest/globals';

jest.mock('../swagger.js');
import app from '../index.js';
import supertest from 'supertest';
import path from 'path';
import fs from 'fs/promises';

// Create a supertest instance with our app
const request = supertest(app);

// Get __dirname equivalent in ES modules
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database file paths
const DATABASE_PATH = path.join(__dirname, '../data/database.json');
const TEST_DATABASE_PATH = path.join(__dirname, '../data/test-database.json');

// Initialize the database file with empty structure
const initDatabase = async () => {
  try {
    // Make sure the directory exists
    await fs.mkdir(path.dirname(DATABASE_PATH), { recursive: true });
    
    // Create a test database structure
    const initialData = { 
      categories: [
        {
          id: 'science-fiction',
          name: 'Science Fiction',
          visibility: 'Show',
          description: 'Stories set in the future with advanced technology',
          year: 2150
        },
        {
          id: 'fantasy',
          name: 'Fantasy',
          visibility: 'Show',
          description: 'Stories with magic and mythical creatures',
          year: 1250
        }
      ], 
      parameters: [
        {
          id: 'science-fiction-technology-level',
          name: 'Technology Level',
          type: 'Dropdown',
          visibility: 'Basic',
          categoryId: 'science-fiction',
          description: 'The level of technological advancement in the story',
          values: [
            { id: 'near-future', label: 'Near Future' },
            { id: 'advanced', label: 'Advanced' }
          ],
          config: {}
        },
        {
          id: 'fantasy-magic-system',
          name: 'Magic System',
          type: 'Dropdown',
          visibility: 'Basic',
          categoryId: 'fantasy',
          description: 'Type of magic system in the story',
          values: [
            { id: 'elemental', label: 'Elemental' },
            { id: 'divine', label: 'Divine' }
          ],
          config: {}
        }
      ],
      generatedContent: []
    };
    
    // Write initial data
    await fs.writeFile(TEST_DATABASE_PATH, JSON.stringify(initialData, null, 2), 'utf8');
    await fs.copyFile(TEST_DATABASE_PATH, DATABASE_PATH);
    
  } catch (e) {
    console.error(`Error initializing test database: ${e.message}`);
    throw e;
  }
};

// Utility function to create a test category
const createTestCategory = async () => {
  const categoryName = "Test Generation Category";
  
  try {
    const response = await request.post('/api/categories').send({
      name: categoryName,
      visibility: "Show",
      year: 2075
    });
    
    if (!response.body.success) {
      throw new Error(`Failed to create category: ${JSON.stringify(response.body)}`);
    }
    
    return response.body.data;
  } catch (error) {
    console.error('Error creating test category:', error);
    throw error;
  }
};

// Utility function to clean the database for testing
const cleanDatabase = async () => {
  // Create fresh test database
  const initialData = { 
    categories: [
      {
        id: 'science-fiction',
        name: 'Science Fiction',
        visibility: 'Show',
        description: 'Stories set in the future with advanced technology',
        year: 2150
      },
      {
        id: 'fantasy',
        name: 'Fantasy',
        visibility: 'Show',
        description: 'Stories with magic and mythical creatures',
        year: 1250
      }
    ], 
    parameters: [
      {
        id: 'science-fiction-technology-level',
        name: 'Technology Level',
        type: 'Dropdown',
        visibility: 'Basic',
        categoryId: 'science-fiction',
        description: 'The level of technological advancement in the story',
        values: [
          { id: 'near-future', label: 'Near Future' },
          { id: 'advanced', label: 'Advanced' }
        ],
        config: {}
      },
      {
        id: 'fantasy-magic-system',
        name: 'Magic System',
        type: 'Dropdown',
        visibility: 'Basic',
        categoryId: 'fantasy',
        description: 'Type of magic system in the story',
        values: [
          { id: 'elemental', label: 'Elemental' },
          { id: 'divine', label: 'Divine' }
        ],
        config: {}
      }
    ],
    generatedContent: []
  };
  
  // Write initial data
  await fs.writeFile(TEST_DATABASE_PATH, JSON.stringify(initialData, null, 2));
  await fs.copyFile(TEST_DATABASE_PATH, DATABASE_PATH);
  
  return initialData;
};

// Helper to create standard parameter types
const createTestParameters = async (categoryId) => {
  try {
    // Create a dropdown parameter
    const dropdownResponse = await request.post('/api/parameters').send({
      name: "Test Dropdown",
      type: "Dropdown",
      visibility: "Basic",
      categoryId: categoryId,
      values: [
        { label: "Test 1" },
        { label: "Test 2" }
      ]
    });
    
    // Create a slider parameter
    const sliderResponse = await request.post('/api/parameters').send({
      name: "Test Slider",
      type: "Slider",
      visibility: "Basic",
      categoryId: categoryId,
      config: {
        min: 0,
        max: 100,
        step: 1
      }
    });
    
    // Create a toggle parameter
    const toggleResponse = await request.post('/api/parameters').send({
      name: "Test Toggle",
      type: "Toggle Switch",
      visibility: "Basic",
      categoryId: categoryId,
      values: {
        on: "Yes",
        off: "No"
      }
    });
    
    return {
      dropdown: dropdownResponse.body.data || {},
      slider: sliderResponse.body.data || {},
      toggle: toggleResponse.body.data || {}
    };
  } catch (error) {
    console.error(`Error creating test parameters: ${error.message}`);
    console.error(error);
    return { dropdown: {}, slider: {}, toggle: {} };
  }
};

// Convert name to a slug suitable for use as an ID
function nameToId(name) {
  return name.replace(/\s+/g, '-').toLowerCase();
}

// Setup and cleanup
beforeAll(async () => {
  await initDatabase();
});

afterAll(async () => {
  await cleanDatabase();
});

export {
  request,
  createTestCategory,
  cleanDatabase,
  createTestParameters,
  initDatabase,
  nameToId
};