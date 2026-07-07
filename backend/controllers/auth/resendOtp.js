'use strict';

const prisma = require('../../db/prisma');
const response = require('../../utils/responseHandler');
const emailService = require('../../services/emailService');
const { AUTH_CONFIG } = require('../../utils/constants');

async function resendVerification(req, res) {
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
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + AUTH_CONFIG.EMAIL_OTP_EXPIRY_MS); // 15 mins

    await prisma.user.update({
      where: { email: email.trim() },
      data: {
        verificationToken: token,
        verificationTokenExpires: expiresAt
      }
    });

    const mailResult = await emailService.sendVerificationEmail(user.email, user.fullName || user.full_name, token);
    
    const isDev = process.env.NODE_ENV === 'development';
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

module.exports = resendVerification;
