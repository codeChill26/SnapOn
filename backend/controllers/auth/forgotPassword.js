'use strict';

const prisma = require('../../db/prisma');
const response = require('../../utils/responseHandler');
const redis = require('../../config/redis');
const crypto = require('crypto');
const emailService = require('../../services/emailService');
const { AUTH_CONFIG } = require('../../utils/constants');

const forgotPasswordRlStore = new Map();

// Periodic cleanup of forgotPasswordRlStore using constant interval
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of forgotPasswordRlStore.entries()) {
    if (now > val.resetTime) {
      forgotPasswordRlStore.delete(key);
    }
  }
}, AUTH_CONFIG.CLEANUP_INTERVAL_MS);

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
    const now = Date.now();

    if (redis.isActive()) {
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
    } else {
      const minData = forgotPasswordRlStore.get(minKey);
      if (minData && now < minData.resetTime) {
        return response.error(res, `Too many requests. Please try again after ${AUTH_CONFIG.FORGOT_PASSWORD_MIN_LOCK_SEC} seconds.`, 429);
      }

      const hourData = forgotPasswordRlStore.get(hourKey);
      if (hourData && now < hourData.resetTime && hourData.count >= 5) {
        return response.error(res, 'Too many requests. Please try again after an hour.', 429);
      }

      forgotPasswordRlStore.set(minKey, { count: 1, resetTime: now + AUTH_CONFIG.FORGOT_PASSWORD_MIN_LOCK_SEC * 1000 });
      const newHourCount = (hourData && now < hourData.resetTime) ? hourData.count + 1 : 1;
      const newHourReset = (hourData && now < hourData.resetTime) ? hourData.resetTime : now + AUTH_CONFIG.FORGOT_PASSWORD_HOUR_LOCK_SEC * 1000;
      forgotPasswordRlStore.set(hourKey, { count: newHourCount, resetTime: newHourReset });
    }

    console.log(`[FORGOT PASSWORD] Processing request for email: ${cleanEmail}`);

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      console.log(`[FORGOT PASSWORD] Email ${cleanEmail} not found. Returning standard success message.`);
      return response.success(res, null, 'If the account exists, an OTP has been sent.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
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
    
    const debugPayload = {};
    if (emailService.isEmailDebugOtpEnabled()) {
      debugPayload.debugOtp = otp;
      console.log(`[FORGOT PASSWORD] Dev mode enabled. OTP is: ${otp}`);
    }

    if (mailResult.success) {
      return response.success(res, Object.keys(debugPayload).length ? debugPayload : null, 'If the account exists, an OTP has been sent.');
    }

    if (emailService.isEmailDebugOtpEnabled()) {
      debugPayload.warning = 'Email failed to send but debug OTP returned: ' + mailResult.message;
      return response.success(res, debugPayload, 'If the account exists, an OTP has been sent.');
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

module.exports = {
  forgotPassword,
  verifyForgotPasswordOtp,
};
