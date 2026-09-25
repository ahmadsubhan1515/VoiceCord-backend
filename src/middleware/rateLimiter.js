// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Login rate limiter: max 30 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    detail: 'Too many login attempts, please try again after 15 minutes',
    message: 'Too many login attempts, please try again after 15 minutes',
  },
});

// General API rate limiter: max 300 requests per minute
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    detail: 'Too many requests, please slow down',
    message: 'Too many requests, please slow down',
  },
});

module.exports = {
  loginLimiter,
  apiLimiter,
};
