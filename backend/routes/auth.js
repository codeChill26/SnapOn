const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const verifyFirebaseToken = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const prisma = require('../db/prisma');
const redis = require('../config/redis');
const { sendVerificationEmail } = require('../services/emailService');
const { verifyEmail, resendVerification, generateVerificationToken } = require('../controllers/auth');

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 30; // 30 days

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      firebaseUid: user.firebase_uid || user.firebaseUid,
      fullName: user.full_name || user.fullName,
      email: user.email,
      role: user.role || 'USER',
      status: user.status
    },
    process.env.JWT_ACCESS_SECRET || 'snapon_jwt_access_secret_key_2026_secure',
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || 'snapon_jwt_refresh_secret_key_2026_secure',
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


router.post('/sync-user', verifyFirebaseToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { uid, email, name, picture } = req.firebaseUser;

    if (!uid || !email) {
      return res.status(400).json({
        success: false,
        message: 'Firebase user thiếu uid hoặc email.',
      });
    }

    await client.query('BEGIN');

    const host = req.get('host');
    const protocol = req.protocol;
    const defaultAvatar = `${protocol}://${host}/uploads/default-avatar.png`;
    const finalAvatar = picture || defaultAvatar;

    // 1. Single Upsert query for User - Combines check, insert, and update into one database roundtrip
    const upsertUserQuery = `
      INSERT INTO users (
        id,
        firebase_uid,
        email,
        full_name,
        avatar_url,
        status,
        is_verified
      )
      VALUES (gen_random_uuid(), $1, $2, COALESCE($3, split_part($2, '@', 1)), $4, 'ACTIVE', false)
      ON CONFLICT (email) DO UPDATE
      SET firebase_uid = EXCLUDED.firebase_uid,
          full_name = COALESCE($3, users.full_name),
          avatar_url = COALESCE(users.avatar_url, $4)
      RETURNING *;
    `;

    const userResult = await client.query(upsertUserQuery, [
      uid,
      email,
      name || null,
      finalAvatar
    ]);
    const user = userResult.rows[0];

    // 2. Single Upsert/Select query for Wallet - Combines insert and select into one database roundtrip
    const upsertWalletQuery = `
      INSERT INTO wallets (
        id,
        user_id,
        balance,
        available_balance,
        locked_balance
      )
      VALUES (gen_random_uuid(), $1, 0, 0, 0)
      ON CONFLICT (user_id) DO UPDATE
      SET user_id = EXCLUDED.user_id
      RETURNING *;
    `;

    const walletResult = await client.query(upsertWalletQuery, [user.id]);
    const wallet = walletResult.rows[0];

    await client.query('COMMIT');

    // Generate and send verification email if user is not verified
    if (!user.is_verified) {
      const token = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken: token,
          verificationTokenExpires: expiresAt
        }
      });
      
      sendVerificationEmail(user.email, user.full_name, token).catch(err => {
        console.error('❌ Failed to send verification email during sync-user:', err);
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user, refreshToken, req);

    return res.status(200).json({
      success: true,
      message: 'User synced successfully',
      user: {
        id: user.id,
        firebaseUid: user.firebase_uid,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        role: user.role,
        status: user.status,
        isVerified: user.is_verified,
        createdAt: user.created_at,
      },
      wallet,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('❌ Sync user error:', error);
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // Ignore rollback errors if connection already failed
    }

    return res.status(500).json({
      success: false,
      message: 'Sync user failed',
      error: error.message,
    });
  } finally {
    client.release();
  }
});

// ============================================================
// DEV MODE LOGIN — bypasses Firebase entirely
// ============================================================

router.post('/dev/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const result = await pool.query(
      'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];

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
});

router.post('/dev/register', async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, fullName } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const existing = await client.query('SELECT id, is_verified FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];
      if (existingUser.is_verified) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
      // If the user exists but is not verified, delete the old record to allow fresh registration
      await client.query('DELETE FROM users WHERE id = $1', [existingUser.id]);
    }

    await client.query('BEGIN');

    const host = req.get('host');
    const protocol = req.protocol;
    const defaultAvatar = `${protocol}://${host}/uploads/default-avatar.png`;

    const userResult = await client.query(
      `INSERT INTO users (id, firebase_uid, email, full_name, avatar_url, status, is_verified)
       VALUES (gen_random_uuid(), gen_random_uuid(), $1, $2, $3, 'ACTIVE', false)
       RETURNING *`,
      [email, fullName || email.split('@')[0], defaultAvatar]
    );

    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO wallets (id, user_id, balance, available_balance, locked_balance)
       VALUES (gen_random_uuid(), $1, 0, 0, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    await client.query('COMMIT');

    // Generate and send verification email for dev registration
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: token,
        verificationTokenExpires: expiresAt
      }
    });

    sendVerificationEmail(user.email, user.full_name, token).catch(err => {
      console.error('❌ Failed to send verification email during dev register:', err);
    });

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
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Dev register error:', err);
    return res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    
    // Simulate sending OTP. For testing, we use '123456' as standard OTP.
    console.log(`📱 [OTP SERVICE] Generating OTP for ${phone}: 123456`);
    
    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully (Simulated)',
      otp: '123456'
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const client = await pool.connect();
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
    }

    if (otp !== '123456') {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    await client.query('BEGIN');

    // Check if user already exists with this phone number
    const checkUser = await client.query('SELECT * FROM users WHERE phone = $1', [phone]);
    let user;

    if (checkUser.rows.length > 0) {
      user = checkUser.rows[0];
    } else {
      // Register new user with phone-based values
      const email = `${phone}@snapon.vn`;
      const fullName = `Thành viên ${phone.slice(-4)}`;
      
      const host = req.get('host');
      const protocol = req.protocol;
      const defaultAvatar = `${protocol}://${host}/uploads/default-avatar.png`;

      // Check if email already exists (edge case)
      const emailCheck = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      let finalEmail = email;
      if (emailCheck.rows.length > 0) {
        finalEmail = `${phone}_${Date.now()}@snapon.vn`;
      }

      const insertUserQuery = `
        INSERT INTO users (
          id,
          firebase_uid,
          email,
          full_name,
          phone,
          avatar_url,
          status,
          is_verified,
          role
        )
        VALUES (gen_random_uuid(), gen_random_uuid(), $1, $2, $3, $4, 'ACTIVE', true, 'USER')
        RETURNING *;
      `;
      const userResult = await client.query(insertUserQuery, [
        finalEmail,
        fullName,
        phone,
        defaultAvatar
      ]);
      user = userResult.rows[0];

      // Auto-create wallet for new user
      const createWalletQuery = `
        INSERT INTO wallets (id, user_id, balance, available_balance, locked_balance)
        VALUES (gen_random_uuid(), $1, 0, 0, 0)
        ON CONFLICT (user_id) DO NOTHING;
      `;
      await client.query(createWalletQuery, [user.id]);

      // Auto-create tasker profile
      const createProfileQuery = `
        INSERT INTO tasker_profiles (id, user_id, bio, experience, portfolio_url, location_text, latitude, longitude, average_rating)
        VALUES (gen_random_uuid(), $1, 'Thành viên mới', '', '', '', 10.7769, 106.7009, 5.0)
        ON CONFLICT (user_id) DO NOTHING;
      `;
      await client.query(createProfileQuery, [user.id]);
    }

    await client.query('COMMIT');

    // Standardize user object keys to camelCase for mobile
    const userResponse = {
      id: user.id,
      firebaseUid: user.firebase_uid,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      role: user.role || 'USER',
      status: user.status,
      isVerified: user.is_verified,
      createdAt: user.created_at,
    };

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user, refreshToken, req);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      user: userResponse,
      token: accessToken,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Verify OTP error:', err);
    return res.status(500).json({ success: false, message: 'Verification failed', error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/auth/token-login
// Restores session using the Access Token verified by authenticate middleware
router.post('/token-login', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch fresh user profile
    const userResult = await pool.query(
      'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.status === 'BANNED') {
      return res.status(403).json({ success: false, message: 'Your account has been banned.' });
    }

    // Fetch wallet
    const walletResult = await pool.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );

    // Standardize user object keys to camelCase for mobile
    const userResponse = {
      id: user.id,
      firebaseUid: user.firebase_uid,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      role: user.role || 'USER',
      status: user.status,
      isVerified: user.is_verified,
      createdAt: user.created_at,
    };

    return res.status(200).json({
      success: true,
      message: 'Token login successful',
      user: userResponse,
      wallet: walletResult.rows[0] || null,
    });
  } catch (err) {
    console.error('❌ Token login error:', err);
    return res.status(500).json({ success: false, message: 'Token login failed', error: err.message });
  }
});

// POST /api/auth/refresh
// Rotates the refresh token and issues a new access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    // 1. Verify token cryptographically
    let decoded;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'snapon_jwt_refresh_secret_key_2026_secure'
      );
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
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
      // Cache miss / fallback: check PostgreSQL
      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
      });

      if (!tokenRecord) {
        return res.status(401).json({ success: false, message: 'Refresh token not found or revoked' });
      }

      if (new Date() > new Date(tokenRecord.expiresAt)) {
        // Clean up expired token
        await prisma.refreshToken.delete({ where: { token: refreshToken } }).catch(() => {});
        await redis.del(redisKey).catch(() => {});
        return res.status(401).json({ success: false, message: 'Refresh token has expired' });
      }

      user = tokenRecord.user;

      // Populate Redis cache back for future requests
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
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
        }
      })
    ]);

    const redisPromise = (async () => {
      await redis.del(redisKey); // Delete old token
      const newRedisKey = `refresh_token:${newRefreshToken}`;
      const ttlSeconds = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
      await redis.set(newRedisKey, JSON.stringify(user), ttlSeconds); // Set new token
    })();

    await Promise.all([dbPromise, redisPromise]);

    return res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    console.error('❌ Refresh token error:', err);
    return res.status(500).json({ success: false, message: 'Token refresh failed', error: err.message });
  }
});

// POST /api/auth/logout
// Revokes the refresh token from the database and Redis cache
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const dbPromise = prisma.refreshToken.delete({
        where: { token: refreshToken }
      }).catch(() => {}); // ignore error if already deleted

      const redisPromise = redis.del(`refresh_token:${refreshToken}`);

      await Promise.all([dbPromise, redisPromise]);
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    console.error('❌ Logout error:', err);
    return res.status(500).json({ success: false, message: 'Logout failed', error: err.message });
  }
});

// Verification routes
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

module.exports = router;