const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
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

// Withdrawal
router.post(
  '/withdraw',
  authenticate,
  [
    body('amount').notEmpty().isFloat({ min: 10000 }),
    body('bankName').notEmpty().isString(),
    body('bankAccountNumber').notEmpty().isString(),
  ],
  validate,
  walletController.withdraw
);

// Admin: list all withdrawal requests
router.get(
  '/withdraw',
  authenticate,
  authorize('admin'),
  walletController.listWithdrawals
);

// Get single withdrawal request
router.get(
  '/withdraw/:id',
  authenticate,
  walletController.getWithdrawal
);

// Admin: approve withdrawal + trigger PayOS payout
router.post(
  '/withdraw/:id/approve',
  authenticate,
  authorize('admin'),
  walletController.approveWithdrawal
);

// Admin: reject withdrawal + refund wallet
router.post(
  '/withdraw/:id/reject',
  authenticate,
  authorize('admin'),
  walletController.rejectWithdrawal
);

// PayOS payout webhook (no auth — PayOS calls this)
router.post(
  '/payout/webhook',
  walletController.handlePayoutWebhook
);

module.exports = router;
