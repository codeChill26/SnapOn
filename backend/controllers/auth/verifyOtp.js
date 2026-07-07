'use strict';

const pool = require('../../config/db');
const response = require('../../utils/responseHandler');
const { generateAccessToken, generateRefreshToken } = require('../../utils/jwtHelper');
const { saveRefreshToken } = require('./authHelper');
const { setOtpCache, getOtpCache, delOtpCache } = require('./otpCacheHelper');

async function verifyOtp(req, res) {
  const client = await pool.connect();
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return response.error(res, 'Phone and OTP are required', 400);
    }

    const otpData = await getOtpCache(phone);
    if (!otpData) {
      return response.error(res, 'OTP has expired or does not exist', 400);
    }

    if (otpData.retryCount >= otpData.retryLimit) {
      await delOtpCache(phone);
      return response.error(res, 'Too many failed attempts. Please request a new OTP.', 400);
    }

    if (otpData.otp !== otp) {
      otpData.retryCount += 1;
      if (otpData.retryCount >= otpData.retryLimit) {
        await delOtpCache(phone);
        return response.error(res, 'Too many failed attempts. OTP has been invalidated.', 400);
      } else {
        await setOtpCache(phone, otpData);
        return response.error(res, `Invalid OTP code. ${otpData.retryLimit - otpData.retryCount} attempts remaining.`, 400);
      }
    }

    // OTP verified successfully, clear cache
    // NOTE: If Redis becomes unavailable here, delOtpCache will throw 503, causing the request to fail
    // and rolling back the user creation/transaction below, keeping the DB and cache synchronized.
    await delOtpCache(phone);

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
      const avatarUrl = `${protocol}://${host}/uploads/default-avatar.png`;

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
          is_id_verified,
          role
        )
        VALUES (gen_random_uuid(), gen_random_uuid(), $1, $2, $3, $4, 'ACTIVE', true, false, 'USER')
        RETURNING *;
      `;
      const userResult = await client.query(insertUserQuery, [
        finalEmail,
        fullName,
        phone,
        avatarUrl
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
      isIdVerified: user.is_id_verified,
      createdAt: user.created_at,
    };

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user, refreshToken, req);

    return response.success(res, {
      user: userResponse,
      token: accessToken,
      accessToken,
      refreshToken,
    }, 'OTP verified successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Verify OTP error:', err);
    if (err.status === 503) {
      return response.error(res, 'Service Unavailable: OTP cache service is offline.', 503);
    }
    return response.error(res, 'Verification failed: ' + err.message, 500);
  } finally {
    client.release();
  }
}

module.exports = verifyOtp;
