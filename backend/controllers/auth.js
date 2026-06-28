/**
 * Auth Controller
 * 
 * This file is actively used by the authentication routes (backend/routes/auth.js).
 * It contains functions for:
 * 1. Email Verification: Handling verifyEmail endpoint request and verifying verificationToken.
 * 2. Verification Code Resending: Handling resend-verification endpoint and generating new verificationToken.
 * 3. Token Generation Utilities: Functions for generating access/refresh JWT tokens and caching refresh tokens in Redis.
 */
const prisma = require('../db/prisma');
const emailService = require('../services/emailService');
const response = require('../utils/responseHandler');
const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const crypto = require('crypto');

// In-memory rate limiting store fallback for forgot password
const forgotPasswordRlStore = new Map();

// Periodic cleanup of forgotPasswordRlStore
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of forgotPasswordRlStore.entries()) {
    if (now > val.resetTime) {
      forgotPasswordRlStore.delete(key);
    }
  }
}, 60000);

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function buildDebugOtpPayload(token, warning) {
  if (!emailService.isEmailDebugOtpEnabled()) return null;
  return {
    debugOtp: token,
    ...(warning ? { warning } : {})
  };
}

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
      isIdVerified: updatedUser.isIdVerified,
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

    const mailResult = await emailService.sendVerificationEmail(user.email, user.fullName || user.full_name, token);
    if (mailResult.success) {
      return response.success(res, buildDebugOtpPayload(token), 'Mã xác thực mới đã được gửi vào email của bạn');
    }

    const debugPayload = buildDebugOtpPayload(token, mailResult.message);
    if (debugPayload) {
      console.warn('[EMAIL SERVICE] Returning debug OTP because EMAIL_DEBUG_OTP=true');
      return response.success(res, debugPayload, 'Không gửi được email, trả OTP debug để test');
    }

    return response.error(res, mailResult.message || 'Không thể gửi email xác thực lúc này. Vui lòng thử lại sau.', 500);
  } catch (error) {
    console.error('❌ Resend verification error:', error);
    return response.error(res, 'Gửi lại mã xác thực thất bại: ' + error.message, 500);
  }
};

/**
 * Step 1: Send OTP to email for password reset
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    // Rate limiting: 1 OTP / 60 seconds, 5 OTP / 1 hour
    const minKey = `rl:forgot-password-min:${cleanEmail}`;
    const hourKey = `rl:forgot-password-hour:${cleanEmail}`;
    const now = Date.now();

    if (redis.isActive()) {
      const minVal = await redis.get(minKey);
      if (minVal) {
        return res.status(429).json({ message: 'Too many requests. Please try again after 60 seconds.' });
      }

      const hourVal = await redis.get(hourKey);
      const hourCount = hourVal ? parseInt(hourVal, 10) : 0;
      if (hourCount >= 5) {
        return res.status(429).json({ message: 'Too many requests. Please try again after an hour.' });
      }

      // Set limits
      await redis.set(minKey, '1', 60);
      await redis.set(hourKey, String(hourCount + 1), 3600);
    } else {
      // In-memory rate limiting fallback
      const minData = forgotPasswordRlStore.get(minKey);
      if (minData && now < minData.resetTime) {
        return res.status(429).json({ message: 'Too many requests. Please try again after 60 seconds.' });
      }

      const hourData = forgotPasswordRlStore.get(hourKey);
      if (hourData && now < hourData.resetTime && hourData.count >= 5) {
        return res.status(429).json({ message: 'Too many requests. Please try again after an hour.' });
      }

      // Update in-memory keys
      forgotPasswordRlStore.set(minKey, { count: 1, resetTime: now + 60 * 1000 });
      const newHourCount = (hourData && now < hourData.resetTime) ? hourData.count + 1 : 1;
      const newHourReset = (hourData && now < hourData.resetTime) ? hourData.resetTime : now + 3600 * 1000;
      forgotPasswordRlStore.set(hourKey, { count: newHourCount, resetTime: newHourReset });
    }

    console.log(`[FORGOT PASSWORD] Processing request for email: ${cleanEmail}`);

    // Check user existence
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    // If user does not exist, return standard message to avoid email enumeration
    if (!user) {
      console.log(`[FORGOT PASSWORD] Email ${cleanEmail} not found. Returning standard success message.`);
      return res.status(200).json({
        message: 'If the account exists, an OTP has been sent.'
      });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate previous OTPs for this email
    await prisma.forgotPasswordOTP.updateMany({
      where: { email: cleanEmail, verified: false },
      data: { expiresAt: new Date(0) }
    });

    // Save OTP to DB
    await prisma.forgotPasswordOTP.create({
      data: {
        email: cleanEmail,
        otpHash,
        expiresAt,
        verified: false
      }
    });

    // Send email using Brevo
    console.log(`[FORGOT PASSWORD] Sending reset OTP email to ${cleanEmail}`);
    const mailResult = await emailService.sendResetPasswordEmail(cleanEmail, otp);
    
    const responsePayload = {
      message: 'If the account exists, an OTP has been sent.'
    };

    // Include debug OTP in development mode for easy testing
    if (emailService.isEmailDebugOtpEnabled()) {
      responsePayload.debugOtp = otp;
      console.log(`[FORGOT PASSWORD] Dev mode enabled. OTP is: ${otp}`);
    }

    if (mailResult.success) {
      return res.status(200).json(responsePayload);
    }

    // Fallback if email sending fails but debug OTP is enabled (helps local test)
    if (emailService.isEmailDebugOtpEnabled()) {
      responsePayload.warning = 'Email failed to send but debug OTP returned: ' + mailResult.message;
      return res.status(200).json(responsePayload);
    }

    return res.status(500).json({ message: 'Failed to send OTP email. Please try again later.' });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Step 2: Verify OTP and return a reset token
 */
const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ message: 'OTP must be exactly 6 digits.' });
    }

    console.log(`[FORGOT PASSWORD] Verifying OTP for email: ${cleanEmail}`);

    // Find the latest unverified OTP record
    const otpRecord = await prisma.forgotPasswordOTP.findFirst({
      where: { email: cleanEmail, verified: false },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    // Check expiration
    if (new Date() > new Date(otpRecord.expiresAt)) {
      return res.status(400).json({ message: 'OTP has expired.' });
    }

    // Verify hash
    const inputHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    if (otpRecord.otpHash !== inputHash) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    // Mark OTP as verified
    await prisma.forgotPasswordOTP.update({
      where: { id: otpRecord.id },
      data: { verified: true }
    });

    // Create a random reset token
    const resetToken = crypto.randomUUID();
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save reset token
    await prisma.passwordResetToken.create({
      data: {
        email: cleanEmail,
        tokenHash,
        expiresAt,
        used: false
      }
    });

    console.log(`[FORGOT PASSWORD] OTP verified successfully for ${cleanEmail}. Reset token generated.`);

    return res.status(200).json({ resetToken });
  } catch (error) {
    console.error('❌ Verify forgot password OTP error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Step 3: Reset password using the reset token
 */
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    // Hash the reset token to lookup
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Find valid token
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, used: false }
    });

    if (!tokenRecord) {
      return res.status(400).json({ message: 'Invalid reset token.' });
    }

    // Check expiration
    if (new Date() > new Date(tokenRecord.expiresAt)) {
      return res.status(400).json({ message: 'Invalid reset token.' }); // requirement says "Nếu token sai: Invalid reset token." (so we output same for expired to keep simple or clean)
    }

    console.log(`[FORGOT PASSWORD] Resetting password for email: ${tokenRecord.email}`);

    // Hash new password using SHA-256
    const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');

    // Update user password
    await prisma.user.update({
      where: { email: tokenRecord.email },
      data: { password: hashedPassword }
    });

    // Invalidate reset token
    await prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { used: true }
    });

    // Delete old OTPs for this email
    await prisma.forgotPasswordOTP.deleteMany({
      where: { email: tokenRecord.email }
    });

    console.log(`[FORGOT PASSWORD] Password reset completed successfully for ${tokenRecord.email}`);

    return res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  verifyEmail,
  resendVerification,
  generateVerificationToken,
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
};
