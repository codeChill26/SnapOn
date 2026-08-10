const express = require('express');
const router = express.Router();
const rateLimiter = require('../middleware/rateLimiter');
const verifyFirebaseToken = require('../middleware/auth');
const authController = require('../controllers/auth');
const authValidator = require('../validators/authValidator');
const validate = require('../middleware/validate');

// Login/Sync Routes
router.post('/sync-user', verifyFirebaseToken, authController.syncUser);
router.post('/token-login', verifyFirebaseToken, authController.tokenLogin);
router.post('/logout', authController.logout);

// OTP & Verification Routes
router.post('/send-otp', rateLimiter('send-otp', 3, 60), authValidator.sendOtp, validate, authController.sendOtp);
router.post('/verify-otp', rateLimiter('verify-otp', 5, 60), authValidator.verifyOtp, validate, authController.verifyOtp);
router.post('/verify-email', authValidator.verifyEmail, validate, authController.verifyEmail);
router.post('/resend-verification', authValidator.resendVerification, validate, authController.resendVerification);

// Forgot Password Routes
router.post('/forgot-password', authValidator.forgotPassword, validate, authController.forgotPassword);
router.post('/verify-forgot-password-otp', authValidator.verifyForgotPasswordOtp, validate, authController.verifyForgotPasswordOtp);
router.post('/reset-password', authValidator.resetPassword, validate, authController.resetPassword);

// Token Refresh Routes
router.post('/refresh', authValidator.refreshToken, validate, authController.refreshToken);

// Profile / Account Deletion Routes
router.post('/deletion-request/send-otp', rateLimiter('send-deletion-otp', 3, 60), authValidator.sendDeletionOtp, validate, authController.sendDeletionOtp);
router.post('/deletion-request', authValidator.submitDeletionRequest, validate, authController.submitDeletionRequest);

module.exports = router;
