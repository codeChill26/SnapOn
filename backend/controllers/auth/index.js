const loginController = require('./loginController');
const otpController = require('./otpController');
const passwordController = require('./passwordController');
const refreshTokenController = require('./refreshTokenController');
const profileController = require('./profileController');

module.exports = {
  // Login
  syncUser: loginController.syncUser,
  tokenLogin: loginController.tokenLogin,
  logout: loginController.logout,

  // OTP / Verification
  sendOtp: otpController.sendOtp,
  verifyOtp: otpController.verifyOtp,
  verifyEmail: otpController.verifyEmail,
  resendVerification: otpController.resendVerification,

  // Password
  forgotPassword: passwordController.forgotPassword,
  verifyForgotPasswordOtp: passwordController.verifyForgotPasswordOtp,
  resetPassword: passwordController.resetPassword,
  verifyPassword: passwordController.verifyPassword,

  // Refresh Token
  refreshToken: refreshTokenController.refreshToken,

  // Profile / Deletion
  sendDeletionOtp: profileController.sendDeletionOtp,
  submitDeletionRequest: profileController.submitDeletionRequest,
};
