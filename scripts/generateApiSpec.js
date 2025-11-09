#!/usr/bin/env node

/**
 * Generate API specification file
 * This script exports the swagger API specification to a static JSON file
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import swaggerSpec from '../swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json to get version
const packageJson = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf-8'));

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
        version: process.env.npm_package_version || packageJson.version
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

// Export the function for use in other modules
export default generateApiSpec;

// Run the generator if this script is executed directly
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  generateApiSpec().then((success) => {
    process.exit(success ? 0 : 1);
  });
}