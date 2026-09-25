// src/controllers/lookupController.js
const discordApi = require('../services/discord/discordApi');

const lookupController = {
  async lookupGuild(req, res) {
    const tokenId = decodeURIComponent(req.params.tokenId || req.params[0] || '');
    const guildId = req.params.guildId || req.params[1] || '';

    const info = await discordApi.fetchGuildInfo(tokenId, guildId);
    if (!info) {
      return res.json({ name: guildId, icon: null });
    }

    const iconHash = info.icon;
    const iconUrl = iconHash
      ? `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png`
      : null;

    return res.json({
      name: info.name || guildId,
      icon: iconUrl,
    });
  },

  async lookupChannel(req, res) {
    const tokenId = decodeURIComponent(req.params.tokenId || req.params[0] || '');
    const channelId = req.params.channelId || req.params[1] || '';

    const info = await discordApi.fetchChannelInfo(tokenId, channelId);
    if (!info) {
      return res.json({ name: channelId });
    }

    return res.json({
      name: info.name || channelId,
    });
  },
};

module.exports = lookupController;
