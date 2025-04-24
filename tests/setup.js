/* global beforeAll, afterAll, jest */

jest.mock('../swagger');
const app = require('../index');
const supertest = require('supertest');
const path = require('path');
const fs = require('fs').promises;

// Create a supertest instance with our app
const request = supertest(app);

// Database file paths
// eslint-disable-next-line no-undef
const DATABASE_PATH = path.join(__dirname, '../data/database.json');
// eslint-disable-next-line no-undef
const TEST_DATABASE_PATH = path.join(__dirname, '../data/test-database.json');

// Initialize the database file with empty structure
const initDatabase = async () => {
  try {
    
    
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
      visibility: "Show"
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
    categories: [], 
    parameters: [] 
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