const { body } = require('express-validator');

/**
 * Auth Validators — Input validation rules for authentication endpoints
 */
const emailRule = () =>
  body('email')
    .customSanitizer((val) => (typeof val === 'string' ? val.trim().toLowerCase() : ''))
    .notEmpty().withMessage('Email is required.')
    .custom((val) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        throw new Error('Invalid email format.');
      }
      return true;
    });

/**
 * Auth Validators — Input validation rules for authentication endpoints
 */
const authValidator = {
  sendOtp: [
    body('phone')
      .trim()
      .notEmpty().withMessage('Phone number is required.')
  ],

  verifyOtp: [
    body('phone')
      .trim()
      .notEmpty().withMessage('Phone number is required.'),
    body('otp')
      .trim()
      .notEmpty().withMessage('OTP is required.')
      .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits.')
  ],

  verifyEmail: [
    emailRule(),
    body('token')
      .trim()
      .notEmpty().withMessage('Token is required.')
  ],

  resendVerification: [
    emailRule()
  ],

  forgotPassword: [
    emailRule()
  ],

  verifyForgotPasswordOtp: [
    emailRule(),
    body('otp')
      .trim()
      .notEmpty().withMessage('OTP is required.')
      .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits.')
  ],

  resetPassword: [
    body('resetToken')
      .custom((value, { req }) => {
        const token = req.body.resetToken || req.body.reset_token || req.body.token;
        if (!token || typeof token !== 'string' || !token.trim()) {
          throw new Error('Reset token is required.');
        }
        return true;
      }),
    body('newPassword')
      .notEmpty().withMessage('New password is required.')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
  ],

  refreshToken: [
    body('refreshToken')
      .trim()
      .notEmpty().withMessage('Refresh token is required.')
  ],

  sendDeletionOtp: [
    emailRule()
  ],

  submitDeletionRequest: [
    body('fullName')
      .trim()
      .notEmpty().withMessage('Full name is required.'),
    emailRule(),
    body('otp')
      .trim()
      .notEmpty().withMessage('OTP is required.')
      .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits.')
  ]
};

module.exports = authValidator;
