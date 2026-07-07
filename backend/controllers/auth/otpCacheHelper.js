const redis = require('../../config/redis');

module.exports = {
  // NOTE: Transient connection loss edge case:
  // If Redis loses connection in the middle of verifyOtp.js execution:
  // - A 503 error is returned to the user, rolling back the PostgreSQL database transaction.
  // - However, the retry count update or deletion of the OTP cannot be flushed to Redis.
  // - Once Redis comes back online, the OTP will still have its pre-failure retry state.
  // This is a safe-by-default (fail-closed) behavior, resolved by client-side retry.
  async setOtpCache(key, otpData, ttlSeconds = 300) {
    if (!redis.isActive()) {
      const err = new Error('Redis is unavailable');
      err.status = 503;
      throw err;
    }
    await redis.set(key, JSON.stringify(otpData), ttlSeconds);
  },

  async getOtpCache(key) {
    if (!redis.isActive()) {
      const err = new Error('Redis is unavailable');
      err.status = 503;
      throw err;
    }
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async delOtpCache(key) {
    if (!redis.isActive()) {
      const err = new Error('Redis is unavailable');
      err.status = 503;
      throw err;
    }
    await redis.del(key);
  }
};
