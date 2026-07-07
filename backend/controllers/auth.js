const passwordController = require('./auth/passwordController');
const otpController = require('./auth/otpController');

module.exports = {
  verifyEmail: otpController.verifyEmail,
  resendVerification: otpController.resendVerification,
  forgotPassword: passwordController.forgotPassword,
  verifyForgotPasswordOtp: passwordController.verifyForgotPasswordOtp,
  resetPassword: passwordController.resetPassword,
  verifyPassword: passwordController.verifyPassword,
};
