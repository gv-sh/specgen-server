#!/usr/bin/env node

/**
 * Generate API specification file
 * This script exports the swagger API specification to a static JSON file
 */

const fs = require('fs').promises;
const path = require('path');
const swaggerSpec = require('../swagger');

const OUTPUT_DIR = path.join(__dirname, '../');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'api-spec.json');

/**
 * Write the Swagger specification to a JSON file
 */
async function generateApiSpec() {
  try {
    // Add timestamp to the spec to track when it was generated
    const specWithMeta = {
      ...swaggerSpec,
      _meta: {
        generatedAt: new Date().toISOString(),
        version: process.env.npm_package_version || require('../package.json').version
      }
    };

    // Write the spec to a file
    await fs.writeFile(
      OUTPUT_FILE,
      JSON.stringify(specWithMeta, null, 2),
      'utf8'
    );
    
    console.log(`✅ API specification generated successfully at: ${OUTPUT_FILE}`);
    
    return true;
  } catch (error) {
    console.error('Error generating API specification:', error);
    return false;
  }
}

// Run the generator if this script is executed directly
if (require.main === module) {
  generateApiSpec().then((success) => {
    process.exit(success ? 0 : 1);
  });
} else {
  // Export the function for use in other modules
  module.exports = generateApiSpec;
}