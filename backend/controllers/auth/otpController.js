'use strict';

const pool = require('../../config/db');
const prisma = require('../../db/prisma');
const response = require('../../utils/responseHandler');
const { generateAccessToken, generateRefreshToken } = require('../../utils/jwtHelper');
const { saveRefreshToken, localGenerateVerificationToken } = require('./authHelper');
const { setOtpCache, getOtpCache, delOtpCache } = require('./otpCacheHelper');
const { AUTH_CONFIG } = require('../../utils/constants');
const emailService = require('../../services/emailService');
const withDbTx = require('../../utils/withDbTx');

const otpController = {
  /**
   * POST /api/auth/send-otp
   * Send OTP code for phone login verification (Simulated)
   */
  async sendOtp(req, res) {
    try {
      const { phone } = req.body;
      if (!phone) {
        return response.error(res, 'Phone number is required', 400);
      }

      const otp = localGenerateVerificationToken();
      const otpData = {
        otp: otp,
        retryCount: 0,
        retryLimit: 3
      };

      await setOtpCache(phone, otpData);
      
      const isDev = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging';
      const allowDebugOtp = AUTH_CONFIG.ALLOW_DEBUG_OTP;
      if (isDev && allowDebugOtp) {
        console.log(`📱 [OTP SERVICE] Generating OTP for ${phone}: ${otp.slice(0, 3)}***`);
      }
      
      const responsePayload = {
        message: 'OTP sent successfully (Simulated)'
      };
      
      return response.success(res, responsePayload, 'OTP sent successfully (Simulated)');
    } catch (err) {
      console.error('Send OTP error:', err);
      if (err.status === 503) {
        return response.error(res, 'Service Unavailable: OTP cache service is offline.', 503);
      }
      return response.error(res, 'Failed to send OTP', 500);
    }
  },

  /**
   * POST /api/auth/verify-otp
   * Verify OTP code and login/register phone user
   */
  async verifyOtp(req, res) {
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
      await delOtpCache(phone);

      const user = await withDbTx(async (client) => {
        // Check if user already exists with this phone number
        const checkUser = await client.query('SELECT * FROM users WHERE phone = $1', [phone]);
        let userVal;

        if (checkUser.rows.length > 0) {
          userVal = checkUser.rows[0];
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
          userVal = userResult.rows[0];

          // Auto-create wallet for new user
          const createWalletQuery = `
            INSERT INTO wallets (id, user_id, balance, available_balance, locked_balance)
            VALUES (gen_random_uuid(), $1, 0, 0, 0)
            ON CONFLICT (user_id) DO NOTHING;
          `;
          await client.query(createWalletQuery, [userVal.id]);

          // Auto-create tasker profile
          const createProfileQuery = `
            INSERT INTO tasker_profiles (id, user_id, bio, experience, portfolio_url, location_text, latitude, longitude, average_rating)
            VALUES (gen_random_uuid(), $1, 'Thành viên mới', '', '', '', 10.7769, 106.7009, 5.0)
            ON CONFLICT (user_id) DO NOTHING;
          `;
          await client.query(createProfileQuery, [userVal.id]);
        }

        return userVal;
      });

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
      console.error('Verify OTP error:', err);
      if (err.status === 503) {
        return response.error(res, 'Service Unavailable: OTP cache service is offline.', 503);
      }
      return response.error(res, 'Verification failed: ' + err.message, 500);
    }
  },

  /**
   * POST /api/auth/verify-email
   * Verify email verification token
   */
  async verifyEmail(req, res) {
    try {
      const { email, token } = req.body;

      if (!email || !token) {
        return response.error(res, 'Email và mã xác thực là bắt buộc', 400);
      }

      const user = await prisma.user.findUnique({
        where: { email: email.trim() },
        include: { wallet: true }
      });

      if (!user) {
        return response.error(res, 'Không tìm thấy người dùng', 404);
      }

      if (user.isVerified) {
        return response.error(res, 'Tài khoản đã được xác thực trước đó', 400);
      }

      if (!user.verificationToken || user.verificationToken !== token) {
        return response.error(res, 'Mã xác thực không hợp lệ', 400);
      }

      if (new Date() > new Date(user.verificationTokenExpires)) {
        return response.error(res, 'Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại mã mới', 400);
      }

      const updatedUser = await prisma.user.update({
        where: { email: email.trim() },
        data: {
          isVerified: true,
          verificationToken: null,
          verificationTokenExpires: null
        }
      });

      const accessToken = generateAccessToken(updatedUser);
      const refreshToken = generateRefreshToken(updatedUser);
      await saveRefreshToken(updatedUser, refreshToken, req);

      const userResponse = {
        id: updatedUser.id,
        firebaseUid: updatedUser.firebaseUid || updatedUser.firebase_uid,
        fullName: updatedUser.fullName || updatedUser.full_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatarUrl: updatedUser.avatarUrl || updatedUser.avatar_url,
        role: updatedUser.role || 'USER',
        status: updatedUser.status,
        isVerified: updatedUser.isVerified,
        isIdVerified: updatedUser.isIdVerified,
        createdAt: updatedUser.createdAt,
      };

      return response.success(res, {
        user: userResponse,
        accessToken,
        refreshToken,
        wallet: user.wallet
      }, 'Xác thực email thành công');
    } catch (error) {
      console.error('❌ Verify email error:', error);
      return response.error(res, 'Xác thực email thất bại: ' + error.message, 500);
    }
  },

  /**
   * POST /api/auth/resend-verification
   * Resend email verification token
   */
  async resendVerification(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return response.error(res, 'Email là bắt buộc', 400);
      }

      const user = await prisma.user.findUnique({
        where: { email: email.trim() }
      });

      if (!user) {
        return response.error(res, 'Không tìm thấy người dùng với email này', 404);
      }

      if (user.isVerified) {
        return response.error(res, 'Email này đã được xác thực', 400);
      }

      const token = localGenerateVerificationToken();
      const expiresAt = new Date(Date.now() + AUTH_CONFIG.EMAIL_OTP_EXPIRY_MS);

      await prisma.user.update({
        where: { email: email.trim() },
        data: {
          verificationToken: token,
          verificationTokenExpires: expiresAt
        }
      });

      const mailResult = await emailService.sendVerificationEmail(user.email, user.fullName || user.full_name, token);
      
      const isDev = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging';
      const allowDebugOtp = AUTH_CONFIG.ALLOW_DEBUG_OTP;
      if (isDev && allowDebugOtp) {
        console.log(`✉️ [EMAIL SERVICE] Generating OTP for ${user.email}: ${token.slice(0, 3)}***`);
      }

      if (mailResult.success) {
        return response.success(res, null, 'Mã xác thực mới đã được gửi vào email của bạn');
      }

      return response.error(res, mailResult.message || 'Không thể gửi email xác thực lúc này. Vui lòng thử lại sau.', 500);
    } catch (error) {
      console.error('❌ Resend verification error:', error);
      return response.error(res, 'Gửi lại mã xác thực thất bại: ' + error.message, 500);
    }
  }
};

module.exports = otpController;
