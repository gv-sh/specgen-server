// services/databaseService.js
/* global process */
const fs = require('fs').promises;
const path = require('path');
const sqliteService = require('./sqliteService');

// Use test database in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';
const DATABASE_PATH = path.resolve(
  // eslint-disable-next-line no-undef
  __dirname, 
  `../data/${isDevelopment ? 'test-database.json' : 'database.json'}`
);

// Default database structure
const DEFAULT_DATABASE = { 
  categories: [], 
  parameters: []
};

/**
 * Service for handling JSON file database operations
 */
class DatabaseService {
  /**
   * Ensure the database file exists with a valid structure
   * @private
   */
  async #ensureDatabaseFile() {
    try {
      // Check if the directory exists
      await fs.mkdir(path.dirname(DATABASE_PATH), { recursive: true });

      try {
        // Try to read the existing file
        await fs.access(DATABASE_PATH);
      } catch {
        // File doesn't exist, create with default structure
        await this.#writeDatabase(DEFAULT_DATABASE);
      }
    } catch (error) {
      // Critical error in file system operations
      this.#logError('Failed to ensure database file', error);
      throw new Error('Database initialization failed');
    }
  }

  /**
   * Write data to the database file
   * @private
   * @param {Object} data - Data to write
   */
  async #writeDatabase(data) {
    try {
      // Validate data structure
      const validatedData = this.#validateDatabaseStructure(data);
      
      await fs.writeFile(
        DATABASE_PATH, 
        JSON.stringify(validatedData, null, 2), 
        'utf8'
      );
    } catch (error) {
      this.#logError('Error writing database', error);
      throw new Error('Database write failed');
    }
  }

  /**
   * Validate and normalize database structure
   * @private
   * @param {Object} data - Data to validate
   * @returns {Object} - Validated database structure
   */
  #validateDatabaseStructure(data) {
    return {
      categories: Array.isArray(data.categories) ? data.categories : [],
      parameters: Array.isArray(data.parameters) ? data.parameters : []
    };
  }

  /**
   * Log errors with context
   * @private
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  #logError(message, error) {
    if (isDevelopment) {
      console.error(message, {
        errorMessage: error.message,
        errorStack: error.stack,
        databasePath: DATABASE_PATH
      });
    }
  }

  /**
   * Get all data from the database
   * @returns {Promise<Object>} - Database content
   */
  async getData() {
    try {
      // Ensure database file exists
      await this.#ensureDatabaseFile();

      // Read the file
      const rawData = await fs.readFile(DATABASE_PATH, 'utf8');
      
      try {
        // Parse and validate the data
        const parsedData = JSON.parse(rawData);
        return this.#validateDatabaseStructure(parsedData);
      } catch (parseError) {
        // If parsing fails, reset to default
        this.#logError('Database file corruption detected', parseError);
        await this.#writeDatabase(DEFAULT_DATABASE);
        return DEFAULT_DATABASE;
      }
    } catch (error) {
      this.#logError('Unexpected error reading database', error);
      return DEFAULT_DATABASE;
    }
  }

  /**
   * Save data to the database
   * @param {Object} data - Data to save
   * @returns {Promise<void>}
   */
  async saveData(data) {
    try {
      // Validate input
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data: must be an object');
      }

      // Ensure database file exists and write validated data
      await this.#ensureDatabaseFile();
      await this.#writeDatabase(data);
    } catch (error) {
      this.#logError('Error saving database', error);
      throw error;
    }
  }

  /**
   * Get all categories
   * @returns {Promise<Array>} - All categories
   */
  async getCategories() {
    const data = await this.getData();
    return data.categories || [];
  }

  /**
   * Get a category by ID
   * @param {String} id - Category ID
   * @returns {Promise<Object|null>} - Category or null if not found
   */
  async getCategoryById(id) {
    const data = await this.getData();
    return (data.categories || []).find(category => category.id === id) || null;
  }

  /**
   * Create a new category
   * @param {Object} category - Category to create
   * @returns {Promise<Object>} - Created category
   */
  async createCategory(category) {
    const data = await this.getData();
    
    // Ensure categories array exists
    if (!data.categories) {
      data.categories = [];
    }
    
    // Validate category
    if (!category || !category.name) {
      throw new Error('Invalid category: name is required');
    }

    data.categories.push(category);
    await this.saveData(data);
    return category;
  }

  /**
   * Update a category
   * @param {String} id - Category ID
   * @param {Object} updatedCategory - Updated category data
   * @returns {Promise<Object|null>} - Updated category or null if not found
   */
  async updateCategory(id, updatedCategory) {
    const data = await this.getData();
    
    // Ensure categories array exists
    if (!data.categories) {
      data.categories = [];
      return null;
    }
    
    const index = data.categories.findIndex(category => category.id === id);
    
    if (index === -1) return null;
    
    data.categories[index] = { ...data.categories[index], ...updatedCategory };
    await this.saveData(data);
    return data.categories[index];
  }

  /**
   * Delete a category and its parameters
   * @param {String} id - Category ID
   * @returns {Promise<Boolean>} - True if deleted, false if not found
   */
  async deleteCategory(id) {
    const data = await this.getData();
    
    // Ensure categories and parameters arrays exist
    if (!data.categories) data.categories = [];
    if (!data.parameters) data.parameters = [];
    
    const initialLength = data.categories.length;
    
    // Filter out the category to delete
    data.categories = data.categories.filter(category => category.id !== id);
    
    // Also delete all parameters associated with this category
    data.parameters = data.parameters.filter(parameter => parameter.categoryId !== id);
    
    await this.saveData(data);
    return data.categories.length < initialLength;
  }

  /**
   * Get all parameters
   * @returns {Promise<Array>} - All parameters
   */
  async getParameters() {
    const data = await this.getData();
    return data.parameters || [];
  }

  /**
   * Get parameters by category ID
   * @param {String} categoryId - Category ID
   * @returns {Promise<Array>} - Parameters for the category
   */
  async getParametersByCategoryId(categoryId) {
    const data = await this.getData();
    return (data.parameters || []).filter(parameter => parameter.categoryId === categoryId);
  }

  /**
   * Get a parameter by ID
   * @param {String} id - Parameter ID
   * @returns {Promise<Object|null>} - Parameter or null if not found
   */
  async getParameterById(id) {
    const data = await this.getData();
    return (data.parameters || []).find(parameter => parameter.id === id) || null;
  }

  /**
   * Create a new parameter
   * @param {Object} parameter - Parameter to create
   * @returns {Promise<Object>} - Created parameter
   */
  async createParameter(parameter) {
    const data = await this.getData();
    
    // Ensure parameters array exists
    if (!data.parameters) {
      data.parameters = [];
    }
    
    // Validate parameter
    if (!parameter || !parameter.name || !parameter.type) {
      throw new Error('Invalid parameter: name and type are required');
    }

    data.parameters.push(parameter);
    await this.saveData(data);
    return parameter;
  }

  /**
   * Update a parameter
   * @param {String} id - Parameter ID
   * @param {Object} updatedParameter - Updated parameter data
   * @returns {Promise<Object|null>} - Updated parameter or null if not found
   */
  async updateParameter(id, updatedParameter) {
    const data = await this.getData();
    
    // Ensure parameters array exists
    if (!data.parameters) {
      data.parameters = [];
      return null;
    }
    
    const index = data.parameters.findIndex(parameter => parameter.id === id);
    
    if (index === -1) return null;
    
    data.parameters[index] = { ...data.parameters[index], ...updatedParameter };
    await this.saveData(data);
    return data.parameters[index];
  }

  /**
   * Delete a parameter
   * @param {String} id - Parameter ID
   * @returns {Promise<Boolean>} - True if deleted, false if not found
   */
  async deleteParameter(id) {
    const data = await this.getData();
    
    // Ensure parameters array exists
    if (!data.parameters) {
      data.parameters = [];
      return false;
    }
    
    const initialLength = data.parameters.length;
    
    // Filter out the parameter to delete
    data.parameters = data.parameters.filter(parameter => parameter.id !== id);
    
    await this.saveData(data);
    return data.parameters.length < initialLength;
  }

  /**
   * Get all generated content with pagination
   * @param {Object} filters - Optional filters (type, year, page, limit, etc.)
   * @returns {Promise<Object>} - Generated content with pagination info
   */
  async getGeneratedContent(filters = {}) {
    return sqliteService.getGeneratedContent(filters);
  }

  /**
   * Get content summary without image data for efficient loading
   * @param {Object} filters - Optional filters with pagination
   * @returns {Promise<Object>} - Content summaries with pagination info
   */
  async getContentSummary(filters = {}) {
    return sqliteService.getContentSummary(filters);
  }

  /**
   * Get generated content by ID
   * @param {String} id - Content ID
   * @returns {Promise<Object|null>} - Content or null if not found
   */
  async getContentById(id) {
    return sqliteService.getContentById(id);
  }

  /**
   * Get content by specific year
   * @param {Number} year - Year to filter by
   * @returns {Promise<Array>} - Content items for the specified year
   */
  async getContentByYear(year) {
    return sqliteService.getContentByYear(year);
  }

  /**
   * Get list of available years in content
   * @returns {Promise<Array>} - List of years with content
   */
  async getAvailableYears() {
    return sqliteService.getAvailableYears();
  }

  /**
   * Create and save generated content
   * @param {Object} content - Generated content with metadata
   * @returns {Promise<Object>} - Saved content with ID
   */
  async saveGeneratedContent(content) {
    // Validate content
    if (!content || (typeof content !== 'object')) {
      throw new Error('Invalid content: must be an object');
    }
    
    // If no title provided, generate one
    if (!content.title) {
      const contentType = content.type || 'fiction';
      content.title = `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} ${new Date().toISOString().slice(0, 10)}`;
    }
    
    // Set ID and creation timestamp if not provided
    if (!content.id) {
      content.id = `content-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    
    if (!content.createdAt) {
      content.createdAt = new Date().toISOString();
    }
    
    if (!content.updatedAt) {
      content.updatedAt = content.createdAt;
    }
    
    // Use SQLite service to save the content
    return sqliteService.saveGeneratedContent(content);
  }

  /**
   * Update generated content
   * @param {String} id - Content ID
   * @param {Object} updates - Updated content data
   * @returns {Promise<Object|null>} - Updated content or null if not found
   */
  async updateGeneratedContent(id, updates) {
    return sqliteService.updateGeneratedContent(id, updates);
  }

  /**
   * Delete generated content
   * @param {String} id - Content ID
   * @returns {Promise<Boolean>} - True if deleted, false if not found
   */
  async deleteGeneratedContent(id) {
    return sqliteService.deleteGeneratedContent(id);
  }
}

module.exports = new DatabaseService();