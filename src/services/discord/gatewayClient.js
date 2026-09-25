// src/services/discord/gatewayClient.js
const WebSocket = require('ws');
const discordApi = require('./discordApi');
const logger = require('../../utils/logger');

const GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json';

class DiscordClient {
  constructor(token, config = {}) {
    this.token = token;
    this.config = config;
    this.ws = null;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.running = false;
    this.internalStartTime = Math.floor(Date.now() / 1000);
    this.sequence = null;
    this.sessionId = null;
    this.lastHeartbeatAck = true;

    // VC & Guild cache
    this.vcState = {};
    this.guildCache = new Map();
    this.appAssetsCache = new Map();
  }

  maskToken() {
    return this.token ? `${this.token.substring(0, 10)}...` : 'unknown';
  }

  async getAppAssets(appId) {
    if (!appId) return [];
    if (this.appAssetsCache.has(appId)) {
      return this.appAssetsCache.get(appId);
    }
    const assets = await discordApi.fetchAppAssets(this.token, appId);
    this.appAssetsCache.set(appId, assets);
    return assets;
  }

  resolveAsset(value, assetsList = []) {
    if (!value) return value;
    const v = String(value).trim();
    if (v.startsWith('http://') || v.startsWith('https://')) {
      return `mp:external/${v}`;
    }
    for (const asset of assetsList) {
      if (asset.name === v) {
        return asset.id;
      }
    }
    return v;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.connect();
  }

  async stop() {
    this.running = false;
    this.clearHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        this.ws.close(1000, 'Client stopped');
      } catch (e) {
        // Ignore
      }
      this.ws = null;
    }
  }

  clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  scheduleReconnect(delayMs = 5000) {
    if (!this.running || this.reconnectTimer) return;
    logger.info(`[${this.maskToken()}] Reconnecting in ${delayMs / 1000}s...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.running) {
        this.connect();
      }
    }, delayMs);
  }

  connect() {
    if (!this.running) return;

    if (this.token && this.token.startsWith('TEST_')) {
      logger.debug(`[${this.maskToken()}] Mock token detected, skipping live gateway connection.`);
      return;
    }

    this.clearHeartbeat();
    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        this.ws.terminate();
      } catch (e) {
        // Ignore
      }
      this.ws = null;
    }

    try {
      this.ws = new WebSocket(GATEWAY_URL);

      this.ws.on('open', () => {
        logger.debug(`[${this.maskToken()}] Gateway WebSocket opened`);
      });

      this.ws.on('message', (data) => {
        try {
          const payload = JSON.parse(data.toString());
          this.handleGatewayMessage(payload);
        } catch (err) {
          logger.error(`[${this.maskToken()}] Error parsing message:`, err.message);
        }
      });

      this.ws.on('close', (code, reason) => {
        logger.warn(`[${this.maskToken()}] WS closed (code: ${code}, reason: ${reason})`);
        this.clearHeartbeat();
        if (this.running) {
          // If invalid token (code 4004), do not spam reconnect
          if (code === 4004) {
            logger.error(`[${this.maskToken()}] Authentication failed: Invalid Discord token`);
            this.running = false;
            return;
          }
          this.scheduleReconnect(5000);
        }
      });

      this.ws.on('error', (err) => {
        logger.error(`[${this.maskToken()}] Gateway error:`, err.message);
      });
    } catch (err) {
      logger.error(`[${this.maskToken()}] Failed to instantiate WebSocket:`, err.message);
      this.scheduleReconnect(5000);
    }
  }

  async handleGatewayMessage(payload) {
    const { op, d, s, t } = payload;

    if (s !== undefined && s !== null) {
      this.sequence = s;
    }

    switch (op) {
      case 10: { // Hello
        const heartbeatInterval = d.heartbeat_interval;
        this.lastHeartbeatAck = true;
        this.clearHeartbeat();

        // Initial jittered heartbeat
        const initialJitter = Math.floor(Math.random() * heartbeatInterval);
        setTimeout(() => {
          this.sendHeartbeat();
          if (this.running && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), heartbeatInterval);
          }
        }, initialJitter);

        this.identify();
        break;
      }

      case 11: { // Heartbeat ACK
        this.lastHeartbeatAck = true;
        break;
      }

      case 1: { // Discord requested heartbeat
        this.sendHeartbeat();
        break;
      }

      case 7: { // Reconnect
        logger.info(`[${this.maskToken()}] Gateway requested reconnect`);
        if (this.ws) this.ws.close(4000, 'Gateway reconnect request');
        break;
      }

      case 9: { // Invalid Session
        logger.warn(`[${this.maskToken()}] Invalid session`);
        setTimeout(() => {
          this.identify();
        }, 2000);
        break;
      }

      case 0: { // Dispatch event
        if (t === 'READY') {
          this.sessionId = d.session_id;
          logger.info(`[${this.maskToken()}] Gateway READY as ${d.user?.username}#${d.user?.discriminator || '0'}`);
          await this.updatePresence();
          await this.updateVoice();
        } else if (t === 'GUILD_CREATE') {
          this.cacheGuild(d);
        } else if (t === 'VOICE_STATE_UPDATE') {
          this.handleVoiceStateUpdate(d);
        }
        break;
      }

      default:
        break;
    }
  }

  sendHeartbeat() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify({ op: 1, d: this.sequence }));
    } catch (e) {
      logger.error(`[${this.maskToken()}] Heartbeat send failed:`, e.message);
    }
  }

  identify() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const platform = this.config.platform || 'pc';
    const isMobile = platform === 'mobile';

    const payload = {
      op: 2,
      d: {
        token: this.token,
        intents: 0,
        properties: {
          $os: isMobile ? 'ios' : 'windows',
          $browser: isMobile ? 'Discord iOS' : 'chrome',
          $device: isMobile ? 'iPhone' : 'pc',
        },
      },
    };

    try {
      this.ws.send(JSON.stringify(payload));
    } catch (err) {
      logger.error(`[${this.maskToken()}] Identify send failed:`, err.message);
    }
  }

  cacheGuild(guildData) {
    if (!guildData || !guildData.id) return;
    const channels = {};
    if (Array.isArray(guildData.channels)) {
      for (const ch of guildData.channels) {
        channels[ch.id] = ch.name || ch.id;
      }
    }
    const iconHash = guildData.icon;
    const iconUrl = iconHash
      ? `https://cdn.discordapp.com/icons/${guildData.id}/${iconHash}.png`
      : null;

    this.guildCache.set(guildData.id, {
      name: guildData.name || guildData.id,
      iconUrl,
      channels,
    });
  }

  handleVoiceStateUpdate(d) {
    const guildId = d.guild_id;
    const channelId = d.channel_id;

    if (channelId) {
      const guildInfo = this.guildCache.get(guildId) || {};
      this.vcState = {
        guild_id: guildId,
        channel_id: channelId,
        guild_name: guildInfo.name || guildId,
        guild_icon: guildInfo.iconUrl || null,
        channel_name: (guildInfo.channels && guildInfo.channels[channelId]) || channelId,
        connected: true,
      };
    } else {
      this.vcState = {
        connected: false,
        guild_id: guildId || null,
      };
    }
  }

  async updatePresence() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const status = this.config.status || 'online';
    const statusText = (this.config.status_text || '').trim();
    const rpc = this.config.rpc || {};

    const activities = [];

    // Custom status activity (type 4)
    if (statusText) {
      activities.push({
        type: 4,
        name: 'Custom Status',
        state: statusText,
      });
    }

    // Rich Presence
    if (rpc && rpc.name) {
      const activityTypeMap = {
        playing: 0,
        streaming: 1,
        listening: 2,
        watching: 3,
        competing: 5,
      };
      const actTypeStr = (rpc.activity_type || 'playing').toLowerCase();
      const actType = activityTypeMap[actTypeStr] !== undefined ? activityTypeMap[actTypeStr] : 0;

      const activity = {
        type: actType,
        name: rpc.name || 'Playing',
      };

      if (rpc.application_id) {
        activity.application_id = String(rpc.application_id).trim();
      }

      if (rpc.details) activity.details = String(rpc.details);
      if (rpc.state) activity.state = String(rpc.state);
      if (rpc.instance) activity.instance = true;

      const partyId = String(rpc.party_id || '').trim();
      const partySize = parseInt(rpc.party_size, 10);
      const partyMax = parseInt(rpc.party_max, 10);

      if (partyId || (!isNaN(partySize) && !isNaN(partyMax))) {
        const party = {};
        if (partyId) party.id = partyId;
        if (!isNaN(partySize) && !isNaN(partyMax) && (partySize > 0 || partyMax > 0)) {
          party.size = [partySize, partyMax];
        }
        if (Object.keys(party).length > 0) {
          activity.party = party;
        }
      }

      if (actType === 1 && rpc.url) {
        activity.url = rpc.url;
      }

      // Timestamps
      const timestamps = {};
      const tsStartRaw = String(rpc.timestamp_start || '').trim().toLowerCase();
      const tsEndRaw = String(rpc.timestamp_end || '').trim();

      if (tsStartRaw === 'auto' || tsStartRaw === 'true') {
        timestamps.start = this.internalStartTime * 1000;
      } else if (tsStartRaw) {
        const parsed = Number(tsStartRaw);
        if (!isNaN(parsed) && parsed > 0) {
          timestamps.start = parsed > 1e11 ? parsed : parsed * 1000;
        }
      }

      if (tsEndRaw) {
        const parsedEnd = Number(tsEndRaw);
        if (!isNaN(parsedEnd) && parsedEnd > 0) {
          timestamps.end = parsedEnd > 1e11 ? parsedEnd : parsedEnd * 1000;
        }
      }

      if (Object.keys(timestamps).length > 0) {
        activity.timestamps = timestamps;
      }

      // Assets
      const appId = String(rpc.application_id || '').trim();
      let assetsList = [];
      if (appId) {
        assetsList = await this.getAppAssets(appId);
      }

      const assets = {};
      const largeImg = this.resolveAsset(rpc.large_image, assetsList);
      if (largeImg) assets.large_image = largeImg;
      if (rpc.large_text) assets.large_text = String(rpc.large_text);

      const smallImg = this.resolveAsset(rpc.small_image, assetsList);
      if (smallImg) assets.small_image = smallImg;
      if (rpc.small_text) assets.small_text = String(rpc.small_text);

      if (Object.keys(assets).length > 0) {
        activity.assets = assets;
      }

      // Buttons (Gateway metadata format)
      const buttonLabels = [];
      const buttonUrls = [];
      for (const i of [1, 2]) {
        const lbl = String(rpc[`btn${i}_label`] || '').trim();
        let url = String(rpc[`btn${i}_url`] || '').trim();
        if (lbl && url) {
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
          }
          buttonLabels.push(lbl.substring(0, 32));
          buttonUrls.push(url.substring(0, 512));
        }
      }

      if (buttonLabels.length > 0 && buttonUrls.length > 0) {
        if (!appId) {
          logger.warn(`[${this.maskToken()}] RPC buttons require application_id — skipping buttons`);
        } else {
          activity.metadata = {
            button_urls: buttonUrls,
            button_labels: buttonLabels,
          };
        }
      }

      activities.push(activity);
    }

    const payload = {
      op: 3,
      d: {
        since: 0,
        activities,
        status: status === 'offline' ? 'invisible' : status,
        afk: status === 'idle',
      },
    };

    try {
      this.ws.send(JSON.stringify(payload));
    } catch (err) {
      logger.error(`[${this.maskToken()}] Presence update send failed:`, err.message);
    }
  }

  async updateVoice() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const voice = this.config.voice || {};
    const guildId = String(voice.guild_id || '').trim();
    const channelId = String(voice.channel_id || '').trim();

    if (guildId) {
      const payload = {
        op: 4,
        d: {
          guild_id: guildId,
          channel_id: channelId || null,
          self_mute: voice.self_mute !== false,
          self_deaf: voice.self_deaf === true,
          self_video: voice.self_video === true,
          self_stream: voice.self_stream === true,
        },
      };

      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        logger.error(`[${this.maskToken()}] Voice state update send failed:`, err.message);
      }
    }
  }
}

module.exports = DiscordClient;
