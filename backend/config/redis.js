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
   * Delete keys matching a pattern using non-blocking SCAN
   * @param {string} pattern
   */
  async delByPattern(pattern) {
    if (!this.isActive()) return false;
    try {
      const keys = [];
      for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        keys.push(key);
      }
      if (keys.length > 0) {
        // Delete in chunks of 100 to prevent event loop blocking
        const chunkSize = 100;
        for (let i = 0; i < keys.length; i += chunkSize) {
          const chunk = keys.slice(i, i + chunkSize);
          await client.del(chunk);
        }
      }
      return true;
    } catch (err) {
      console.error(`❌ Redis delByPattern error for pattern ${pattern}:`, err.message);
      return false;
    }
  },

  /**
   * Get multiple values from Redis by keys in a single network round-trip
   * @param {string[]} keys 
   * @returns {Promise<(string|null)[]>}
   */
  async mget(keys) {
    if (!this.isActive() || !keys || keys.length === 0) return [];
    try {
      return await client.mGet(keys);
    } catch (err) {
      console.error(`❌ Redis MGET error for keys:`, err.message);
      return keys.map(() => null);
    }
  },

  /**
   * Increment a key atomically and set an optional TTL
   * @param {string} key 
   * @param {number} ttlSeconds 
   * @returns {Promise<number|null>}
   */
  async incr(key, ttlSeconds) {
    if (!this.isActive()) return null;
    try {
      const val = await client.incr(key);
      if (val === 1 && ttlSeconds) {
        await client.expire(key, ttlSeconds);
      }
      return val;
    } catch (err) {
      console.error(`❌ Redis INCR error for key ${key}:`, err.message);
      return null;
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
