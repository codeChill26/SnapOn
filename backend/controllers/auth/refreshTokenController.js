const prisma = require('../../db/prisma');
const response = require('../../utils/responseHandler');
const redis = require('../../config/redis');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, REFRESH_TOKEN_EXPIRY_DAYS } = require('../../utils/jwtHelper');

module.exports = {
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return response.error(res, 'Refresh token is required', 400);
      }

      // 1. Verify token cryptographically
      let decoded;
      try {
        decoded = verifyRefreshToken(refreshToken);
      } catch (err) {
        return response.error(res, 'Invalid or expired refresh token', 401);
      }

      // 2. Check Cache first (Redis), fall back to DB if cache miss or Redis is offline
      const redisKey = `refresh_token:${refreshToken}`;
      const cachedUserStr = await redis.get(redisKey);
      let user;
      let isCacheHit = false;

      if (cachedUserStr) {
        try {
          user = JSON.parse(cachedUserStr);
          isCacheHit = true;
        } catch (e) {
          // parsing failed, will fall back to DB
        }
      }

      if (!isCacheHit) {
        const tokenRecord = await prisma.refreshToken.findUnique({
          where: { token: refreshToken },
          include: { user: true }
        });

        if (!tokenRecord) {
          return response.error(res, 'Refresh token not found or revoked', 401);
        }

        if (new Date() > new Date(tokenRecord.expiresAt)) {
          await prisma.refreshToken.delete({ where: { token: refreshToken } }).catch(() => {});
          await redis.del(redisKey).catch(() => {});
          return response.error(res, 'Refresh token has expired', 401);
        }

        user = tokenRecord.user;

        const ttlSeconds = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
        await redis.set(redisKey, JSON.stringify(user), ttlSeconds).catch(() => {});
      }

      if (user.status === 'BANNED') {
        return response.error(res, 'Your account has been banned.', 403);
      }

      // 3. Generate new tokens (Rotation)
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      // 4. Update DB and Redis in parallel
      const dbPromise = prisma.$transaction([
        prisma.refreshToken.delete({ where: { token: refreshToken } }),
        prisma.refreshToken.create({
          data: {
            token: newRefreshToken,
            userId: user.id,
            deviceInfo: req.headers['user-agent'] || 'Unknown Device',
            ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
          }
        })
      ]);

      const redisPromise = (async () => {
        await redis.del(redisKey);
        const newRedisKey = `refresh_token:${newRefreshToken}`;
        const ttlSeconds = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
        await redis.set(newRedisKey, JSON.stringify(user), ttlSeconds);
      })();

      await Promise.all([dbPromise, redisPromise]);

      return response.success(res, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }, 'Tokens refreshed successfully');
    } catch (err) {
      console.error('❌ Token refresh error:', err);
      return response.error(res, 'Token refresh failed: ' + err.message, 500);
    }
  }
};
