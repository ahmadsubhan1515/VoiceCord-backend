// src/utils/sanitizer.js

function sanitizeString(val, maxLength = 256) {
  if (val === null || val === undefined) return '';
  return String(val).trim().substring(0, maxLength);
}

function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function sanitizeNumber(val, defaultVal = 0, min = 0, max = 1000000) {
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) return defaultVal;
  return Math.min(Math.max(parsed, min), max);
}

function sanitizeBoolean(val, defaultVal = false) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    return val.toLowerCase() === 'true' || val === '1';
  }
  return defaultVal;
}

module.exports = {
  sanitizeString,
  sanitizeUrl,
  sanitizeNumber,
  sanitizeBoolean,
};
