// tests/setup.js
jest.mock('../swagger');
const app = require('../index');
const supertest = require('supertest');
const databaseService = require('../services/databaseService');
const fs = require('fs').promises;
const path = require('path');
const fsExtra = require('fs-extra');

// Create a supertest instance with our app
const request = supertest(app);

// Database file path
const DATABASE_PATH = path.join(__dirname, '../data/database.json');
const TEST_DATABASE_PATH = path.join(__dirname, '../data/test-database.json');

// Convert name to a slug suitable for use as an ID
function nameToId(name) {
  return name.replace(/\s+/g, '-').toLowerCase();
}

// Initialize the database file with valid JSON if it doesn't exist
const initDatabase = async () => {
  try {
    // Make sure the directory exists
    await fs.mkdir(path.dirname(DATABASE_PATH), { recursive: true });
    
    // Create a test database that's separate from the main database
    const initialData = { 
      categories: [], 
      parameters: [] 
    };
    
    // Write initial data with proper formatting
    await fs.writeFile(TEST_DATABASE_PATH, JSON.stringify(initialData, null, 2), 'utf8');
    
    // Replace the actual database path with our test database during tests
    // Use fs-extra to ensure atomic file operations
    await fsExtra.copy(TEST_DATABASE_PATH, DATABASE_PATH);
    
  } catch (e) {
    console.error('Error initializing test database:', e);
    throw e;
  }
};

// Utility function to create a clean test category
const createTestCategory = async () => {
  const categoryName = "Test Category";
  const response = await request.post('/api/categories').send({
    name: categoryName,
    visibility: "Show"
  });
  
  return response.body.data;
};

// Utility function to clean the database for testing
const cleanDatabase = async () => {
  // Create fresh test database
  const initialData = { 
    categories: [], 
    parameters: [] 
  };
  
  // Write initial data with proper formatting
  await fsExtra.writeJson(TEST_DATABASE_PATH, initialData, { spaces: 2 });
  await fsExtra.copy(TEST_DATABASE_PATH, DATABASE_PATH, { overwrite: true });
  
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
    console.error('Error creating test parameters:', error);
    return { dropdown: {}, slider: {}, toggle: {} };
  }
};

// Make sure we use a clean database before each test
beforeAll(async () => {
  await initDatabase();
  await cleanDatabase();
});

// Reset the database after all tests complete
afterAll(async () => {
  // Restore a clean state
  await cleanDatabase();
});

module.exports = {
  request,
  createTestCategory,
  cleanDatabase,
  createTestParameters,
  initDatabase,
  nameToId
};