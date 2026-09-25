// src/services/discord/discordApi.js
const logger = require('../../utils/logger');

const API_BASE = 'https://discord.com/api/v10';

async function discordGet(endpoint, token, timeoutMs = 3000) {
  if (!token || token.startsWith('TEST_')) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        Authorization: token,
        'User-Agent': 'DiscordBot (https://discord.com, v10)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch (err) {
    if (err.name !== 'AbortError') {
      logger.debug(`Discord API GET ${endpoint} failed:`, err.message);
    }
    return null;
  }
}

const discordApi = {
  async fetchUserProfile(token) {
    return await discordGet('/users/@me', token);
  },

  async fetchGuildInfo(token, guildId) {
    if (!token || !guildId) return null;
    return await discordGet(`/guilds/${guildId}?with_counts=false`, token);
  },

  async fetchChannelInfo(token, channelId) {
    if (!token || !channelId) return null;
    return await discordGet(`/channels/${channelId}`, token);
  },

  async fetchAppAssets(token, appId) {
    if (!token || !appId) return [];
    const assets = await discordGet(`/oauth2/applications/${appId}/assets`, token);
    return Array.isArray(assets) ? assets : [];
  },
};

module.exports = discordApi;
