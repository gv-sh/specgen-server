// tests/setup.js
jest.mock('../swagger');
const app = require('../index');
const supertest = require('supertest');
const databaseService = require('../services/databaseService');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const fsExtra = require('fs-extra');

// Create a supertest instance with our app
const request = supertest(app);

// Database file path
const DATABASE_PATH = path.join(__dirname, '../data/database.json');
const TEST_DATABASE_PATH = path.join(__dirname, '../data/test-database.json');

// Create API log directory
const logsDir = path.join(process.cwd(), 'logs');
const apiLogsDir = path.join(logsDir, 'api');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
if (!fs.existsSync(apiLogsDir)) {
  fs.mkdirSync(apiLogsDir, { recursive: true });
}

// Create API log file with timestamp
const timestamp = new Date().toISOString().replace(/:/g, '-');
const apiLogFile = path.join(apiLogsDir, `api-${timestamp}.log`);
fs.writeFileSync(apiLogFile, `API LOGS - ${timestamp}\n${'='.repeat(80)}\n\n`, 'utf8');

// Add request logging for detailed API request/response logs
const originalSend = supertest.Test.prototype.send;
supertest.Test.prototype.send = function(data) {
  this._data = data;
  return originalSend.apply(this, arguments);
};

const originalEnd = supertest.Test.prototype.end;
supertest.Test.prototype.end = function(fn) {
  const test = this;
  const startTime = Date.now();
  
  // Log the request to file
  const reqLog = `REQUEST: ${test.method} ${test.url}\n${JSON.stringify(test._data, null, 2)}\n\n`;
  fs.appendFileSync(apiLogFile, reqLog, 'utf8');
  
  return originalEnd.call(this, function(err, res) {
    const duration = Date.now() - startTime;
    
    // Log the response to file
    if (err) {
      const errLog = `ERROR RESPONSE: ${test.method} ${test.url} (${duration}ms)\n${err.message}\n\n`;
      fs.appendFileSync(apiLogFile, errLog, 'utf8');
    } else {
      const resLog = `RESPONSE: ${res.status} ${test.method} ${test.url} (${duration}ms)\n${JSON.stringify(res.body, null, 2)}\n\n`;
      fs.appendFileSync(apiLogFile, resLog, 'utf8');
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
    const logMsg = 'Initializing test database...';
    console.log(logMsg);
    fs.appendFileSync(apiLogFile, `${logMsg}\n`, 'utf8');
    
    // Make sure the directory exists
    await fsPromises.mkdir(path.dirname(DATABASE_PATH), { recursive: true });
    
    // Create a test database that's separate from the main database
    const initialData = { 
      categories: [], 
      parameters: [] 
    };
    
    // Write initial data with proper formatting
    await fsPromises.writeFile(TEST_DATABASE_PATH, JSON.stringify(initialData, null, 2), 'utf8');
    
    // Replace the actual database path with our test database during tests
    // Use fs-extra to ensure atomic file operations
    await fsExtra.copy(TEST_DATABASE_PATH, DATABASE_PATH);
    
    const successMsg = 'Test database initialized successfully';
    console.log(successMsg);
    fs.appendFileSync(apiLogFile, `${successMsg}\n\n`, 'utf8');
  } catch (e) {
    const errorMsg = `Error initializing test database: ${e.message}`;
    console.error(errorMsg);
    fs.appendFileSync(apiLogFile, `ERROR: ${errorMsg}\n\n`, 'utf8');
    throw e;
  }
};

// Utility function to create a clean test category
const createTestCategory = async () => {
  const categoryName = "Test Category";
  const logMsg = `Creating test category: ${categoryName}`;
  console.log(logMsg);
  fs.appendFileSync(apiLogFile, `${logMsg}\n`, 'utf8');
  
  const response = await request.post('/api/categories').send({
    name: categoryName,
    visibility: "Show"
  });
  
  const resultMsg = `Test category created with ID: ${response.body.data?.id || 'unknown'}`;
  console.log(resultMsg);
  fs.appendFileSync(apiLogFile, `${resultMsg}\n\n`, 'utf8');
  return response.body.data;
};

// Utility function to clean the database for testing
const cleanDatabase = async () => {
  const logMsg = 'Cleaning database...';
  console.log(logMsg);
  fs.appendFileSync(apiLogFile, `${logMsg}\n`, 'utf8');
  
  // Create fresh test database
  const initialData = { 
    categories: [], 
    parameters: [] 
  };
  
  // Write initial data with proper formatting
  await fsExtra.writeJson(TEST_DATABASE_PATH, initialData, { spaces: 2 });
  await fsExtra.copy(TEST_DATABASE_PATH, DATABASE_PATH, { overwrite: true });
  
  const successMsg = 'Database cleaned successfully';
  console.log(successMsg);
  fs.appendFileSync(apiLogFile, `${successMsg}\n\n`, 'utf8');
  return initialData;
};

// Helper to create standard parameter types
const createTestParameters = async (categoryId) => {
  try {
    const logMsg = `Creating test parameters for category ID: ${categoryId}`;
    console.log(logMsg);
    fs.appendFileSync(apiLogFile, `${logMsg}\n`, 'utf8');
    
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

    const result = {
      dropdown: dropdownResponse.body.data || {},
      slider: sliderResponse.body.data || {},
      toggle: toggleResponse.body.data || {}
    };
    
    const resultMsg = `Parameters created successfully: dropdown=${result.dropdown.id}, slider=${result.slider.id}, toggle=${result.toggle.id}`;
    console.log(resultMsg);
    fs.appendFileSync(apiLogFile, `${resultMsg}\n\n`, 'utf8');
    
    return result;
  } catch (error) {
    const errorMsg = `Error creating test parameters: ${error.message}`;
    console.error(errorMsg);
    fs.appendFileSync(apiLogFile, `ERROR: ${errorMsg}\n\n`, 'utf8');
    return { dropdown: {}, slider: {}, toggle: {} };
  }
};

// Make sure we use a clean database before each test
beforeAll(async () => {
  const logMsg = 'Setting up test environment...';
  console.log(logMsg);
  fs.appendFileSync(apiLogFile, `${logMsg}\n`, 'utf8');
  
  await initDatabase();
  await cleanDatabase();
  
  const readyMsg = 'Test environment ready';
  console.log(readyMsg);
  fs.appendFileSync(apiLogFile, `${readyMsg}\n\n`, 'utf8');
});

// Reset the database after all tests complete
afterAll(async () => {
  const logMsg = 'Cleaning up test environment...';
  console.log(logMsg);
  fs.appendFileSync(apiLogFile, `${logMsg}\n`, 'utf8');
  
  // Restore a clean state
  await cleanDatabase();
  
  const completeMsg = 'Test environment cleanup complete';
  console.log(completeMsg);
  fs.appendFileSync(apiLogFile, `${completeMsg}\n\n`, 'utf8');
  
  // Add footer to API log file
  fs.appendFileSync(apiLogFile, `\n${'='.repeat(80)}\nAPI LOGS COMPLETED: ${new Date().toISOString()}\n`, 'utf8');
});

module.exports = {
  request,
  createTestCategory,
  cleanDatabase,
  createTestParameters,
  initDatabase,
  nameToId,
  apiLogFile  // Export the log file path in case tests want to append to it
};