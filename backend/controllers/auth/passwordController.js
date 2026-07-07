'use strict';

const prisma = require('../../db/prisma');
const response = require('../../utils/responseHandler');
const redis = require('../../config/redis');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const emailService = require('../../services/emailService');
const { AUTH_CONFIG } = require('../../utils/constants');
const admin = require('firebase-admin');
const { localGenerateVerificationToken } = require('./authHelpers');

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return response.error(res, 'Email is required.', 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return response.error(res, 'Invalid email format.', 400);
    }

    const minKey = `rl:forgot-password-min:${cleanEmail}`;
    const hourKey = `rl:forgot-password-hour:${cleanEmail}`;

    if (!redis.isActive()) {
      console.error('❌ [FORGOT PASSWORD] Redis is unavailable. Rate limiting cannot be enforced securely.');
      return response.error(
        res,
        'Service Temporary Unavailable: The security verification service is currently offline. Please try again in a few moments.',
        503
      );
    }

    const minVal = await redis.get(minKey);
    if (minVal) {
      return response.error(res, `Too many requests. Please try again after ${AUTH_CONFIG.FORGOT_PASSWORD_MIN_LOCK_SEC} seconds.`, 429);
    }

    const hourVal = await redis.get(hourKey);
    const hourCount = hourVal ? parseInt(hourVal, 10) : 0;
    if (hourCount >= 5) {
      return response.error(res, 'Too many requests. Please try again after an hour.', 429);
    }

    await redis.set(minKey, '1', AUTH_CONFIG.FORGOT_PASSWORD_MIN_LOCK_SEC);
    await redis.set(hourKey, String(hourCount + 1), AUTH_CONFIG.FORGOT_PASSWORD_HOUR_LOCK_SEC);

    console.log(`[FORGOT PASSWORD] Processing request for email: ${cleanEmail}`);

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      console.log(`[FORGOT PASSWORD] Email ${cleanEmail} not found. Returning standard success message.`);
      return response.success(res, null, 'If the account exists, an OTP has been sent.');
    }

    const otp = localGenerateVerificationToken();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + AUTH_CONFIG.FORGOT_PASSWORD_OTP_EXPIRY_MS);

    await prisma.forgotPasswordOTP.updateMany({
      where: { email: cleanEmail, verified: false },
      data: { expiresAt: new Date(0) }
    });

    await prisma.forgotPasswordOTP.create({
      data: {
        email: cleanEmail,
        otpHash,
        expiresAt,
        verified: false
      }
    });

    console.log(`[FORGOT PASSWORD] Sending reset OTP email to ${cleanEmail}`);
    const mailResult = await emailService.sendResetPasswordEmail(cleanEmail, otp);
    
    const isDev = process.env.NODE_ENV === 'development';
    const allowDebugOtp = AUTH_CONFIG.ALLOW_DEBUG_OTP;
    if (isDev && allowDebugOtp) {
      console.log(`[FORGOT PASSWORD] Generating OTP for ${cleanEmail}: ${otp.slice(0, 3)}***`);
    }

    if (mailResult.success) {
      return response.success(res, null, 'If the account exists, an OTP has been sent.');
    }

    return response.error(res, 'Failed to send OTP email. Please try again later.', 500);
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    return response.error(res, 'Internal server error.', 500);
  }
}

async function verifyForgotPasswordOtp(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return response.error(res, 'Email and OTP are required.', 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return response.error(res, 'OTP must be exactly 6 digits.', 400);
    }

    console.log(`[FORGOT PASSWORD] Verifying OTP for email: ${cleanEmail}`);

    const otpRecord = await prisma.forgotPasswordOTP.findFirst({
      where: { email: cleanEmail, verified: false },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      return response.error(res, 'Invalid OTP.', 400);
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      return response.error(res, 'OTP has expired.', 400);
    }

    const inputHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    if (otpRecord.otpHash !== inputHash) {
      return response.error(res, 'Invalid OTP.', 400);
    }

    await prisma.forgotPasswordOTP.update({
      where: { id: otpRecord.id },
      data: { verified: true }
    });

    const resetToken = crypto.randomUUID();
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + AUTH_CONFIG.PASSWORD_RESET_TOKEN_EXPIRY_MS);

    await prisma.passwordResetToken.create({
      data: {
        email: cleanEmail,
        tokenHash,
        expiresAt,
        used: false
      }
    });

    console.log(`[FORGOT PASSWORD] OTP verified successfully for ${cleanEmail}. Reset token generated.`);

    return response.success(res, { resetToken }, 'OTP verified successfully');
  } catch (error) {
    console.error('❌ Verify forgot password OTP error:', error);
    return response.error(res, 'Internal server error.', 500);
  }
}

async function resetPassword(req, res) {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return response.error(res, 'Reset token and new password are required.', 400);
    }

    if (newPassword.length < 8) {
      return response.error(res, 'Password must be at least 8 characters long.', 400);
    }

    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, used: false }
    });

    if (!tokenRecord) {
      return response.error(res, 'Invalid reset token.', 400);
    }

    if (new Date() > new Date(tokenRecord.expiresAt)) {
      return response.error(res, 'Invalid reset token.', 400);
    }

    console.log(`[FORGOT PASSWORD] Resetting password for email: ${tokenRecord.email}`);

    const hashedPassword = await bcrypt.hash(newPassword, AUTH_CONFIG.BCRYPT_SALT_ROUNDS);

    const updatedUser = await prisma.user.update({
      where: { email: tokenRecord.email },
      data: { password: hashedPassword }
    });

    if (admin.apps.length > 0 && updatedUser.firebaseUid) {
      const hasServiceAccount = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;
      if (!hasServiceAccount) {
        console.warn('⚠️ [FORGOT PASSWORD] Firebase Service Account credentials missing. Cannot sync password update to Firebase Auth.');
        return response.error(res, 'Không thể reset mật khẩu: Backend của bạn thiếu cấu hình biến môi trường FIREBASE_CLIENT_EMAIL hoặc FIREBASE_PRIVATE_KEY (Service Account) để đồng bộ mật khẩu lên Firebase.', 500);
      }

      try {
        console.log(`[FORGOT PASSWORD] Syncing new password to Firebase Auth for uid: ${updatedUser.firebaseUid}`);
        await admin.auth().updateUser(updatedUser.firebaseUid, {
          password: newPassword
        });
      } catch (fbError) {
        console.error('❌ Failed to update password in Firebase Auth:', fbError);
        return response.error(res, 'Failed to sync password reset with Firebase Authentication: ' + fbError.message, 500);
      }
    }

    await prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { used: true }
    });

    await prisma.forgotPasswordOTP.deleteMany({
      where: { email: tokenRecord.email }
    });

    console.log(`[FORGOT PASSWORD] Password reset completed successfully for ${tokenRecord.email}`);

    return response.success(res, null, 'Password has been reset successfully.');
  } catch (error) {
    console.error('❌ Reset password error:', error);
    return response.error(res, 'Internal server error.', 500);
  }
}

async function verifyPassword(password, storedHash, email = null) {
  if (!storedHash) return false;

  // 1. If stored hash is Bcrypt, compare immediately
  if (storedHash.startsWith('$2')) {
    return await bcrypt.compare(password, storedHash);
  }

  // NOTE: Password Migration Plan (SHA-256 to Bcrypt)
  //
  // - Phase 1 (Current): ALLOW_SHA256_FALLBACK = true. Users logging in with legacy SHA-256 hashes
  //   will have their password automatically migrated/re-hashed to Bcrypt upon successful verification.
  // - Phase 2 (Planned): ALLOW_SHA256_FALLBACK = false. Deny legacy SHA-256 logins. This flag will be set to false
  //   after verification that the majority of active users have logged in once and been migrated.
  // - Phase 3 (Planned): Delete fallback verification logic completely from passwordController.js.
  //
  // TODO: Delete the entire block below (from line 254 to the end of verifyPassword) once ALLOW_SHA256_FALLBACK is permanently set to false.

  // 2. Otherwise, check if SHA-256 fallback is allowed
  if (!AUTH_CONFIG.ALLOW_SHA256_FALLBACK) {
    console.warn('[PASSWORD AUTH] Rejected legacy SHA-256 hash because ALLOW_SHA256_FALLBACK is disabled.');
    return false;
  }

  // 3. Verify legacy SHA-256 hash
  const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
  const isMatch = sha256Hash === storedHash;

  if (isMatch && email) {
    try {
      // 4. Perform automatic migration to Bcrypt
      const newBcryptHash = await bcrypt.hash(password, AUTH_CONFIG.BCRYPT_SALT_ROUNDS);
      await prisma.user.update({
        where: { email: email.trim().toLowerCase() },
        data: { password: newBcryptHash }
      });
      console.log(`[PASSWORD MIGRATION] User ${email} password successfully migrated from SHA-256 to Bcrypt.`);
    } catch (dbErr) {
      console.error(`[PASSWORD MIGRATION] Automatic Bcrypt migration failed for user ${email}:`, dbErr.message);
    }
  }

  return isMatch;
}

module.exports = {
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
  verifyPassword,
};
