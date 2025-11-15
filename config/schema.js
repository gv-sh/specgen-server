/**
 * Configuration schema for SpecGen Server
 * Defines all configurable values with validation and defaults
 */

import convict from 'convict';

// Define the schema
const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },

  // Application Information
  app: {
    name: {
      doc: 'Application name',
      format: 'String',
      default: 'SpecGen API'
    },
    version: {
      doc: 'Application version',
      format: 'String',
      default: '2.0.0',
      env: 'npm_package_version'
    },
    description: {
      doc: 'Application description',
      format: 'String',
      default: 'AI-powered speculative fiction generator'
    }
  },

  // Server Configuration
  server: {
    port: {
      doc: 'The port to bind.',
      format: 'port',
      default: 3000,
      env: 'PORT'
    },
    host: {
      doc: 'The host to bind.',
      format: 'String',
      default: 'localhost',
      env: 'HOST'
    },
    timeouts: {
      gracefulShutdown: {
        doc: 'Graceful shutdown timeout in milliseconds',
        format: 'int',
        default: 10000
      },
      request: {
        doc: 'Request timeout in milliseconds',
        format: 'int', 
        default: 30000
      }
    },
    bodyLimit: {
      doc: 'Maximum request body size',
      format: 'String',
      default: '10mb'
    }
  },

  // Security Configuration
  security: {
    rateLimiting: {
      windowMs: {
        doc: 'Rate limiting window in milliseconds',
        format: 'int',
        default: 900000 // 15 minutes
      },
      maxRequests: {
        doc: 'Maximum requests per window',
        format: 'int',
        default: 1000
      }
    },
    cors: {
      origins: {
        development: {
          doc: 'CORS origins for development',
          format: Array,
          default: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002']
        },
        production: {
          doc: 'CORS origins for production',
          format: Array,
          default: ['https://admin.specgen.app', 'https://app.specgen.app']
        }
      },
      credentials: {
        doc: 'Enable CORS credentials',
        format: Boolean,
        default: true
      }
    },
    rateLimit: {
      windowMs: {
        doc: 'Rate limit window in milliseconds',
        format: 'int',
        default: 900000 // 15 minutes
      },
      max: {
        doc: 'Maximum requests per window',
        format: 'int',
        default: 1000
      }
    },
    helmet: {
      crossOriginEmbedderPolicy: {
        doc: 'Cross-Origin-Embedder-Policy header',
        format: Boolean,
        default: false
      },
      contentSecurityPolicy: {
        doc: 'Content-Security-Policy header',
        format: Boolean,
        default: false
      }
    }
  },

  // Request Processing Configuration
  request: {
    bodyParser: {
      jsonLimit: {
        doc: 'JSON body size limit',
        format: 'String',
        default: '10mb'
      }
    }
  },

  // Database Configuration
  database: {
    type: {
      doc: 'Database type',
      format: ['sqlite'],
      default: 'sqlite'
    },
    sqlite: {
      path: {
        doc: 'SQLite database file path',
        format: 'String',
        default: './data/specgen.db',
        env: 'DB_PATH'
      },
      testPath: {
        doc: 'SQLite test database file path', 
        format: 'String',
        default: './data/specgen-test.db'
      }
    },
    options: {
      connectionTimeout: {
        doc: 'Database connection timeout in milliseconds',
        format: 'int',
        default: 5000
      },
      busyTimeout: {
        doc: 'SQLite busy timeout in milliseconds',
        format: 'int',
        default: 3000
      }
    }
  },

  // AI Service Configuration
  ai: {
    openai: {
      apiKey: {
        doc: 'OpenAI API key',
        format: 'String',
        default: '',
        env: 'OPENAI_API_KEY',
        sensitive: true
      },
      baseUrl: {
        doc: 'OpenAI API base URL',
        format: 'String',
        default: 'https://api.openai.com/v1'
      }
    },
    models: {
      fiction: {
        doc: 'Model for fiction generation',
        format: 'String',
        default: 'gpt-4o-mini'
      },
      image: {
        doc: 'Model for image generation',
        format: 'String',
        default: 'dall-e-3'
      }
    },
    parameters: {
      fiction: {
        temperature: {
          doc: 'Temperature for fiction generation',
          format: 'Number',
          default: 0.8
        },
        maxTokens: {
          doc: 'Maximum tokens for fiction generation',
          format: 'int',
          default: 1000
        },
        defaultStoryLength: {
          doc: 'Default story length in words',
          format: 'int',
          default: 500
        },
        systemPrompt: {
          doc: 'System prompt for fiction generation',
          format: 'String',
          default: 'You are a speculative fiction generator that creates compelling, imaginative stories.'
        }
      },
      image: {
        size: {
          doc: 'Image generation size',
          format: 'String',
          default: '1024x1024'
        },
        quality: {
          doc: 'Image generation quality',
          format: ['standard', 'hd'],
          default: 'standard'
        },
        promptSuffix: {
          doc: 'Suffix to append to image prompts',
          format: 'String',
          default: 'Use high-quality, photorealistic rendering with attention to detail and composition.'
        }
      }
    }
  },

  // Business Logic Configuration
  business: {
    years: {
      min: {
        doc: 'Minimum year for content',
        format: 'int',
        default: 1900
      },
      max: {
        doc: 'Maximum year for content',
        format: 'int',
        default: 3000
      }
    },
    pagination: {
      defaultLimit: {
        doc: 'Default pagination limit',
        format: 'int',
        default: 20
      },
      maxLimit: {
        doc: 'Maximum pagination limit',
        format: 'int',
        default: 100
      },
      minLimit: {
        doc: 'Minimum pagination limit',
        format: 'int',
        default: 1
      }
    },
    content: {
      defaultType: {
        doc: 'Default content type',
        format: ['fiction', 'image', 'combined'],
        default: 'fiction'
      },
      idRandomMultiplier: {
        doc: 'Random multiplier for content ID generation',
        format: 'int',
        default: 1000
      }
    }
  },

  // Logging Configuration
  logging: {
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    prettyPrint: {
      doc: 'Enable pretty printing for logs',
      format: Boolean,
      default: true
    },
    colorize: {
      doc: 'Enable colorized logs',
      format: Boolean,
      default: true
    }
  },

  // API Documentation Configuration
  docs: {
    swagger: {
      title: {
        doc: 'API documentation title',
        format: 'String',
        default: 'SpecGen API'
      },
      version: {
        doc: 'API version',
        format: 'String',
        default: '0.14.0',
        env: 'npm_package_version'
      },
      description: {
        doc: 'API description',
        format: 'String',
        default: 'API for Speculative Fiction Generator'
      },
      servers: {
        development: {
          doc: 'Development server URL',
          format: 'String',
          default: 'http://localhost:3000'
        },
        production: {
          doc: 'Production server URL', 
          format: 'String',
          default: 'https://api.specgen.app'
        }
      }
    }
  },

  // Feature Flags
  features: {
    enableMetrics: {
      doc: 'Enable metrics collection',
      format: Boolean,
      default: false
    },
    enableCache: {
      doc: 'Enable response caching',
      format: Boolean,
      default: false
    },
    enableRateLimit: {
      doc: 'Enable rate limiting',
      format: Boolean,
      default: true
    }
  },

  // Validation Configuration
  validation: {
    maxNameLength: {
      doc: 'Maximum length for names',
      format: 'int',
      default: 100
    },
    maxDescriptionLength: {
      doc: 'Maximum length for descriptions',
      format: 'int',
      default: 500
    },
    maxTitleLength: {
      doc: 'Maximum length for titles',
      format: 'int',
      default: 200
    },
    maxContentLength: {
      doc: 'Maximum length for content',
      format: 'int',
      default: 50000
    },
    maxPromptLength: {
      doc: 'Maximum length for prompts',
      format: 'int',
      default: 1000
    },
    maxParametersPerRequest: {
      doc: 'Maximum parameters per generation request',
      format: 'int',
      default: 50
    },
    maxSettingsKeys: {
      doc: 'Maximum number of setting keys',
      format: 'int',
      default: 100
    },
    maxPageSize: {
      doc: 'Maximum page size for pagination',
      format: 'int',
      default: 100
    },
    defaultPageSize: {
      doc: 'Default page size for pagination',
      format: 'int',
      default: 20
    },
    yearRange: {
      min: {
        doc: 'Minimum allowed year',
        format: 'int',
        default: 1900
      },
      max: {
        doc: 'Maximum allowed year',
        format: 'int',
        default: 3000
      }
    }
  }
});

export default config;