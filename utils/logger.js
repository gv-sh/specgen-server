/**
 * Centralized logging utility with environment-aware configuration
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isTest = process.env.NODE_ENV === 'test';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // Set log level based on environment
    this.logLevel = this.isProduction ? LOG_LEVELS.ERROR : 
                    this.isTest ? LOG_LEVELS.WARN : 
                    LOG_LEVELS.DEBUG;
  }

  /**
   * Format log message with timestamp and level
   * @private
   */
  _formatMessage(level, message, context = null) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
    return `[${timestamp}] ${level}: ${message}${contextStr}`;
  }

  /**
   * Log error messages (always shown)
   */
  error(message, context = null) {
    if (this.logLevel >= LOG_LEVELS.ERROR) {
      console.error(this._formatMessage('ERROR', message, context));
    }
  }

  /**
   * Log warning messages
   */
  warn(message, context = null) {
    if (this.logLevel >= LOG_LEVELS.WARN) {
      console.warn(this._formatMessage('WARN', message, context));
    }
  }

  /**
   * Log info messages
   */
  info(message, context = null) {
    if (this.logLevel >= LOG_LEVELS.INFO) {
      console.log(this._formatMessage('INFO', message, context));
    }
  }

  /**
   * Log debug messages (development only)
   */
  debug(message, context = null) {
    if (this.logLevel >= LOG_LEVELS.DEBUG) {
      console.log(this._formatMessage('DEBUG', message, context));
    }
  }

  /**
   * Log API responses for debugging
   */
  apiResponse(method, path, statusCode, responseTime = null) {
    if (this.isDevelopment) {
      const timeStr = responseTime ? ` (${responseTime}ms)` : '';
      this.debug(`${method} ${path} → ${statusCode}${timeStr}`);
    }
  }

  /**
   * Log database operations
   */
  database(operation, details = null) {
    if (this.isDevelopment) {
      this.debug(`DB: ${operation}`, details);
    }
  }

  /**
   * Log AI service operations
   */
  ai(operation, details = null) {
    this.info(`AI: ${operation}`, details);
  }
}

export default new Logger();