const redis = require('../../config/redis');

module.exports = {
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
