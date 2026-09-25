// src/services/discord/tokenManager.js
const DiscordClient = require('./gatewayClient');
const logger = require('../../utils/logger');

class TokenManager {
  constructor() {
    this.clients = new Map();
  }

  async startAll(tokensData = {}) {
    logger.info(`Starting Discord clients for ${Object.keys(tokensData).length} token(s)...`);
    for (const [token, config] of Object.entries(tokensData)) {
      await this.addToken(token, config);
    }
  }

  async addToken(token, config = {}) {
    if (!token) return;
    if (this.clients.has(token)) {
      await this.updateToken(token, config);
      return;
    }

    const client = new DiscordClient(token, config);
    this.clients.set(token, client);
    client.start();
  }

  async updateToken(token, config = {}) {
    if (!this.clients.has(token)) return;
    const client = this.clients.get(token);
    const oldPlatform = client.config.platform || 'pc';
    const newPlatform = config.platform || 'pc';

    client.config = config;

    if (oldPlatform !== newPlatform) {
      // Platform spoofing change requires re-identification with new properties
      await client.stop();
      const newClient = new DiscordClient(token, config);
      this.clients.set(token, newClient);
      newClient.start();
    } else {
      await client.updatePresence();
      await client.updateVoice();
    }
  }

  async restartToken(token) {
    if (!this.clients.has(token)) return;
    const client = this.clients.get(token);
    const config = client.config;
    await client.stop();

    const newClient = new DiscordClient(token, config);
    this.clients.set(token, newClient);
    newClient.start();
  }

  async removeToken(token) {
    if (this.clients.has(token)) {
      const client = this.clients.get(token);
      await client.stop();
      this.clients.delete(token);
    }
  }

  getVcState(token) {
    if (this.clients.has(token)) {
      return this.clients.get(token).vcState || {};
    }
    return {};
  }

  async stopAll() {
    logger.info('Stopping all Discord clients...');
    for (const [, client] of this.clients) {
      await client.stop();
    }
    this.clients.clear();
  }
}

const manager = new TokenManager();
module.exports = manager;
