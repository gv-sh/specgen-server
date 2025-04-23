// controllers/generateController.js
const aiService = require('../services/aiService');
const databaseService = require('../services/databaseService');

/**
 * Controller for handling generation requests
 */
const generateController = {
  /**
   * Generate content based on submitted parameters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async generate(req, res, next) {
    try {
      // Extract data from request body
      const { parameterValues, categoryIds, generationType = 'fiction' } = req.body;
      
      // Force always call the API - remove any artificial failure triggers
      const result = await aiService.generateContent(
        parameterValues || { "Default Category": { "Theme": "Science Fiction" } }, 
        generationType
      );
      
      if (result.success) {
        // Structure response based on generation type
        const response = {
          success: true,
          metadata: result.metadata
        };
        
        // Add the appropriate content field based on generation type
        if (generationType === 'fiction') {
          response.content = result.content;
        } else if (generationType === 'image') {
          response.imageUrl = result.imageUrl;
        }
        
        res.status(200).json(response);
      } else {
        res.status(500).json({
          success: false,
          error: result.error || `Failed to generate ${generationType}`
        });
      }
    } catch (error) {
      console.error('Error in generate controller:', error);
      next(error);
    }
  }
};

/**
 * Validate a parameter value based on its type
 * @param {Object} parameter - Parameter definition
 * @param {*} value - Value to validate
 * @returns {String|null} - Error message or null if valid
 */
function validateParameterValue(parameter, value) {
  switch (parameter.type) {
    case 'Dropdown':
      if (!parameter.values.some(v => v.label === value)) {
        return `Value "${value}" is not valid for dropdown parameter "${parameter.name}"`;
      }
      break;
      
    case 'Slider':
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return `Value for slider parameter "${parameter.name}" must be a number`;
      }
      
      const min = parameter.config?.min || 0;
      const max = parameter.config?.max || 100;
      
      if (numValue < min || numValue > max) {
        return `Value ${value} is outside the range [${min}-${max}] for slider parameter "${parameter.name}"`;
      }
      break;
      
    case 'Toggle Switch':
      if (typeof value !== 'boolean') {
        return `Value for toggle parameter "${parameter.name}" must be a boolean`;
      }
      break;
      
    case 'Radio Buttons':
      if (!parameter.values.some(v => v.label === value)) {
        return `Value "${value}" is not valid for radio parameter "${parameter.name}"`;
      }
      break;
      
    case 'Checkbox':
      if (!Array.isArray(value)) {
        return `Value for checkbox parameter "${parameter.name}" must be an array`;
      }
      
      // Check if all selected values are valid
      for (const item of value) {
        if (!parameter.values.some(v => v.label === item)) {
          return `Value "${item}" is not valid for checkbox parameter "${parameter.name}"`;
        }
      }
      break;
      
    default:
      return `Unknown parameter type: ${parameter.type}`;
  }
  
  return null;
}

module.exports = generateController;