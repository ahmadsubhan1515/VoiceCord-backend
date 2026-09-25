// src/routes/voiceRoutes.js
const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/join', voiceController.joinVc);
router.post('/disconnect', voiceController.disconnectVc);

module.exports = router;
