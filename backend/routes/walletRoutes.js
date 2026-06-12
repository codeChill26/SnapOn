const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body, query } = require('express-validator');
const walletController = require('../controllers/walletController');

/**
 * Wallet Routes
 * Base path: /api/wallet
 */

router.get('/me', authenticate, walletController.getMyWallet);

router.get(
  '/transactions',
  authenticate,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('cursor').optional().isUUID(),
  ],
  validate,
  walletController.getMyTransactions
);

// DEV-only topup
router.post(
  '/topup/mock',
  authenticate,
  [body('amount').notEmpty().isFloat({ min: 0.01 })],
  validate,
  walletController.topupMock
);

// PayOS integration routes
router.post(
  '/topup/payos/create',
  authenticate,
  [body('amount').notEmpty().isFloat({ min: 1000 })], // PayOS minimum is 1000 VND
  validate,
  walletController.createPayOSPayment
);

router.post(
  '/topup/payos/webhook',
  walletController.handlePayOSWebhook
);

router.get(
  '/topup/payos/status/:orderCode',
  authenticate,
  walletController.checkPayOSPaymentStatus
);

module.exports = router;
