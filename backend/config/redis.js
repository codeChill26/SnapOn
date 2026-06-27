'use strict';

const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL;
let client = null;
let isConnected = false;

if (redisUrl) {
  client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 10000, // 10 seconds timeout
      reconnectStrategy: (retries) => {
        // Limit reconnect attempts to prevent memory exhaustion if server is permanently down
        if (retries > 20) {
          console.error('❌ Redis reconnect attempts exhausted. Stopping retries.');
          return new Error('Redis connection lost');
        }
        // Exponential backoff with a cap at 3 seconds
        return Math.min(retries * 100, 3000);
      }
    }
  });

  client.on('connect', () => {
    console.log('🔌 Redis Client Connecting...');
  });

  client.on('ready', () => {
    isConnected = true;
    console.log('✅ Redis Client Connected & Ready');
  });

  client.on('error', (err) => {
    isConnected = false;
    console.error('❌ Redis Client Error:', err.message);
  });

  client.on('end', () => {
    isConnected = false;
    console.warn('⚠️ Redis Client Connection Closed');
  });

  // Connect asynchronously
  client.connect().catch((err) => {
    console.error('❌ Redis Initial Connection Failed:', err.message);
  });
} else {
  console.warn('⚠️ REDIS_URL not configured. Running without Redis cache.');
}

const redisService = {
  /**
   * Check if Redis is currently connected and active
   */
  isActive() {
    return isConnected && client !== null;
  },

  /**
   * Set key in Redis with an optional TTL
   * @param {string} key 
   * @param {string} value 
   * @param {number} [ttlSeconds] 
   */
  async set(key, value, ttlSeconds) {
    if (!this.isActive()) return false;
    try {
      if (ttlSeconds) {
        await client.set(key, value, { EX: ttlSeconds });
      } else {
        await client.set(key, value);
      }
      return true;
    } catch (err) {
      console.error(`❌ Redis SET error for key ${key}:`, err.message);
      return false;
    }
  },

  /**
   * Get value from Redis by key
   * @param {string} key 
   * @returns {Promise<string|null>}
   */
  async get(key) {
    if (!this.isActive()) return null;
    try {
      return await client.get(key);
    } catch (err) {
      console.error(`❌ Redis GET error for key ${key}:`, err.message);
      return null;
    }
  },

  /**
   * Delete key from Redis
   * @param {string} key 
   */
  async del(key) {
    if (!this.isActive()) return false;
    try {
      await client.del(key);
      return true;
    } catch (err) {
      console.error(`❌ Redis DEL error for key ${key}:`, err.message);
      return false;
    }
  },

  /**
   * Delete keys matching a pattern
   * @param {string} pattern
   */
  async delByPattern(pattern) {
    if (!this.isActive()) return false;
    try {
      const keys = await client.keys(pattern);
      if (keys && keys.length > 0) {
        await client.del(keys);
      }
      return true;
    } catch (err) {
      console.error(`❌ Redis delByPattern error for pattern ${pattern}:`, err.message);
      return false;
    }
  },

  /**
   * Disconnect client cleanly (useful for tests)
   */
  async disconnect() {
    if (client) {
      await client.disconnect().catch(() => {});
      isConnected = false;
    }
  }
};

module.exports = redisService;
