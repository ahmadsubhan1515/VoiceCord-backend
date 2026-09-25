// src/middleware/auth.js
const database = require('../database');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      detail: 'Missing authorization token',
      message: 'Missing authorization token',
    });
  }

  const config = database.loadConfig();
  if (!config.admin_pass || token !== config.admin_pass) {
    return res.status(401).json({
      success: false,
      detail: 'Invalid token',
      message: 'Invalid token',
    });
  }

  req.user = { username: config.admin_user };
  next();
}

module.exports = authMiddleware;
