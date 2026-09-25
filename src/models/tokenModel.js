// src/models/tokenModel.js
const { sanitizeString, sanitizeUrl, sanitizeNumber, sanitizeBoolean } = require('../utils/sanitizer');

function normalizeTokenConfig(rawConfig = {}) {
  const status = ['online', 'idle', 'dnd', 'offline'].includes(rawConfig.status)
    ? rawConfig.status
    : 'online';

  const platform = rawConfig.platform === 'mobile' ? 'mobile' : 'pc';
  const statusText = sanitizeString(rawConfig.status_text, 128);

  const rawRpc = rawConfig.rpc || {};
  const rpc = {
    application_id: sanitizeString(rawRpc.application_id, 32),
    activity_type: sanitizeString(rawRpc.activity_type || 'playing', 32),
    url: rawRpc.url ? sanitizeUrl(rawRpc.url) : '',
    name: sanitizeString(rawRpc.name, 128),
    details: sanitizeString(rawRpc.details, 128),
    state: sanitizeString(rawRpc.state, 128),
    large_image: sanitizeString(rawRpc.large_image, 256),
    large_text: sanitizeString(rawRpc.large_text, 128),
    small_image: sanitizeString(rawRpc.small_image, 256),
    small_text: sanitizeString(rawRpc.small_text, 128),
    timestamp_start: sanitizeString(rawRpc.timestamp_start, 32),
    timestamp_end: sanitizeString(rawRpc.timestamp_end, 32),
    party_id: sanitizeString(rawRpc.party_id, 64),
    party_size: rawRpc.party_size !== undefined && rawRpc.party_size !== '' ? sanitizeNumber(rawRpc.party_size, 0) : '',
    party_max: rawRpc.party_max !== undefined && rawRpc.party_max !== '' ? sanitizeNumber(rawRpc.party_max, 0) : '',
    instance: sanitizeBoolean(rawRpc.instance, false),
    btn1_label: sanitizeString(rawRpc.btn1_label, 32),
    btn1_url: rawRpc.btn1_url ? sanitizeUrl(rawRpc.btn1_url) : '',
    btn2_label: sanitizeString(rawRpc.btn2_label, 32),
    btn2_url: rawRpc.btn2_url ? sanitizeUrl(rawRpc.btn2_url) : '',
  };

  const rawVoice = rawConfig.voice || {};
  const voice = {
    guild_id: sanitizeString(rawVoice.guild_id, 32),
    channel_id: sanitizeString(rawVoice.channel_id, 32),
    self_mute: rawVoice.self_mute !== undefined ? sanitizeBoolean(rawVoice.self_mute, true) : true,
    self_deaf: sanitizeBoolean(rawVoice.self_deaf, false),
    self_video: sanitizeBoolean(rawVoice.self_video, false),
    self_stream: sanitizeBoolean(rawVoice.self_stream, false),
  };

  return {
    status,
    platform,
    status_text: statusText,
    rpc,
    voice,
    profile: rawConfig.profile || null,
  };
}

module.exports = {
  normalizeTokenConfig,
};
