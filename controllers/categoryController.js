// controllers/categoryController.js
const databaseService = require('../services/databaseService');

/**
 * Controller for category operations
 */
const categoryController = {
  /**
   * Get all categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAllCategories(req, res, next) {
    try {
      const categories = await databaseService.getCategories();
      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a category by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getCategoryById(req, res, next) {
    try {
      const { id } = req.params;
      const category = await databaseService.getCategoryById(id);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          error: `Category with ID ${id} not found`
        });
      }
      
      res.status(200).json({
        success: true,
        data: category
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a new category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async createCategory(req, res, next) {
    try {
      const { name, visibility, description } = req.body;
      
      // Validate input
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name is required for a category'
        });
      }
      
      // Check if category name already exists
      const existingCategories = await databaseService.getCategories();
      const categoryExists = existingCategories.some(cat => cat.name.toLowerCase() === name.toLowerCase());
      
      if (categoryExists) {
        return res.status(400).json({
          success: false,
          error: `Category with name "${name}" already exists`
        });
      }
      
      // Create a new category, using name as ID
      const newCategory = {
        id: name.replace(/\s+/g, '-').toLowerCase(),
        name,
        visibility: visibility || 'Show',
        description: description || ''
      };
      
      const createdCategory = await databaseService.createCategory(newCategory);
      
      res.status(201).json({
        success: true,
        data: createdCategory
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update a category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async updateCategory(req, res, next) {
    try {
      const { id } = req.params;
      const { name, visibility, description } = req.body;
      
      // Validate input
      if (!name && !visibility && !description) {
        return res.status(400).json({
          success: false,
          error: 'At least one field (name, visibility, or description) is required for update'
        });
      }
      
      // Check if category exists
      const category = await databaseService.getCategoryById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          error: `Category with ID ${id} not found`
        });
      }
      
      // If name is changing, check if the new name already exists
      if (name && name !== category.name) {
        const existingCategories = await databaseService.getCategories();
        const categoryExists = existingCategories.some(cat => 
          cat.id !== id && cat.name.toLowerCase() === name.toLowerCase()
        );
        
        if (categoryExists) {
          return res.status(400).json({
            success: false,
            error: `Category with name "${name}" already exists`
          });
        }
      }
      
      // Prepare update object
      const updateData = {};
      if (name) updateData.name = name;
      if (visibility) updateData.visibility = visibility;
      if (description !== undefined) updateData.description = description;
      
      const updatedCategory = await databaseService.updateCategory(id, updateData);
      
      res.status(200).json({
        success: true,
        data: updatedCategory
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete a category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;
      
      // Check if category exists before attempting to delete
      const category = await databaseService.getCategoryById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          error: `Category with ID ${id} not found`
        });
      }
      
      // Get parameters associated with this category for proper error reporting
      const parameters = await databaseService.getParametersByCategoryId(id);
      
      // Perform the deletion (this will also delete associated parameters)
      const deleted = await databaseService.deleteCategory(id);
      
      res.status(200).json({
        success: true,
        message: `Category '${category.name}' deleted successfully`,
        data: {
          deletedCategory: category,
          deletedParameters: parameters,
          parameterCount: parameters.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = categoryController;