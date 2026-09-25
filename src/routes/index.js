// src/routes/index.js
const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const tokenRoutes = require('./tokenRoutes');
const voiceRoutes = require('./voiceRoutes');
const lookupRoutes = require('./lookupRoutes');
const voiceController = require('../controllers/voiceController');
const authMiddleware = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// Health Check (used by Vercel Cron & uptime monitors)
router.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// VC states route: /api/vc-states
router.get('/api/vc-states', authMiddleware, voiceController.getVcStates);

// Sub-routers with rate limiting
router.use('/api', authRoutes);
router.use('/api/tokens', apiLimiter, tokenRoutes);
router.use('/api/vc', apiLimiter, voiceRoutes);
router.use('/api/lookup', apiLimiter, lookupRoutes);

module.exports = router;
