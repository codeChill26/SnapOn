'use strict';

const response = require('../../utils/responseHandler');
const { setOtpCache } = require('./otpCacheHelper');
const { AUTH_CONFIG } = require('../../utils/constants');

function generateRandomOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtp(req, res) {
  try {
    const { phone } = req.body;
    if (!phone) {
      return response.error(res, 'Phone number is required', 400);
    }

    const otp = generateRandomOTP();
    const otpData = {
      otp: otp,
      retryCount: 0,
      retryLimit: 3
    };

    await setOtpCache(phone, otpData);
    
    const isDev = process.env.NODE_ENV === 'development';
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
}

module.exports = sendOtp;
