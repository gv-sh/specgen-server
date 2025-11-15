/**
 * Centralized environment configuration
 */

class Environment {
  constructor() {
    this.nodeEnv = process.env.NODE_ENV || 'development';
  }

  get isProduction() {
    return this.nodeEnv === 'production';
  }

  get isDevelopment() {
    return this.nodeEnv === 'development';
  }

  get isTest() {
    return this.nodeEnv === 'test';
  }

  /**
   * Get environment-specific configuration
   */
  get config() {
    return {
      isDevelopment: this.isDevelopment,
      isProduction: this.isProduction,
      isTest: this.isTest,
      nodeEnv: this.nodeEnv,
      port: process.env.PORT || 3000,
      openaiApiKey: process.env.OPENAI_API_KEY
    };
  }

  /**
   * Check if API key is available (excluding test environment)
   */
  get hasApiKey() {
    return Boolean(process.env.OPENAI_API_KEY) || this.isTest;
  }

  /**
   * Get database type based on environment
   */
  get databaseType() {
    return this.isTest ? 'test' : this.isProduction ? 'production' : 'development';
  }
}

export default new Environment();