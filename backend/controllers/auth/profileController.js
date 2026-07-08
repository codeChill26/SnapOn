const prisma = require('../../db/prisma');
const response = require('../../utils/responseHandler');
const { sendDeletionOtpEmail } = require('../../services/emailService');
const { setOtpCache, getOtpCache, delOtpCache } = require('./otpCacheHelper');
const { AUTH_CONFIG } = require('../../utils/constants');
const { localGenerateVerificationToken } = require('./authHelper');

module.exports = {
  async sendDeletionOtp(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return response.error(res, 'Email is required.', 400);
      }

      const cleanEmail = email.trim().toLowerCase();

      // 1. Verify user exists in system
      const user = await prisma.user.findUnique({
        where: { email: cleanEmail }
      });

      if (!user) {
        return response.error(res, 'Không tìm thấy tài khoản với email này.', 404);
      }

      // 2. Generate 6-digit OTP
      const otp = localGenerateVerificationToken();
      const otpData = {
        otp: otp,
        retryCount: 0,
        retryLimit: 3
      };

      // 3. Cache OTP in Redis or in-memory map
      const key = `deletion-otp:${cleanEmail}`;
      await setOtpCache(key, otpData, 300); // 5 minutes TTL

      // 4. Send email
      const isDev = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging';
      const allowDebugOtp = AUTH_CONFIG.ALLOW_DEBUG_OTP;
      if (isDev && allowDebugOtp) {
        console.log(`✉️ [DELETION OTP] Generating OTP for ${cleanEmail}: ${otp.slice(0, 3)}***`);
      }

      const mailResult = await sendDeletionOtpEmail(cleanEmail, user.fullName, otp);

      if (mailResult.success) {
        return response.success(res, null, 'Mã OTP xác thực xóa tài khoản đã được gửi vào email của bạn.');
      }

      return response.error(res, 'Không thể gửi email OTP lúc này. Vui lòng thử lại sau.', 500);
    } catch (err) {
      console.error('❌ Send deletion OTP error:', err);
      if (err.status === 503) {
        return response.error(res, 'Service Unavailable: OTP cache service is offline.', 503);
      }
      return response.error(res, 'Internal server error: ' + err.message, 500);
    }
  },

  async submitDeletionRequest(req, res) {
    try {
      const { fullName, email, reason, otp } = req.body;
      if (!fullName || !email || !otp) {
        return response.error(res, 'fullName, email, and otp are required.', 400);
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = otp.trim();

      // 1. Verify OTP
      const key = `deletion-otp:${cleanEmail}`;
      const cachedOtpData = await getOtpCache(key);

      if (!cachedOtpData) {
        return response.error(res, 'Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.', 400);
      }

      if (cachedOtpData.retryCount >= cachedOtpData.retryLimit) {
        await delOtpCache(key);
        return response.error(res, 'Mã OTP đã bị khóa do nhập sai quá nhiều lần.', 400);
      }

      if (cachedOtpData.otp !== cleanOtp) {
        cachedOtpData.retryCount += 1;
        if (cachedOtpData.retryCount >= cachedOtpData.retryLimit) {
          await delOtpCache(key);
          return response.error(res, 'Nhập sai quá số lần cho phép. Mã OTP đã bị vô hiệu hóa.', 400);
        } else {
          await setOtpCache(key, cachedOtpData, 300);
          return response.error(res, `Mã OTP không hợp lệ. Còn lại ${cachedOtpData.retryLimit - cachedOtpData.retryCount} lần nhập.`, 400);
        }
      }

      // OTP is valid! Clear it
      await delOtpCache(key);

      // Create the deletion request record
      const deletionRequest = await prisma.accountDeletionRequest.create({
        data: {
          fullName: fullName.trim(),
          email: cleanEmail,
          reason: reason ? reason.trim() : null,
          status: 'PENDING'
        }
      });

      return response.success(res, deletionRequest, 'Account deletion request submitted successfully.', 201);
    } catch (err) {
      console.error('❌ Account deletion request error:', err);
      if (err.status === 503) {
        return response.error(res, 'Service Unavailable: OTP cache service is offline.', 503);
      }
      return response.error(res, 'Internal server error: ' + err.message, 500);
    }
  }
};
