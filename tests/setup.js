// tests/setup.js
jest.mock('../swagger');
const app = require('../index');
const supertest = require('supertest');
const path = require('path');
const fs = require('fs').promises;

// Create a supertest instance with our app
const request = supertest(app);

// Database file paths
const DATABASE_PATH = path.join(__dirname, '../data/database.json');
const TEST_DATABASE_PATH = path.join(__dirname, '../data/test-database.json');

// Initialize the database file with empty structure
const initDatabase = async () => {
  try {
    console.log('Initializing test database...');
    
    // Make sure the directory exists
    await fs.mkdir(path.dirname(DATABASE_PATH), { recursive: true });
    
    // Create a test database with empty structure
    const initialData = { 
      categories: [], 
      parameters: [] 
    };
    
    // Write initial data
    await fs.writeFile(TEST_DATABASE_PATH, JSON.stringify(initialData, null, 2), 'utf8');
    await fs.copyFile(TEST_DATABASE_PATH, DATABASE_PATH);
    
    console.log('Test database initialized successfully');
  } catch (e) {
    console.error(`Error initializing test database: ${e.message}`);
    throw e;
  }
};

// Utility function to create a test category
const createTestCategory = async () => {
  const categoryName = "Test Generation Category";
  console.log(`Creating test category: ${categoryName}`);
  
  const response = await request.post('/api/categories').send({
    name: categoryName,
    visibility: "Show"
  });
  
  console.log(`Test category created with ID: ${response.body.data?.id || 'unknown'}`);
  return response.body.data;
};

// Utility function to clean the database for testing
const cleanDatabase = async () => {
  console.log('Cleaning database...');
  
  // Create fresh test database
  const initialData = { 
    categories: [], 
    parameters: [] 
  };
  
  // Write initial data
  await fs.writeFile(TEST_DATABASE_PATH, JSON.stringify(initialData, null, 2));
  await fs.copyFile(TEST_DATABASE_PATH, DATABASE_PATH);
  
  console.log('Database cleaned successfully');
  return initialData;
};

// Helper to create standard parameter types
const createTestParameters = async (categoryId) => {
  try {
    console.log(`Creating test parameters for category ID: ${categoryId}`);
    
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
  await cleanDatabase();
});

afterAll(async () => {
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