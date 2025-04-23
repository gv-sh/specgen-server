// server/scripts/testGenerate.js
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const DATABASE_PATH = path.join(__dirname, '../data/database.json');

async function testGenerateEndpoint() {
  try {
    // Read the database to get the category and parameter IDs
    const data = await fs.readJson(DATABASE_PATH);
    
    if (!data.categories || data.categories.length === 0) {
      console.error('No categories found in database. Run npm run init-db first.');
      return;
    }
    
    // Get the first category
    const category = data.categories[0];
    console.log(`Using category: ${category.name} (${category.id})`);
    
    // Get parameters for this category
    const parameters = data.parameters.filter(p => p.categoryId === category.id);
    
    if (parameters.length === 0) {
      console.error(`No parameters found for category ${category.name}. Run npm run init-db first.`);
      return;
    }
    
    // Build a sample request based on parameter types
    const paramValues = {};
    
    parameters.forEach(param => {
      switch (param.type) {
        case 'Dropdown':
          if (param.values && param.values.length > 0) {
            paramValues[param.id] = param.values[0].label;
          }
          break;
        case 'Slider':
          if (param.config) {
            const midValue = Math.floor((param.config.min + param.config.max) / 2);
            paramValues[param.id] = midValue;
          }
          break;
        case 'Toggle Switch':
          paramValues[param.id] = true;
          break;
        case 'Radio Buttons':
          if (param.values && param.values.length > 0) {
            paramValues[param.id] = param.values[0].label;
          }
          break;
        case 'Checkbox':
          if (param.values && param.values.length > 0) {
            // Select the first two values or all if less than two
            paramValues[param.id] = param.values.slice(0, Math.min(2, param.values.length)).map(v => v.label);
          }
          break;
      }
    });
    
    // Create the request body
    const requestBody = {
      [category.id]: paramValues
    };
    
    console.log('\nSending request to generate endpoint:');
    console.log(JSON.stringify(requestBody, null, 2));
    
    // Make the API call
    const response = await axios.post('http://localhost:3001/api/generate', requestBody);
    
    console.log('\nResponse:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error testing generate endpoint:', error.response ? error.response.data : error);
  }
}

// Run the test
testGenerateEndpoint();