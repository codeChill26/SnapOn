const express = require('express');
const router = express.Router();
const rateLimiter = require('../middleware/rateLimiter');
const verifyFirebaseToken = require('../middleware/auth');

const loginController = require('../controllers/auth/loginController');
const otpController = require('../controllers/auth/otpController');
const passwordController = require('../controllers/auth/passwordController');
const refreshTokenController = require('../controllers/auth/refreshTokenController');
const profileController = require('../controllers/auth/profileController');

// Login/Sync Routes
router.post('/sync-user', verifyFirebaseToken, loginController.syncUser);
router.post('/token-login', verifyFirebaseToken, loginController.tokenLogin);
router.post('/logout', loginController.logout);

// OTP & Verification Routes
router.post('/send-otp', rateLimiter('send-otp', 3, 60), otpController.sendOtp);
router.post('/verify-otp', rateLimiter('verify-otp', 5, 60), otpController.verifyOtp);
router.post('/verify-email', otpController.verifyEmail);
router.post('/resend-verification', otpController.resendVerification);

// Forgot Password Routes
router.post('/forgot-password', passwordController.forgotPassword);
router.post('/verify-forgot-password-otp', passwordController.verifyForgotPasswordOtp);
router.post('/reset-password', passwordController.resetPassword);

// Token Refresh Routes
router.post('/refresh', refreshTokenController.refreshToken);

// Profile / Account Deletion Routes
router.post('/deletion-request/send-otp', rateLimiter('send-deletion-otp', 3, 60), profileController.sendDeletionOtp);
router.post('/deletion-request', profileController.submitDeletionRequest);

module.exports = router;
