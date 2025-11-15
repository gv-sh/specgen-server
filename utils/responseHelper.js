/**
 * Centralized response utilities for consistent API responses
 */

/**
 * Send a successful response with data
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data
  });
};

/**
 * Send a successful response with data and message
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const sendSuccessWithMessage = (res, data, message, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 */
export const sendError = (res, error, statusCode = 500) => {
  res.status(statusCode).json({
    success: false,
    error
  });
};

/**
 * Send a paginated response with data and pagination info
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {Object} pagination - Pagination info
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const sendPaginatedSuccess = (res, data, pagination, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
    pagination
  });
};

/**
 * Create an async wrapper that handles errors automatically
 * @param {Function} fn - Async controller function
 * @returns {Function} - Wrapped function with error handling
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Standardized not found response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource type (e.g., "Category", "Parameter")
 * @param {string} id - Resource ID
 */
export const sendNotFound = (res, resource, id) => {
  sendError(res, `${resource} with ID ${id} not found`, 404);
};

/**
 * Standardized validation error response
 * @param {Object} res - Express response object
 * @param {string} message - Validation error message
 */
export const sendValidationError = (res, message) => {
  sendError(res, message, 400);
};