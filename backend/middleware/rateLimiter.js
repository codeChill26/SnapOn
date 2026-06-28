'use strict';

const redis = require('../config/redis');

// Simple in-memory fallback store when Redis is not active/available
const inMemoryStore = new Map();

// Periodic cleanup of in-memory store to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of inMemoryStore.entries()) {
    if (now > val.resetTime) {
      inMemoryStore.delete(key);
    }
  }
}, 60000); // clean every minute

/**
 * Reusable Rate Limiting Middleware
 * @param {string} keyPrefix - Unique prefix for the endpoint (e.g. 'login')
 * @param {number} maxRequests - Maximum requests allowed in the time window
 * @param {number} windowSeconds - Time window size in seconds
 * @returns {Function} Express middleware function
 */
const rateLimiter = (keyPrefix, maxRequests, windowSeconds) => {
  return async (req, res, next) => {
    // Identify by authenticated user ID, or fallback to IP address
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const identifier = req.user ? req.user.id : clientIp;
    const cacheKey = `rl:${keyPrefix}:${identifier}`;

    if (redis.isActive()) {
      try {
        const currentVal = await redis.get(cacheKey);
        if (currentVal === null) {
          await redis.set(cacheKey, '1', windowSeconds);
          return next();
        }

        const count = parseInt(currentVal, 10);
        if (count >= maxRequests) {
          return res.status(429).json({
            success: false,
            message: 'Too many requests. Please try again later.'
          });
        }

        // Increment count and maintain same TTL window
        await redis.set(cacheKey, String(count + 1), windowSeconds);
        return next();
      } catch (err) {
        console.error(`Rate Limiter error on key ${cacheKey}:`, err);
        return next(); // Fail-open: proceed on error
      }
    } else {
      // In-memory fallback
      const now = Date.now();
      const clientData = inMemoryStore.get(cacheKey);

      if (!clientData || now > clientData.resetTime) {
        inMemoryStore.set(cacheKey, {
          count: 1,
          resetTime: now + windowSeconds * 1000
        });
        return next();
      }

      if (clientData.count >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.'
        });
      }

      clientData.count += 1;
      return next();
    }
  };
};

module.exports = rateLimiter;
