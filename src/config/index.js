// src/config/index.js
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const BASE_DIR = path.resolve(__dirname, '..', '..');

function getDataDir() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    const tmpDir = '/tmp/voicecord';
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch (e) {
      // Ignore
    }
    return tmpDir;
  }

  const custom = (process.env.DATA_DIR || '').trim();
  if (custom) {
    const customPath = path.resolve(custom);
    try {
      if (!fs.existsSync(customPath)) {
        fs.mkdirSync(customPath, { recursive: true });
      }
    } catch (e) {
      // Ignore
    }
    return customPath;
  }

  return BASE_DIR;
}

const DATA_DIR = getDataDir();

module.exports = {
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',
  BASE_DIR,
  DATA_DIR,
};
