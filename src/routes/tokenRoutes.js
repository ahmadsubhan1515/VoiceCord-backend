// src/routes/tokenRoutes.js
const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// 1. Bulk operations (Defined before :tokenId param routes)
router.post('/bulk/status', tokenController.bulkStatus);
router.post('/bulk/restart', tokenController.bulkRestart);
router.post('/bulk/disconnect-vc', tokenController.bulkDisconnectVc);

// 2. Base Collection routes
router.get('/', tokenController.getTokens);
router.post('/', tokenController.addToken);

// 3. Token Item sub-actions
router.post('/:tokenId/restart', tokenController.restartToken);

// 4. Token Item CRUD
router.put('/:tokenId', tokenController.updateToken);
router.delete('/:tokenId', tokenController.deleteToken);

module.exports = router;
