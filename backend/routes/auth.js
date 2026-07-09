const express = require('express');
const router = express.Router();

const verifyFirebaseToken = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');
const { verifyEmail, resendVerification } = require('../controllers/auth');

// Dev endpoints guard — disabled in production
function guardDevRoute(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Dev APIs are disabled in production environment.',
    });
  }
  next();
}

// POST /api/auth/sync-user — Firebase login sync (upsert user + wallet)
router.post('/sync-user', verifyFirebaseToken, authController.syncUser);

// DEV MODE — bypasses Firebase entirely (blocked in production)
router.post('/dev/login', rateLimiter('dev-login', 5, 60), guardDevRoute, authController.devLogin);
router.post('/dev/register', rateLimiter('dev-register', 5, 60), guardDevRoute, authController.devRegister);

// Phone OTP flow
router.post('/send-otp', rateLimiter('send-otp', 3, 60), authController.sendOtp);
router.post('/verify-otp', rateLimiter('verify-otp', 5, 60), authController.verifyOtp);

// Session lifecycle
router.post('/token-login', verifyFirebaseToken, authController.tokenLogin);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Email verification
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

module.exports = router;
