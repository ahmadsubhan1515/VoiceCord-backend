// src/database/index.js
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// In-memory cache for tokens
let cachedTokens = null;

const database = {
  // ─── Config: ONLY from .env (ADMIN_USER / ADMIN_PASS) ──────────────────────
  loadConfig() {
    const adminUser = (process.env.ADMIN_USER || '').trim();
    const adminPass = (process.env.ADMIN_PASS || '').trim();

    if (!adminUser || !adminPass) {
      logger.warn(
        'ADMIN_USER or ADMIN_PASS is not set in .env! ' +
        'Please add them to your .env file (locally) or Environment Variables.'
      );
    }

    return {
      admin_user: adminUser,
      admin_pass: adminPass,
    };
  },

  // ─── Tokens: from Supabase ───────────────────────────────────────────────────
  async loadTokens() {
    if (!supabase) {
      if (!supabaseUrl || !supabaseKey) {
        logger.warn('Supabase URL or Key is missing. Tokens will not be loaded or saved.');
      }
      return cachedTokens || {};
    }

    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('data')
        .eq('id', 'tokens')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Row not found, meaning it's empty right now
          return cachedTokens || {};
        }
        logger.error('Failed to load tokens from Supabase:', error.message);
        return cachedTokens || {};
      }

      cachedTokens = data?.data || {};
      return cachedTokens;
    } catch (err) {
      logger.error('Failed to load tokens from Supabase:', err.message);
      return cachedTokens || {};
    }
  },

  async saveTokens(data) {
    if (!supabase) {
      logger.error('Supabase is not configured. Cannot save tokens.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('app_data')
        .upsert({ id: 'tokens', data: data });

      if (error) {
        logger.error('Failed to save tokens to Supabase:', error.message);
        return false;
      }

      cachedTokens = data;
      return true;
    } catch (err) {
      logger.error('Failed to save tokens to Supabase:', err.message);
      return false;
    }
  },
};

module.exports = database;
