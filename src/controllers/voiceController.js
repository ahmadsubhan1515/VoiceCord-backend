// src/controllers/voiceController.js
const database = require('../database');
const discordApi = require('../services/discord/discordApi');
const manager = require('../services/discord/tokenManager');
const { sanitizeBoolean } = require('../utils/sanitizer');

const voiceController = {
  async getVcStates(req, res) {
    const tokensData = await database.loadTokens();
    const result = {};

    for (const token of Object.keys(tokensData)) {
      const state = { ...(manager.getVcState(token) || {}) };
      const profile = tokensData[token]?.profile || {};

      // If connected, ensure guild_name and channel_name are enriched if possible
      if (state.connected) {
        const guildId = state.guild_id;
        const channelId = state.channel_id;

        if (guildId && (!state.guild_name || state.guild_name === guildId)) {
          const gInfo = await discordApi.fetchGuildInfo(token, guildId);
          if (gInfo) {
            state.guild_name = gInfo.name || guildId;
            const iconHash = gInfo.icon;
            state.guild_icon = iconHash
              ? `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png`
              : null;
          }
        }

        if (channelId && (!state.channel_name || state.channel_name === channelId)) {
          const chInfo = await discordApi.fetchChannelInfo(token, channelId);
          if (chInfo) {
            state.channel_name = chInfo.name || channelId;
          }
        }
      }

      result[token] = {
        profile,
        vc_state: state,
      };
    }

    return res.json(result);
  },

  async joinVc(req, res) {
    const tokenStr = (req.body?.token || '').trim();
    const guildId = String(req.body?.guild_id || '').trim();
    const channelId = String(req.body?.channel_id || '').trim();
    const selfMute = sanitizeBoolean(req.body?.self_mute, true);
    const selfDeaf = sanitizeBoolean(req.body?.self_deaf, false);
    const selfVideo = sanitizeBoolean(req.body?.self_video, false);
    const selfStream = sanitizeBoolean(req.body?.self_stream, false);

    if (!tokenStr || !guildId || !channelId) {
      return res.status(400).json({
        success: false,
        detail: 'token, guild_id, and channel_id are required',
        message: 'token, guild_id, and channel_id are required',
      });
    }

    const tokensData = await database.loadTokens();
    if (!tokensData[tokenStr]) {
      return res.status(404).json({
        success: false,
        detail: 'Token not found',
        message: 'Token not found',
      });
    }

    const config = tokensData[tokenStr];
    config.voice = {
      guild_id: guildId,
      channel_id: channelId,
      self_mute: selfMute,
      self_deaf: selfDeaf,
      self_video: selfVideo,
      self_stream: selfStream,
    };

    tokensData[tokenStr] = config;
    await database.saveTokens(tokensData);

    await manager.updateToken(tokenStr, config);

    return res.json({
      success: true,
      message: 'Join command sent',
    });
  },

  async disconnectVc(req, res) {
    const tokenStr = (req.body?.token || '').trim();
    const guildId = String(req.body?.guild_id || '').trim();

    if (!tokenStr) {
      return res.status(400).json({
        success: false,
        detail: 'token is required',
        message: 'token is required',
      });
    }

    const tokensData = await database.loadTokens();
    if (!tokensData[tokenStr]) {
      return res.status(404).json({
        success: false,
        detail: 'Token not found',
        message: 'Token not found',
      });
    }

    const config = tokensData[tokenStr];
    config.voice = {
      guild_id: guildId,
      channel_id: '',
      self_mute: true,
      self_deaf: false,
      self_video: false,
      self_stream: false,
    };

    tokensData[tokenStr] = config;
    await database.saveTokens(tokensData);

    await manager.updateToken(tokenStr, config);

    return res.json({
      success: true,
      message: 'Disconnect command sent',
    });
  },
};

module.exports = voiceController;
