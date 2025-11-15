/**
 * Configuration loader for SpecGen Server
 * Loads and validates configuration from schema and environment files
 */

import path from 'path';
import { fileURLToPath } from 'url';
import config from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment-specific configuration
const env = process.env.NODE_ENV || 'development';

// Load configuration files in order of precedence
const configFiles = [
  path.join(__dirname, 'default.json'),
  path.join(__dirname, `${env}.json`)
];

// Load configuration files
configFiles.forEach(file => {
  try {
    config.loadFile(file);
  } catch (error) {
    if (file.includes(env)) {
      console.warn(`Environment config file not found: ${file}`);
    } else {
      throw error;
    }
  }
});

// Validate configuration
try {
  config.validate({ allowed: 'strict' });
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  process.exit(1);
}

// Helper functions for common config access patterns
const configHelpers = {
  /**
   * Get database path based on environment
   */
  getDatabasePath() {
    const dbConfig = config.get('database.sqlite');
    return config.get('env') === 'test' ? dbConfig.testPath : dbConfig.path;
  },

  /**
   * Get CORS origins for current environment
   */
  getCorsOrigins() {
    const corsConfig = config.get('security.cors.origins');
    const currentEnv = config.get('env');
    return corsConfig[currentEnv] || corsConfig.development;
  },

  /**
   * Get server info for Swagger documentation
   */
  getSwaggerServer() {
    const docsConfig = config.get('docs.swagger.servers');
    const currentEnv = config.get('env');
    const url = docsConfig[currentEnv] || docsConfig.development;
    
    // Use actual port if different from default
    const port = config.get('server.port');
    if (currentEnv === 'development' && port !== 3000) {
      return url.replace(':3000', `:${port}`);
    }
    
    return url;
  },

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(featureName) {
    return config.get(`features.${featureName}`);
  },

  /**
   * Get AI model configuration
   */
  getAIConfig(type = 'fiction') {
    const modelName = config.get(`ai.models.${type}`);
    const parameters = config.get(`ai.parameters.${type}`);
    const openai = config.get('ai.openai');
    
    return {
      model: modelName,
      parameters,
      apiKey: openai.apiKey,
      baseUrl: openai.baseUrl
    };
  },

  /**
   * Get pagination configuration
   */
  getPaginationConfig() {
    return config.get('business.pagination');
  },

  /**
   * Get year range for validation
   */
  getYearRange() {
    return config.get('business.years');
  }
};

// Export the config instance with helpers
export default {
  config,
  ...configHelpers,
  
  // Direct config access
  get: config.get.bind(config),
  has: config.has.bind(config),
  
  // Utility to check if we're in a specific environment
  isDevelopment: () => config.get('env') === 'development',
  isProduction: () => config.get('env') === 'production',
  isTest: () => config.get('env') === 'test'
};