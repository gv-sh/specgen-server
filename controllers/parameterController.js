// controllers/parameterController.js
const databaseService = require('../services/databaseService');

/**
 * Controller for parameter operations
 */
const parameterController = {
  /**
   * Get all parameters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAllParameters(req, res, next) {
    try {
      // If categoryId query param is provided, filter by category
      const { categoryId } = req.query;
      
      let parameters;
      if (categoryId) {
        parameters = await databaseService.getParametersByCategoryId(categoryId);
      } else {
        parameters = await databaseService.getParameters();
      }
      
      res.status(200).json({
        success: true,
        data: parameters
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a parameter by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getParameterById(req, res, next) {
    try {
      const { id } = req.params;
      const parameter = await databaseService.getParameterById(id);
      
      if (!parameter) {
        return res.status(404).json({
          success: false,
          error: `Parameter with ID ${id} not found`
        });
      }
      
      res.status(200).json({
        success: true,
        data: parameter
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a new parameter
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async createParameter(req, res, next) {
    try {
      const { name, type, visibility, categoryId, values, config, description } = req.body;
      
      // Validate required fields
      if (!name || !type || !categoryId) {
        return res.status(400).json({
          success: false,
          error: 'Name, type, and categoryId are required for a parameter'
        });
      }
      
      // Validate parameter type
      const validTypes = ['Dropdown', 'Slider', 'Toggle Switch', 'Radio Buttons', 'Checkbox'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid parameter type. Must be one of: ${validTypes.join(', ')}`
        });
      }
      
      // Validate that the category exists
      const category = await databaseService.getCategoryById(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          error: `Category with ID ${categoryId} not found`
        });
      }
      
      // Check if parameter name already exists in this category
      const existingParameters = await databaseService.getParametersByCategoryId(categoryId);
      const parameterExists = existingParameters.some(param => 
        param.name.toLowerCase() === name.toLowerCase()
      );
      
      if (parameterExists) {
        return res.status(400).json({
          success: false,
          error: `Parameter with name "${name}" already exists in this category`
        });
      }
      
      // Validate values array for types that require it
      let processedValues = values;
      if (['Dropdown', 'Radio Buttons', 'Checkbox'].includes(type)) {
        if (!values || !Array.isArray(values) || values.length < 1) {
          return res.status(400).json({
            success: false,
            error: `Values array is required for ${type} parameter type`
          });
        }
        
        // Process values - use the label as the ID, after sanitizing
        processedValues = values.map(value => {
          if (typeof value === 'string') {
            return {
              id: value.replace(/\s+/g, '-').toLowerCase(),
              label: value
            };
          } else if (value.label && !value.id) {
            return {
              id: value.label.replace(/\s+/g, '-').toLowerCase(),
              label: value.label
            };
          }
          return value;
        });
      }
      
      // Create a new parameter with the name as part of ID (for uniqueness)
      const parameterId = `${categoryId}-${name.replace(/\s+/g, '-').toLowerCase()}`;
      
      const newParameter = {
        id: parameterId,
        name,
        type,
        visibility: visibility || 'Basic',
        categoryId,
        description: description || '',
        values: processedValues || [],
        config: config || {}
      };
      
      const createdParameter = await databaseService.createParameter(newParameter);
      
      res.status(201).json({
        success: true,
        data: createdParameter
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update a parameter
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async updateParameter(req, res, next) {
    try {
      const { id } = req.params;
      const { name, type, visibility, categoryId, values, config, description } = req.body;
      
      // Check if parameter exists
      const existingParameter = await databaseService.getParameterById(id);
      if (!existingParameter) {
        return res.status(404).json({
          success: false,
          error: `Parameter with ID ${id} not found`
        });
      }
      
      // If name is changing, check if the new name already exists in the category
      if (name && name !== existingParameter.name) {
        const parametersInCategory = await databaseService.getParametersByCategoryId(
          categoryId || existingParameter.categoryId
        );
        
        const nameExists = parametersInCategory.some(param => 
          param.id !== id && param.name.toLowerCase() === name.toLowerCase()
        );
        
        if (nameExists) {
          return res.status(400).json({
            success: false,
            error: `Parameter with name "${name}" already exists in this category`
          });
        }
      }
      
      // Validate categoryId if provided
      if (categoryId && categoryId !== existingParameter.categoryId) {
        const category = await databaseService.getCategoryById(categoryId);
        if (!category) {
          return res.status(404).json({
            success: false,
            error: `Category with ID ${categoryId} not found`
          });
        }
      }
      
      // Prepare update data
      const updateData = {};
      if (name) updateData.name = name;
      if (type) updateData.type = type;
      if (visibility) updateData.visibility = visibility;
      if (categoryId) updateData.categoryId = categoryId;
      if (description !== undefined) updateData.description = description;
      if (values) updateData.values = values;
      if (config) updateData.config = config;
      
      const updatedParameter = await databaseService.updateParameter(id, updateData);
      
      res.status(200).json({
        success: true,
        data: updatedParameter
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete a parameter
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async deleteParameter(req, res, next) {
    try {
      const { id } = req.params;
      
      // Check if parameter exists before attempting to delete
      const parameter = await databaseService.getParameterById(id);
      if (!parameter) {
        return res.status(404).json({
          success: false,
          error: `Parameter with ID ${id} not found`
        });
      }
      
      // Perform the deletion
      const deleted = await databaseService.deleteParameter(id);
      
      res.status(200).json({
        success: true,
        message: `Parameter '${parameter.name}' deleted successfully`,
        data: {
          deletedParameter: parameter
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = parameterController;