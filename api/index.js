// api/index.js — Vercel Serverless Function Entry
// Vercel runs this file as a Node.js serverless function.
// Every cold start re-initializes the Discord token manager.

const app = require('../src/app');
const database = require('../src/database');
const manager = require('../src/services/discord/tokenManager');
const logger = require('../src/utils/logger');

let initialized = false;

module.exports = async (req, res) => {
  // On first invocation (cold start), initialize Discord clients
  if (!initialized) {
    try {
      const tokens = database.loadTokens();
      const tokenCount = Object.keys(tokens).length;
      if (tokenCount > 0) {
        logger.info(`[Vercel] Cold start — initializing ${tokenCount} Discord client(s)`);
        await manager.startAll(tokens);
      } else {
        logger.info('[Vercel] Cold start — no tokens configured yet');
      }
    } catch (e) {
      logger.error('[Vercel] Failed to initialize Discord clients on cold start:', e.message);
    }
    initialized = true;
  }

  return app(req, res);
};
