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
        const count = await redis.incr(cacheKey, windowSeconds);
        if (count === null) {
          throw new Error('Redis INCR returned null');
        }

        if (count > maxRequests) {
          return res.status(429).json({
            success: false,
            message: 'Too many requests. Please try again later.'
          });
        }
        return next();
      } catch (err) {
        console.warn(`[RATE LIMITER WARNING] Redis rate limiter failed. Falling back to local in-memory degraded mode. Key: ${cacheKey}. Error: ${err.message}`);
        // Fail-over to in-memory store
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
    } else {
      console.warn(`[RATE LIMITER DEGRADED] Redis is offline. Enforcing local in-memory rate limiting for key: ${cacheKey}`);
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
