const prisma = require('../db/prisma');
const emailService = require('../services/emailService');
const response = require('../utils/responseHandler');
const jwt = require('jsonwebtoken');
const redis = require('../config/redis');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      firebaseUid: user.firebaseUid || user.firebase_uid,
      fullName: user.fullName || user.full_name,
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

  // 2. Save in Redis Cache with TTL
  const ttlSeconds = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
  const redisPromise = redis.set(`refresh_token:${token}`, JSON.stringify(user), ttlSeconds);

  const [dbToken, _] = await Promise.all([dbPromise, redisPromise]);
  return dbToken;
}

/**
 * Generates a random 6-digit numeric OTP code.
 */
function generateVerificationToken() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Handles verifying the user's email with the 6-digit token.
 */
const verifyEmail = async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return response.error(res, 'Email và mã xác thực là bắt buộc', 400);
    }

    // 1. Find user by email
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

    // 2. Check token mismatch or expiration
    if (!user.verificationToken || user.verificationToken !== token) {
      return response.error(res, 'Mã xác thực không hợp lệ', 400);
    }

    if (new Date() > new Date(user.verificationTokenExpires)) {
      return response.error(res, 'Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại mã mới', 400);
    }

    // 3. Update user to verified and clear the token fields
    const updatedUser = await prisma.user.update({
      where: { email: email.trim() },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpires: null
      }
    });

    // 4. Generate access & refresh tokens
    const accessToken = generateAccessToken(updatedUser);
    const refreshToken = generateRefreshToken(updatedUser);
    await saveRefreshToken(updatedUser, refreshToken, req);

    // Standardize user object keys to camelCase for the frontend
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
      createdAt: updatedUser.createdAt,
    };

    return res.status(200).json({
      success: true,
      message: 'Xác thực email thành công',
      user: userResponse,
      accessToken,
      refreshToken,
      wallet: user.wallet
    });
  } catch (error) {
    console.error('❌ Verify email error:', error);
    return response.error(res, 'Xác thực email thất bại: ' + error.message, 500);
  }
};

/**
 * Resends the 6-digit verification code.
 */
const resendVerification = async (req, res) => {
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

    // Generate new token and set expiration to 15 minutes
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.user.update({
      where: { email: email.trim() },
      data: {
        verificationToken: token,
        verificationTokenExpires: expiresAt
      }
    });

    // Dispatch verification email
    await emailService.sendVerificationEmail(user.email, user.fullName || user.full_name, token);

    return response.success(res, null, 'Mã xác thực mới đã được gửi vào email của bạn');
  } catch (error) {
    console.error('❌ Resend verification error:', error);
    return response.error(res, 'Gửi lại mã xác thực thất bại: ' + error.message, 500);
  }
};

module.exports = {
  verifyEmail,
  resendVerification,
  generateVerificationToken,
};
