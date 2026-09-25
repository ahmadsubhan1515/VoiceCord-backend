// server.js
const app = require('./src/app');
const { PORT, NODE_ENV } = require('./src/config');
const database = require('./src/database');
const manager = require('./src/services/discord/tokenManager');
const logger = require('./src/utils/logger');

async function startServer() {
  try {
    // 1. Load credentials from .env (ADMIN_USER / ADMIN_PASS)
    const config = database.loadConfig();
    const tokens = await database.loadTokens();
    const tokenCount = Object.keys(tokens).length;

    logger.info(`Starting Voicecord server in [${NODE_ENV}] mode...`);

    if (!config.admin_user || !config.admin_pass) {
      logger.warn('⚠️  ADMIN_USER or ADMIN_PASS is missing from .env — login will not work!');
      logger.warn('   Add them to your .env file: ADMIN_USER=admin  ADMIN_PASS=yourpassword');
    } else {
      logger.info(`Admin user loaded from .env: ${config.admin_user}`);
    }

    // 2. Start HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Voicecord dashboard is running at http://localhost:${PORT}`);
      logger.info(`API Health check: http://localhost:${PORT}/api/health`);
    });

    // 3. Start Discord Gateway clients
    if (tokenCount > 0) {
      await manager.startAll(tokens);
    } else {
      logger.info('No tokens configured yet. Ready for tokens to be added via dashboard.');
    }

    // 4. Graceful Shutdown
    async function gracefulShutdown(signal) {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await manager.stopAll();
          logger.info('All Discord clients stopped.');
        } catch (e) {
          logger.error('Error during Discord client shutdown:', e.message);
        }
        process.exit(0);
      });

      // Force exit after 10s if hung
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    }

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
    });

    return server;
  } catch (err) {
    logger.error('Fatal startup error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
