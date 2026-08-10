'use strict';

const redisService = require('../config/redis');

const activeBackgroundFetches = new Map();

const cacheService = {
  /**
   * Cache-aside helper with Background Refresh (Stale-While-Revalidate)
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
          const parsed = JSON.parse(cached);

          // Support Stale-While-Revalidate wrapper format
          if (parsed && typeof parsed === 'object' && 'logicalExpiry' in parsed && 'data' in parsed) {
            if (Date.now() > parsed.logicalExpiry) {
              this.triggerBackgroundRefresh(key, ttlSeconds, fetchFn);
            }
            return parsed.data;
          }

          // Legacy format: return directly but also trigger refresh to wrap it
          this.triggerBackgroundRefresh(key, ttlSeconds, fetchFn);
          return parsed;
        } catch (e) {
          console.error(`⚠️ Failed to parse cached JSON for key ${key}:`, e.message);
          await redisService.del(key).catch(() => {});
        }
      }
    } catch (err) {
      console.error(`⚠️ Redis error reading cache for key ${key}:`, err.message);
    }

    // Cache miss: fetch fresh data synchronously
    const freshData = await fetchFn();

    // Save to cache wrapped with logical expiry (80% of TTL)
    if (freshData !== undefined && freshData !== null) {
      try {
        const wrapper = {
          data: freshData,
          logicalExpiry: Date.now() + (ttlSeconds * 1000 * 0.8)
        };
        // Set physical Redis TTL to 100% of ttlSeconds
        await redisService.set(key, JSON.stringify(wrapper), ttlSeconds);
      } catch (err) {
        console.error(`⚠️ Redis error writing cache for key ${key}:`, err.message);
      }
    }

    return freshData;
  },

  /**
   * Triggers an asynchronous background refresh of the cache key
   */
  triggerBackgroundRefresh(key, ttlSeconds, fetchFn) {
    if (activeBackgroundFetches.has(key)) {
      return; // Already refreshing this key in the background
    }

    activeBackgroundFetches.set(key, true);

    // Run asynchronously
    fetchFn()
      .then(async (freshData) => {
        if (freshData !== undefined && freshData !== null) {
          const wrapper = {
            data: freshData,
            logicalExpiry: Date.now() + (ttlSeconds * 1000 * 0.8)
          };
          await redisService.set(key, JSON.stringify(wrapper), ttlSeconds);
        }
      })
      .catch((err) => {
        console.error(`⚠️ Background refresh failed for key ${key}:`, err.message);
      })
      .finally(() => {
        activeBackgroundFetches.delete(key);
      });
  },

  /**
   * Delete a key from cache
   * @param {string} key
   */
  async del(key) {
    return await redisService.del(key);
  },

  /**
   * Delete keys matching a pattern from cache
   * @param {string} pattern
   */
  async delByPattern(pattern) {
    return await redisService.delByPattern(pattern);
  }
};

module.exports = cacheService;
