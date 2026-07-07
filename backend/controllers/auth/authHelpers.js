'use strict';

function localGenerateVerificationToken() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildDebugOtpPayload(token, warning) {
  // Always return null to prevent leaking OTP in API responses
  return null;
}

module.exports = {
  localGenerateVerificationToken,
  buildDebugOtpPayload,
};
