// src/routes/lookupRoutes.js
const express = require('express');
const router = express.Router();
const lookupController = require('../controllers/lookupController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Guild lookup: /api/lookup/guild/:tokenId/:guildId
router.get('/guild/:tokenId/:guildId', lookupController.lookupGuild);

// Channel lookup: /api/lookup/channel/:tokenId/:channelId
router.get('/channel/:tokenId/:channelId', lookupController.lookupChannel);

module.exports = router;
