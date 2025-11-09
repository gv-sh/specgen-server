// middleware/validateSettings.js

/**
 * Middleware to validate settings input
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateSettings = (req, res, next) => {
  // Extract the request body
  const body = req.body;

  // Detailed validation with specific error messages
  if (body === undefined || body === null) {
    return res.status(400).json({
      success: false,
      error: 'Settings updates must be an object',
      detail: 'Request body is null or undefined'
    });
  }

  if (Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      error: 'Settings updates must be an object',
      detail: 'Received an array instead of an object'
    });
  }

  if (typeof body !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Settings updates must be an object',
      detail: `Received type '${typeof body}' instead of 'object'`
    });
  }

  // Continue to next middleware
  next();
};

export default validateSettings;