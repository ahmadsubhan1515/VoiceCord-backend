// src/utils/logger.js

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLevel = process.env.NODE_ENV === 'test' ? LOG_LEVELS.WARN : LOG_LEVELS.INFO;

function formatTime() {
  return new Date().toISOString();
}

const logger = {
  debug: (...args) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.log(`[\x1b[90m${formatTime()}\x1b[0m] [\x1b[36mDEBUG\x1b[0m]`, ...args);
    }
  },
  info: (...args) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.log(`[\x1b[90m${formatTime()}\x1b[0m] [\x1b[32mINFO\x1b[0m]`, ...args);
    }
  },
  warn: (...args) => {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(`[\x1b[90m${formatTime()}\x1b[0m] [\x1b[33mWARN\x1b[0m]`, ...args);
    }
  },
  error: (...args) => {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      console.error(`[\x1b[90m${formatTime()}\x1b[0m] [\x1b[31mERROR\x1b[0m]`, ...args);
    }
  },
};

module.exports = logger;
