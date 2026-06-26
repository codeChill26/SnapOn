'use strict';

const redisService = require('../config/redis');

const cacheService = {
  /**
   * Cache-aside helper
   * @param {string} key Cache key
   * @param {number} ttlSeconds Time-to-live in seconds
   * @param {Function} fetchFn Function to fetch data if cache miss
   * @returns {Promise<any>}
   */
  async getOrFetch(key, ttlSeconds, fetchFn) {
    if (!redisService.isActive()) {
      return await fetchFn();
    }

    try {
      const cached = await redisService.get(key);
      if (cached !== null) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error(`⚠️ Failed to parse cached JSON for key ${key}:`, e.message);
          // If parsing fails, delete the corrupt key
          await redisService.del(key);
        }
      }
    } catch (err) {
      console.error(`⚠️ Redis error reading cache for key ${key}:`, err.message);
    }

    // Cache miss or error: fetch fresh data
    const freshData = await fetchFn();

    // Save to cache asynchronously, don't block the response
    if (freshData !== undefined && freshData !== null) {
      try {
        await redisService.set(key, JSON.stringify(freshData), ttlSeconds);
      } catch (err) {
        console.error(`⚠️ Redis error writing cache for key ${key}:`, err.message);
      }
    }

    return freshData;
  },

  /**
   * Delete a key from cache
   * @param {string} key
   */
  async del(key) {
    return await redisService.del(key);
  }
};

module.exports = cacheService;
