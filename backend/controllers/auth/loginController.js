const pool = require('../../config/db');
const prisma = require('../../db/prisma');
const redis = require('../../config/redis');
const response = require('../../utils/responseHandler');
const { generateAccessToken, generateRefreshToken } = require('../../utils/jwtHelper');
const { saveRefreshToken, sendVerificationEmailInBackground } = require('./authHelper');
const { generateVerificationToken } = require('../auth'); // re-use from old controller if needed, or define locally
const { isEmailDebugOtpEnabled } = require('../../services/emailService');
const { AUTH_CONFIG } = require('../../utils/constants');
const { localGenerateVerificationToken } = require('./authHelpers');

module.exports = {
  async syncUser(req, res) {
    const client = await pool.connect();

    try {
      const { uid, email, name, picture } = req.firebaseUser;

      if (!uid || !email) {
        return response.error(res, 'Firebase user thiếu uid hoặc email.', 400);
      }

      await client.query('BEGIN');

      const host = req.get('host');
      const protocol = req.protocol;
      const defaultAvatar = `${protocol}://${host}/uploads/default-avatar.png`;
      const finalAvatar = picture || defaultAvatar;

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
        name || email.split('@')[0],
        finalAvatar
      ]);
      const user = userResult.rows[0];

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

      let debugOtp = null;
      if (!user.is_verified) {
        const token = localGenerateVerificationToken();
        debugOtp = token;
        const expiresAt = new Date(Date.now() + AUTH_CONFIG.EMAIL_OTP_EXPIRY_MS); // 15 minutes
        
        await prisma.user.update({
          where: { id: user.id },
          data: {
            verificationToken: token,
            verificationTokenExpires: expiresAt
          }
        });
        
        sendVerificationEmailInBackground(user.email, user.full_name, token, 'sync-user verification email');
        const isDev = process.env.NODE_ENV === 'development';
        const allowDebugOtp = AUTH_CONFIG.ALLOW_DEBUG_OTP;
        if (isDev && allowDebugOtp) {
          console.log(`[EMAIL DEBUG] Verification OTP for ${user.email}: ${token.slice(0, 3)}***`);
        }
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      await saveRefreshToken(user, refreshToken, req);

      return response.success(res, {
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
          isIdVerified: user.is_id_verified,
          createdAt: user.created_at,
        },
        wallet,
        accessToken,
        refreshToken,
      }, 'User synced successfully');
    } catch (error) {
      console.error('❌ Sync user error:', error);
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {}

      return response.error(res, 'Sync user failed: ' + error.message, 500);
    } finally {
      client.release();
    }
  },



  async tokenLogin(req, res) {
    try {
      const userId = req.user.id;
      
      const userResult = await pool.query(
        'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, is_id_verified, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return response.error(res, 'User not found', 404);
      }

      const user = userResult.rows[0];

      if (user.status === 'BANNED') {
        return response.error(res, 'Your account has been banned.', 403);
      }

      const walletResult = await pool.query(
        'SELECT * FROM wallets WHERE user_id = $1',
        [userId]
      );

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
        isIdVerified: user.is_id_verified,
        createdAt: user.created_at,
      };

      return response.success(res, {
        user: userResponse,
        wallet: walletResult.rows[0] || null,
      }, 'Token login successful');
    } catch (err) {
      console.error('❌ Token login error:', err);
      return response.error(res, 'Token login failed: ' + err.message, 500);
    }
  },

  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        const dbPromise = prisma.refreshToken.delete({
          where: { token: refreshToken }
        }).catch(() => {});

        const redisPromise = redis.del(`refresh_token:${refreshToken}`);

        await Promise.all([dbPromise, redisPromise]);
      }

      return response.success(res, null, 'Logged out successfully');
    } catch (err) {
      console.error('❌ Logout error:', err);
      return response.error(res, 'Logout failed: ' + err.message, 500);
    }
  }
};
