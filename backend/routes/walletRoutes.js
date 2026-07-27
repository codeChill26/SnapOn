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
    query('page').optional().isInt({ min: 1 }),
  ],
  validate,
  walletController.getMyTransactions
);

// ==========================================
// ESCROW-PER-JOB MODEL: nạp tiền vào ví đã bị GỠ BỎ.
// Poster thanh toán trực tiếp từng job qua PayOS (xem escrowRoutes).
// Ví giờ chỉ là SỔ THU NHẬP của tasker: nhận tiền công → rút về ngân hàng.
// ==========================================

// PayOS webhook — GIỮ NGUYÊN PATH (PayOS dashboard đã trỏ vào đây).
// Giờ xử lý cả thanh toán escrow per-job (và topup legacy nếu còn).
router.post(
  '/topup/payos/webhook',
  walletController.handlePayOSWebhook
);

// Trang redirect sau thanh toán (legacy path — vẫn dùng được)
router.get('/topup/payos/success', walletController.payosSuccess);
router.get('/topup/payos/cancel', walletController.payosCancel);

// Withdrawal — tasker rút tiền công về tài khoản ngân hàng
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

module.exports = router;
