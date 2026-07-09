const jwt = require('jsonwebtoken');
const prisma = require('../db/prisma');
const redis = require('../config/redis');
const authModel = require('../models/authModel');
const walletModel = require('../models/walletModel');
const { sendVerificationEmail, isEmailDebugOtpEnabled } = require('../services/emailService');
const { generateVerificationToken } = require('./auth');

// Enforce JWT secrets on startup
if (!process.env.JWT_ACCESS_SECRET) {
  throw new Error('CRITICAL: JWT_ACCESS_SECRET environment variable is missing. App cannot start.');
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('CRITICAL: JWT_REFRESH_SECRET environment variable is missing. App cannot start.');
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function buildDebugOtpPayload(token) {
  if (!token || !isEmailDebugOtpEnabled()) return {};
  return { debugOtp: token };
}

function sendVerificationEmailInBackground(email, fullName, token, context) {
  sendVerificationEmail(email, fullName, token)
    .then((result) => {
      if (!result.success) {
        console.error(`[EMAIL SERVICE] ${context} failed: ${result.message}`);
      }
    })
    .catch((err) => {
      console.error(`[EMAIL SERVICE] ${context} unexpected failure:`, err);
    });
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      firebaseUid: user.firebase_uid || user.firebaseUid,
      fullName: user.full_name || user.fullName,
      email: user.email,
      role: user.role || 'USER',
      status: user.status,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
  );
}

async function saveRefreshToken(user, token, req) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

  // 1. Save in PostgreSQL (persistent backup)
  const dbPromise = prisma.refreshToken.create({
    data: { token, userId: user.id, deviceInfo, ipAddress, expiresAt },
  });

  // 2. Save in Redis Cache with TTL (30 days in seconds)
  const ttlSeconds = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
  const redisPromise = redis.set(`refresh_token:${token}`, JSON.stringify(user), ttlSeconds);

  const [dbToken] = await Promise.all([dbPromise, redisPromise]);
  return dbToken;
}

// ── OTP cache (Redis with in-memory fallback) ───────────────────────────
const inMemoryOtpCache = new Map();

async function setOtpCache(phone, otpData) {
  const key = `otp:${phone}`;
  if (redis.isActive()) {
    await redis.set(key, JSON.stringify(otpData), 300); // 5 minutes TTL
  } else {
    otpData.expiresAt = Date.now() + 300 * 1000;
    inMemoryOtpCache.set(phone, otpData);
  }
}

async function getOtpCache(phone) {
  const key = `otp:${phone}`;
  if (redis.isActive()) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  const data = inMemoryOtpCache.get(phone);
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    inMemoryOtpCache.delete(phone);
    return null;
  }
  return data;
}

async function delOtpCache(phone) {
  const key = `otp:${phone}`;
  if (redis.isActive()) {
    await redis.del(key);
  } else {
    inMemoryOtpCache.delete(phone);
  }
}

function generateRandomOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function toUserResponse(user) {
  return {
    id: user.id,
    firebaseUid: user.firebase_uid,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    role: user.role || 'USER',
    status: user.status,
    isVerified: user.is_verified,
    isIdVerified: user.is_id_verified,
    createdAt: user.created_at,
  };
}

/**
 * Auth Controller — Firebase sync, dev auth, OTP, token lifecycle
 */
const authController = {
  /** POST /api/auth/sync-user (Firebase token required) */
  async syncUser(req, res) {
    try {
      const { uid, email, name, picture } = req.firebaseUser;

      if (!uid || !email) {
        return res.status(400).json({
          success: false,
          message: 'Firebase user thiếu uid hoặc email.',
        });
      }

      const defaultAvatar = `${req.protocol}://${req.get('host')}/uploads/default-avatar.png`;
      const { user, wallet } = await authModel.syncFirebaseUser({
        uid,
        email,
        name: name || email.split('@')[0],
        avatarUrl: picture || defaultAvatar,
      });

      // Generate and send verification email if user is not verified
      let debugOtp = null;
      if (!user.is_verified) {
        const token = generateVerificationToken();
        debugOtp = token;
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await prisma.user.update({
          where: { id: user.id },
          data: { verificationToken: token, verificationTokenExpires: expiresAt },
        });

        sendVerificationEmailInBackground(user.email, user.full_name, token, 'sync-user verification email');
        if (isEmailDebugOtpEnabled()) {
          console.log(`[EMAIL DEBUG] Verification OTP for ${user.email}: ${token}`);
        }
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      await saveRefreshToken(user, refreshToken, req);

      return res.status(200).json({
        success: true,
        message: 'User synced successfully',
        user: toUserResponse(user),
        wallet,
        accessToken,
        refreshToken,
        ...buildDebugOtpPayload(debugOtp),
      });
    } catch (error) {
      console.error('❌ Sync user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Sync user failed',
        error: error.message,
      });
    }
  },

  /** POST /api/auth/dev/login — bypasses Firebase (non-production only) */
  async devLogin(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const user = await authModel.findAuthUserByEmail(email);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (user.status === 'BANNED') {
        return res.status(403).json({ success: false, message: 'Your account has been banned.' });
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      await saveRefreshToken(user, refreshToken, req);

      return res.status(200).json({
        success: true,
        message: 'Login successful (dev mode)',
        user,
        token: accessToken,
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error('❌ Dev login error:', err);
      return res.status(500).json({ success: false, message: 'Login failed', error: err.message });
    }
  },

  /** POST /api/auth/dev/register (non-production only) */
  async devRegister(req, res) {
    try {
      const { email, fullName } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const defaultAvatar = `${req.protocol}://${req.get('host')}/uploads/default-avatar.png`;
      const user = await authModel.registerDevUser({ email, fullName, defaultAvatar });

      // Generate and send verification email for dev registration
      const token = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { verificationToken: token, verificationTokenExpires: expiresAt },
      });

      sendVerificationEmailInBackground(user.email, user.full_name, token, 'dev-register verification email');
      if (isEmailDebugOtpEnabled()) {
        console.log(`[EMAIL DEBUG] Verification OTP for ${user.email}: ${token}`);
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      await saveRefreshToken(user, refreshToken, req);

      return res.status(201).json({
        success: true,
        message: 'Registration successful (dev mode)',
        user,
        token: accessToken,
        accessToken,
        refreshToken,
        ...buildDebugOtpPayload(token),
      });
    } catch (err) {
      console.error('❌ Dev register error:', err);
      const status = err.statusCode || 500;
      const message = err.statusCode === 409 ? err.message : 'Registration failed';
      return res.status(status).json({ success: false, message, error: err.statusCode ? undefined : err.message });
    }
  },

  /** POST /api/auth/send-otp */
  async sendOtp(req, res) {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
      }

      const otp = generateRandomOTP();
      await setOtpCache(phone, { otp, retryCount: 0, retryLimit: 3 });

      const isDev = process.env.NODE_ENV !== 'production' && process.env.AUTH_MODE === 'dev';
      if (isDev) {
        console.log(`📱 [OTP SERVICE] Generating OTP for ${phone}: ${otp}`);
      }

      const responsePayload = {
        success: true,
        message: 'OTP sent successfully (Simulated)',
      };
      if (isDev) {
        responsePayload.otp = otp;
      }

      return res.status(200).json(responsePayload);
    } catch (err) {
      console.error('Send OTP error:', err);
      return res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
  },

  /** POST /api/auth/verify-otp — verify then login-or-register by phone */
  async verifyOtp(req, res) {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
      }

      const otpData = await getOtpCache(phone);
      if (!otpData) {
        return res.status(400).json({ success: false, message: 'OTP has expired or does not exist' });
      }

      if (otpData.retryCount >= otpData.retryLimit) {
        await delOtpCache(phone);
        return res.status(400).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.' });
      }

      if (otpData.otp !== otp) {
        otpData.retryCount += 1;
        if (otpData.retryCount >= otpData.retryLimit) {
          await delOtpCache(phone);
          return res.status(400).json({ success: false, message: 'Too many failed attempts. OTP has been invalidated.' });
        }
        await setOtpCache(phone, otpData);
        return res.status(400).json({
          success: false,
          message: `Invalid OTP code. ${otpData.retryLimit - otpData.retryCount} attempts remaining.`,
        });
      }

      // OTP verified successfully, clear cache
      await delOtpCache(phone);

      const defaultAvatar = `${req.protocol}://${req.get('host')}/uploads/default-avatar.png`;
      const user = await authModel.findOrCreatePhoneUser(phone, { defaultAvatar });

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      await saveRefreshToken(user, refreshToken, req);

      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        user: toUserResponse(user),
        token: accessToken,
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error('Verify OTP error:', err);
      return res.status(500).json({ success: false, message: 'Verification failed', error: err.message });
    }
  },

  /** POST /api/auth/token-login — restore session from access token */
  async tokenLogin(req, res) {
    try {
      const userId = req.user.id;

      const user = await authModel.getAuthProfileById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (user.status === 'BANNED') {
        return res.status(403).json({ success: false, message: 'Your account has been banned.' });
      }

      const wallet = await walletModel.findByUserId(userId);

      return res.status(200).json({
        success: true,
        message: 'Token login successful',
        user: toUserResponse(user),
        wallet: wallet || null,
      });
    } catch (err) {
      console.error('❌ Token login error:', err);
      return res.status(500).json({ success: false, message: 'Token login failed', error: err.message });
    }
  },

  /** POST /api/auth/refresh — rotate refresh token */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token is required' });
      }

      // 1. Verify token cryptographically
      try {
        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      }

      // 2. Check Cache first (Redis), fall back to DB
      const redisKey = `refresh_token:${refreshToken}`;
      const cachedUserStr = await redis.get(redisKey);
      let user;
      let isCacheHit = false;

      if (cachedUserStr) {
        try {
          user = JSON.parse(cachedUserStr);
          isCacheHit = true;
        } catch (e) {
          // parsing failed, fall back to DB
        }
      }

      if (!isCacheHit) {
        const tokenRecord = await prisma.refreshToken.findUnique({
          where: { token: refreshToken },
          include: { user: true },
        });

        if (!tokenRecord) {
          return res.status(401).json({ success: false, message: 'Refresh token not found or revoked' });
        }

        if (new Date() > new Date(tokenRecord.expiresAt)) {
          await prisma.refreshToken.delete({ where: { token: refreshToken } }).catch(() => {});
          await redis.del(redisKey).catch(() => {});
          return res.status(401).json({ success: false, message: 'Refresh token has expired' });
        }

        user = tokenRecord.user;

        const ttlSeconds = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
        await redis.set(redisKey, JSON.stringify(user), ttlSeconds).catch(() => {});
      }

      if (user.status === 'BANNED') {
        return res.status(403).json({ success: false, message: 'Your account has been banned.' });
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
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
          },
        }),
      ]);

      const redisPromise = (async () => {
        await redis.del(redisKey);
        const newRedisKey = `refresh_token:${newRefreshToken}`;
        const ttlSeconds = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
        await redis.set(newRedisKey, JSON.stringify(user), ttlSeconds);
      })();

      await Promise.all([dbPromise, redisPromise]);

      return res.status(200).json({
        success: true,
        message: 'Tokens refreshed successfully',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      console.error('❌ Token refresh error:', err);
      return res.status(500).json({ success: false, message: 'Token refresh failed', error: err.message });
    }
  },

  /** POST /api/auth/logout — revoke refresh token */
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        const dbPromise = prisma.refreshToken.delete({
          where: { token: refreshToken },
        }).catch(() => {});

        const redisPromise = redis.del(`refresh_token:${refreshToken}`);

        await Promise.all([dbPromise, redisPromise]);
      }

      return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ success: false, message: 'Logout failed', error: err.message });
    }
  },
};

module.exports = authController;
