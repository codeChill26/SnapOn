const prisma = require('../../db/prisma');
const redis = require('../../config/redis');
const { sendVerificationEmail } = require('../../services/emailService');
const { REFRESH_TOKEN_EXPIRY_DAYS } = require('../../utils/jwtHelper');

module.exports = {
  sendVerificationEmailInBackground(email, fullName, token, context) {
    sendVerificationEmail(email, fullName, token)
      .then((result) => {
        if (!result.success) {
          console.error(`[EMAIL SERVICE] ${context} failed: ${result.message}`);
        }
      })
      .catch((err) => {
        console.error(`[EMAIL SERVICE] ${context} unexpected failure:`, err);
      });
  },

  async saveRefreshToken(user, token, req) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    // 1. Save in PostgreSQL (persistent backup)
    const dbPromise = prisma.refreshToken.create({
      data: {
        token,
        userId: user.id,
        deviceInfo,
        ipAddress,
        expiresAt
      }
    });

    // 2. Save in Redis Cache with TTL (30 days in seconds)
    const ttlSeconds = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
    const redisPromise = redis.set(`refresh_token:${token}`, JSON.stringify(user), ttlSeconds);

    // Run in parallel for maximum speed
    const [dbToken, _] = await Promise.all([dbPromise, redisPromise]);
    return dbToken;
  }
};
