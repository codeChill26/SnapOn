const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body, query } = require('express-validator');
const walletController = require('../controllers/walletController');
const rateLimiter = require('../middleware/rateLimiter');

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
  rateLimiter('wallet-topup', 10, 60),
  [body('amount').notEmpty().isFloat({ min: 0.01 })],
  validate,
  walletController.topupMock
);

// ==========================================
// PayOS Integration Routes (Web Flow)
// ==========================================

router.post(
  '/topup/payos/create',
  authenticate,
  rateLimiter('wallet-topup', 10, 60),
  [body('amount').notEmpty().isFloat({ min: 1000 })], // PayOS minimum is 1000 VND
  validate,
  walletController.createPayOSPaymentSession
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

// Withdrawal
router.post(
  '/withdraw',
  authenticate,
  rateLimiter('wallet-withdraw', 5, 60),
  [
    body('amount').notEmpty().isFloat({ min: 10000 }),
    body('bankName').notEmpty().isString(),
    body('bankAccountNumber').notEmpty().isString(),
  ],
  validate,
  walletController.withdraw
);

// ==========================================
// PayOS Integration Routes (Mobile Flow)
// ==========================================

router.post(
  '/topup/payos',
  authenticate,
  rateLimiter('wallet-topup', 10, 60),
  [body('amount').notEmpty().isFloat({ min: 1000 })],
  validate,
  walletController.createPayOSPayment
);

router.post(
  '/topup/payos/confirm',
  authenticate,
  [body('orderCode').notEmpty()],
  validate,
  walletController.confirmPayOSPayment
);

router.get('/topup/payos/success', walletController.payosSuccess);
router.get('/topup/payos/cancel', walletController.payosCancel);
module.exports = router;
