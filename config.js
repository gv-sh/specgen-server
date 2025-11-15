/**
 * Unified Configuration for SpecGen Server
 * Replaces the entire config/ directory with a single file
 */

import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const env = process.env.NODE_ENV || 'development';

// Base configuration that merges all config files
const config = {
  env,
  
  // Application Information
  app: {
    name: 'SpecGen API',
    version: process.env.npm_package_version || '2.0.0',
    description: 'AI-powered speculative fiction generator'
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || 'localhost',
    timeouts: {
      gracefulShutdown: 10000,
      request: 30000
    },
    bodyLimit: '10mb'
  },

  // Security Configuration
  security: {
    rateLimiting: {
      windowMs: 900000, // 15 minutes
      maxRequests: 1000
    },
    cors: {
      origins: {
        development: [
          'http://localhost:3000', 
          'http://localhost:3001', 
          'http://localhost:3002'
        ],
        production: [
          'https://admin.specgen.app', 
          'https://app.specgen.app'
        ],
        test: ['http://localhost:3000']
      },
      credentials: true
    },
    helmet: {
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false
    }
  },

  // Database Configuration
  database: {
    type: 'sqlite',
    sqlite: {
      path: process.env.DB_PATH || './data/specgen.db',
      testPath: './data/specgen-test.db'
    },
    options: {
      connectionTimeout: 5000,
      busyTimeout: 3000
    }
  },

  // AI Service Configuration
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: 'https://api.openai.com/v1'
    },
    models: {
      fiction: 'gpt-4o-mini',
      image: 'dall-e-3'
    },
    parameters: {
      fiction: {
        temperature: 0.8,
        maxTokens: 1000,
        defaultStoryLength: 500,
        systemPrompt: `You create engaging stories set in India and the Global South. Write stories that feel real and connected to these places - their people, traditions, history, and daily life. Focus especially on India.

For each story:
- Start with familiar places and situations, then imagine how they might change in the future
- Use the story elements the user gives you as the main building blocks
- Include real cultural details like festivals, food, family traditions, and local customs
- Show how technology and change might mix with traditional ways of life
- Use simple, clear language that anyone can understand

Make your stories:
- Easy to read and follow
- Rich with local details (markets, temples, monsoons, family life)
- Focused on characters people can relate to
- Imaginative but believable
- Respectful of local cultures and traditions

Avoid using complex academic words or foreign concepts. Write like you're telling a story to a friend who lives in these places.`
      },
      image: {
        size: '1024x1024',
        quality: 'standard',
        promptSuffix: 'Create a realistic, colorful scene that captures the story\'s mood and main elements. Show the characters with clear, expressive faces and natural body language that fits their role in the story. Use the background to show the setting and atmosphere of the story. Include warm, vibrant colors inspired by Indian art - golds, deep reds, saffron, and earth tones. Make sure lighting brings out textures and details beautifully. Do not include any text in the image. Let the visual tell the story through colors, people, and setting.'
      }
    }
  },

  // Business Logic Configuration
  business: {
    years: { min: 1900, max: 3000 },
    pagination: { defaultLimit: 20, maxLimit: 100, minLimit: 1 },
    content: { defaultType: 'fiction', idRandomMultiplier: 1000 }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: env !== 'production',
    colorize: env !== 'production'
  },

  // API Documentation Configuration
  docs: {
    swagger: {
      title: 'SpecGen API',
      version: process.env.npm_package_version || '2.0.0',
      description: 'API for Speculative Fiction Generator',
      servers: {
        development: 'http://localhost:3000',
        production: 'https://api.specgen.app',
        test: 'http://localhost:3000'
      }
    }
  },

  // Feature Flags
  features: {
    enableMetrics: false,
    enableCache: false,
    enableRateLimit: true
  },

  // Validation Configuration
  validation: {
    maxNameLength: 100,
    maxDescriptionLength: 500,
    maxTitleLength: 200,
    maxContentLength: 50000,
    maxPromptLength: 1000,
    maxParametersPerRequest: 50,
    maxSettingsKeys: 100,
    maxPageSize: 100,
    defaultPageSize: 20,
    yearRange: { min: 1900, max: 3000 }
  }
};

// Environment-specific overrides
if (env === 'production') {
  config.logging.level = 'warn';
  config.logging.prettyPrint = false;
  config.logging.colorize = false;
  config.features.enableMetrics = true;
}

if (env === 'test') {
  config.logging.level = 'error';
  config.ai.openai.apiKey = 'test-key';
  config.features.enableRateLimit = false;
}

/**
 * Configuration Helper Functions
 */
export default {
  // Direct property access
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], config);
  },

  has(path) {
    try {
      return this.get(path) !== undefined;
    } catch {
      return false;
    }
  },

  // Environment checks
  isDevelopment: () => env === 'development',
  isProduction: () => env === 'production',
  isTest: () => env === 'test',

  // Helper functions
  getDatabasePath() {
    return env === 'test' ? config.database.sqlite.testPath : config.database.sqlite.path;
  },

  getCorsOrigins() {
    return config.security.cors.origins[env] || config.security.cors.origins.development;
  },

  getSwaggerServer() {
    const url = config.docs.swagger.servers[env] || config.docs.swagger.servers.development;
    const port = config.server.port;
    
    if (env === 'development' && port !== 3000) {
      return url.replace(':3000', `:${port}`);
    }
    
    return url;
  },

  isFeatureEnabled(featureName) {
    return config.features[featureName] || false;
  },

  getAIConfig(type = 'fiction') {
    const modelName = config.ai.models[type];
    const parameters = config.ai.parameters[type];
    const openai = config.ai.openai;
    
    return {
      model: modelName,
      parameters,
      apiKey: openai.apiKey,
      baseUrl: openai.baseUrl
    };
  },

  getPaginationConfig() {
    return config.business.pagination;
  },

  getYearRange() {
    return config.business.years;
  },

  // Expose entire config for debugging
  _config: config
};