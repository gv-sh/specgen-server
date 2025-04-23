// services/databaseService.js
const fsExtra = require('fs-extra');
const path = require('path');

// Use test database in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';
const DATABASE_PATH = path.resolve(
  __dirname, 
  `../data/${isDevelopment ? 'test-database.json' : 'database.json'}`
);

/**
 * Service for handling JSON file database operations
 */
class DatabaseService {
  /**
   * Get all data from the database
   * @returns {Promise<Object>} - Database content
   */
  async getData() {
    try {
      console.log(`Reading database from: ${DATABASE_PATH}`);
      // Check if file exists
      const exists = await fsExtra.pathExists(DATABASE_PATH);
      if (!exists) {
        console.log('Database file does not exist, creating new one');
        // File doesn't exist, create a new one with empty categories and parameters
        const initialData = { categories: [], parameters: [] };
        await this.saveData(initialData);
        return initialData;
      }
      
      // Read the file with fs-extra for better error handling
      const data = await fsExtra.readJson(DATABASE_PATH);
      console.log(`Successfully read database with ${data.categories?.length || 0} categories and ${data.parameters?.length || 0} parameters`);
      return data;
    } catch (error) {
      console.error('Error reading database:', error);
      
      // If the file is corrupted, create a new one
      if (error.name === 'SyntaxError') {
        console.log('Database file is corrupted, creating new one');
        const initialData = { categories: [], parameters: [] };
        await this.saveData(initialData);
        return initialData;
      }
      
      throw error;
    }
  }

  /**
   * Save data to the database
   * @param {Object} data - Data to save
   * @returns {Promise<void>}
   */
  async saveData(data) {
    try {
      console.log(`Saving data to: ${DATABASE_PATH}`);
      
      // Ensure the data directory exists
      await fsExtra.ensureDir(path.dirname(DATABASE_PATH));
      
      // Write the data to a temp file first
      const tempPath = `${DATABASE_PATH}.temp`;
      await fsExtra.writeJson(tempPath, data, { spaces: 2 });
      
      // Then rename the temp file to the actual file (atomic operation)
      await fsExtra.move(tempPath, DATABASE_PATH, { overwrite: true });
      
      console.log('Database saved successfully');
    } catch (error) {
      console.error('Error saving database:', error);
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
}

module.exports = new DatabaseService();