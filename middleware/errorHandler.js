import logger from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
  logger.error('Request error', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    statusCode: err.statusCode || 500
  });

  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

export default errorHandler;