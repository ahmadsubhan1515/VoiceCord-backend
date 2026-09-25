// src/middleware/errorHandler.js
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled request error:', err.stack || err.message);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    detail: message,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    detail: `Route ${req.method} ${req.originalUrl} not found`,
    message: 'Not found',
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
