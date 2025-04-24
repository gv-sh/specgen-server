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

// Add request logging for detailed API request/response logs
const originalSend = supertest.Test.prototype.send;
supertest.Test.prototype.send = function(data) {
  this._data = data;
  return originalSend.apply(this, arguments);
};

const originalEnd = supertest.Test.prototype.end;
supertest.Test.prototype.end = function(fn) {
  const test = this;
  return originalEnd.call(this, function(err, res) {
    // Log request and response details
    console.log(`API Request: ${test.method} ${test.url}`, {
      method: test.method,
      url: test.url,
      data: test._data
    });
    
    if (err) {
      console.error(`API Response Error:`, {
        error: err.message,
        status: res ? res.status : 'unknown'
      });
    } else {
      console.log(`API Response: ${res.status}`, {
        status: res.status,
        headers: res.headers,
        body: res.body
      });
    }
    
    if (fn) fn(err, res);
  });
};

// Convert name to a slug suitable for use as an ID
function nameToId(name) {
  return name.replace(/\s+/g, '-').toLowerCase();
}

// Initialize the database file with valid JSON if it doesn't exist
const initDatabase = async () => {
  try {
    console.log('Initializing test database...');
    
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
    
    console.log('Test database initialized successfully');
  } catch (e) {
    console.error('Error initializing test database:', e);
    throw e;
  }
};

// Utility function to create a clean test category
const createTestCategory = async () => {
  const categoryName = "Test Category";
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
  
  // Write initial data with proper formatting
  await fsExtra.writeJson(TEST_DATABASE_PATH, initialData, { spaces: 2 });
  await fsExtra.copy(TEST_DATABASE_PATH, DATABASE_PATH, { overwrite: true });
  
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
    console.log(`Created dropdown parameter with ID: ${dropdownResponse.body.data?.id || 'unknown'}`);

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
    console.log(`Created slider parameter with ID: ${sliderResponse.body.data?.id || 'unknown'}`);

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
    console.log(`Created toggle parameter with ID: ${toggleResponse.body.data?.id || 'unknown'}`);

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
  console.log('Setting up test environment...');
  await initDatabase();
  await cleanDatabase();
  console.log('Test environment ready');
});

// Reset the database after all tests complete
afterAll(async () => {
  console.log('Cleaning up test environment...');
  // Restore a clean state
  await cleanDatabase();
  console.log('Test environment cleanup complete');
});

module.exports = {
  request,
  createTestCategory,
  cleanDatabase,
  createTestParameters,
  initDatabase,
  nameToId
};