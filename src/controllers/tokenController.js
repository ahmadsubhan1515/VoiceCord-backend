// src/controllers/tokenController.js
const database = require('../database');
const discordApi = require('../services/discord/discordApi');
const manager = require('../services/discord/tokenManager');
const { normalizeTokenConfig } = require('../models/tokenModel');
const logger = require('../utils/logger');

function extractTokenId(req) {
  const param = req.params.tokenId || req.params[0] || '';
  return decodeURIComponent(param).trim();
}

const tokenController = {
  async getTokens(req, res) {
    const tokens = await database.loadTokens();
    return res.json(tokens);
  },

  async addToken(req, res) {
    const tokenStr = (req.body?.token || '').trim();
    if (!tokenStr) {
      return res.status(400).json({
        success: false,
        detail: 'Token is required',
        message: 'Token is required',
      });
    }

    const rawConfig = req.body?.config || {};
    const config = normalizeTokenConfig(rawConfig);

    try {
      const profile = await discordApi.fetchUserProfile(tokenStr);
      if (profile) {
        config.profile = {
          id: profile.id,
          username: profile.username,
          global_name: profile.global_name,
          discriminator: profile.discriminator,
          avatar: profile.avatar,
        };
      } else {
        config.profile = null;
      }
    } catch (e) {
      logger.warn('Failed to fetch Discord profile for new token:', e.message);
      config.profile = null;
    }

    const tokensData = await database.loadTokens();
    tokensData[tokenStr] = config;
    await database.saveTokens(tokensData);

    await manager.addToken(tokenStr, config);

    return res.json({
      success: true,
      message: 'Token added successfully',
      profile: config.profile,
    });
  },

  async updateToken(req, res) {
    const tokenId = extractTokenId(req);
    const tokensData = await database.loadTokens();

    if (!tokenId || !tokensData[tokenId]) {
      return res.status(404).json({
        success: false,
        detail: 'Token not found',
        message: 'Token not found',
      });
    }

    const newToken = (req.body?.new_token || tokenId).trim();
    const rawConfig = req.body?.config || req.body || {};
    const config = normalizeTokenConfig(rawConfig);

    // Preserve existing profile if not overwritten
    if (tokensData[tokenId].profile && !config.profile) {
      config.profile = tokensData[tokenId].profile;
    }

    if (newToken !== tokenId) {
      delete tokensData[tokenId];
      tokensData[newToken] = config;
      await database.saveTokens(tokensData);

      await manager.removeToken(tokenId);
      await manager.addToken(newToken, config);
    } else {
      tokensData[tokenId] = config;
      await database.saveTokens(tokensData);

      await manager.updateToken(tokenId, config);
    }

    return res.json({
      success: true,
      message: 'Token updated',
    });
  },

  async restartToken(req, res) {
    const tokenId = extractTokenId(req);
    const tokensData = await database.loadTokens();

    if (!tokenId || !tokensData[tokenId]) {
      return res.status(404).json({
        success: false,
        detail: 'Token not found',
        message: 'Token not found',
      });
    }

    await manager.restartToken(tokenId);
    return res.json({
      success: true,
      message: 'Token restarted',
    });
  },

  async deleteToken(req, res) {
    const tokenId = extractTokenId(req);
    const tokensData = await database.loadTokens();

    if (!tokenId || !tokensData[tokenId]) {
      return res.status(404).json({
        success: false,
        detail: 'Token not found',
        message: 'Token not found',
      });
    }

    delete tokensData[tokenId];
    await database.saveTokens(tokensData);

    await manager.removeToken(tokenId);
    return res.json({
      success: true,
      message: 'Token deleted',
    });
  },

  async bulkStatus(req, res) {
    const status = req.body?.status || 'online';
    const tokensData = await database.loadTokens();

    for (const t of Object.keys(tokensData)) {
      tokensData[t].status = status;
    }
    await database.saveTokens(tokensData);

    for (const t of Object.keys(tokensData)) {
      await manager.updateToken(t, tokensData[t]);
    }

    return res.json({
      success: true,
      message: `All tokens set to ${status}`,
    });
  },

  async bulkRestart(req, res) {
    const tokensData = await database.loadTokens();
    for (const t of Object.keys(tokensData)) {
      await manager.restartToken(t);
    }

    return res.json({
      success: true,
      message: 'All tokens restarted',
    });
  },

  async bulkDisconnectVc(req, res) {
    const tokensData = await database.loadTokens();
    for (const t of Object.keys(tokensData)) {
      if (tokensData[t].voice) {
        tokensData[t].voice.channel_id = '';
      }
    }
    await database.saveTokens(tokensData);

    for (const t of Object.keys(tokensData)) {
      await manager.updateToken(t, tokensData[t]);
    }

    return res.json({
      success: true,
      message: 'All tokens disconnected from voice channels',
    });
  },
};

module.exports = tokenController;
