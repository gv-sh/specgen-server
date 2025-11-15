/**
 * Reusable validation utilities
 */

/**
 * Validate that a required field exists and is not empty
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} - Error message or null if valid
 */
export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

/**
 * Validate that a name doesn't already exist in a collection
 * @param {string} name - Name to check
 * @param {Array} existingItems - Array of existing items with name property
 * @param {string} excludeId - ID to exclude from check (for updates)
 * @param {string} itemType - Type of item for error message
 * @returns {string|null} - Error message or null if valid
 */
export const validateUniqueName = (name, existingItems, excludeId, itemType) => {
  if (!name) return null;
  
  const duplicate = existingItems.find(item => 
    item.name.toLowerCase() === name.toLowerCase() && 
    (!excludeId || item.id !== excludeId)
  );
  
  if (duplicate) {
    return `${itemType} with name "${name}" already exists`;
  }
  return null;
};

/**
 * Validate parameter value based on its type
 * @param {Object} parameter - Parameter definition
 * @param {*} value - Value to validate
 * @returns {string|null} - Error message or null if valid
 */
export const validateParameterValue = (parameter, value) => {
  if (value === null || value === undefined) {
    return `Parameter "${parameter.name}" is required`;
  }

  switch (parameter.type) {
    case 'Dropdown':
    case 'Radio Buttons':
      if (!parameter.values?.length) {
        return `Invalid configuration for parameter "${parameter.name}"`;
      }
      if (!parameter.values.some(v => v.label === value)) {
        return `Value "${value}" is not valid for parameter "${parameter.name}"`;
      }
      break;

    case 'Slider': {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return `Value for slider parameter "${parameter.name}" must be a number`;
      }
      const min = parameter.config?.min || 0;
      const max = parameter.config?.max || 100;
      if (numValue < min || numValue > max) {
        return `Value ${value} is outside the range [${min}-${max}] for parameter "${parameter.name}"`;
      }
      break;
    }

    case 'Toggle Switch':
      if (typeof value !== 'boolean') {
        return `Value for toggle parameter "${parameter.name}" must be a boolean`;
      }
      break;

    case 'Checkbox': {
      if (!Array.isArray(value)) {
        return `Value for checkbox parameter "${parameter.name}" must be an array`;
      }
      if (!parameter.values?.length) {
        return `Invalid configuration for parameter "${parameter.name}"`;
      }
      const invalidValues = value.filter(item =>
        !parameter.values.some(v => v.label === item)
      );
      if (invalidValues.length > 0) {
        return `Values ${invalidValues.join(', ')} are not valid for parameter "${parameter.name}"`;
      }
      break;
    }

    default:
      return `Unknown parameter type: ${parameter.type}`;
  }

  return null;
};

/**
 * Validate content type
 * @param {string} contentType - Content type to validate
 * @returns {string|null} - Error message or null if valid
 */
export const validateContentType = (contentType) => {
  const validTypes = ['fiction', 'image', 'combined'];
  if (!validTypes.includes(contentType)) {
    return `Content type must be one of: ${validTypes.join(', ')}`;
  }
  return null;
};

/**
 * Validate year parameter
 * @param {*} year - Year to validate
 * @returns {string|null} - Error message or null if valid
 */
export const validateYear = (year) => {
  if (year === null || year === undefined) return null;
  
  const yearInt = parseInt(year);
  if (isNaN(yearInt)) {
    return 'Year must be a valid integer';
  }
  
  const currentYear = new Date().getFullYear();
  if (yearInt < 1900 || yearInt > currentYear + 1000) {
    return `Year must be between 1900 and ${currentYear + 1000}`;
  }
  
  return null;
};

/**
 * Validate parameter type
 * @param {string} type - Parameter type to validate
 * @returns {string|null} - Error message or null if valid
 */
export const validateParameterType = (type) => {
  const validTypes = ['Dropdown', 'Slider', 'Toggle Switch', 'Radio Buttons', 'Checkbox'];
  if (!validTypes.includes(type)) {
    return `Invalid parameter type. Must be one of: ${validTypes.join(', ')}`;
  }
  return null;
};