// src/controllers/authController.js
const database = require('../database');

const authController = {
  login(req, res) {
    const { username, password } = req.body || {};
    const config = database.loadConfig();

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        detail: 'Username and password are required',
        message: 'Username and password are required',
      });
    }

    if (username === config.admin_user && password === config.admin_pass) {
      return res.json({
        access_token: password,
        token_type: 'bearer',
      });
    }

    return res.status(400).json({
      success: false,
      detail: 'Incorrect username or password',
      message: 'Incorrect username or password',
    });
  },
};

module.exports = authController;
