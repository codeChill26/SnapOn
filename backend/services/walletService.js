const walletModel = require('../models/walletModel');
const walletTransactionModel = require('../models/walletTransactionModel');
const withdrawRequestModel = require('../models/withdrawRequestModel');
const escrowModel = require('../models/escrowModel');
const escrowService = require('./escrowService');
const withDbTx = require('../utils/withDbTx');
const payos = require('../config/payos');
const pool = require('../config/db');
const crypto = require('crypto');
const CustomError = require('../utils/CustomError');

function generateNumericOrderCode() {
  const uuid = crypto.randomUUID();
  return parseInt(uuid.replace(/-/g, '').slice(0, 12), 16);
}

/**
 * Wallet Service — Business logic for wallet operations
 */
const walletService = {
  async getOrCreateWallet(userId) {
    return walletModel.createIfNotExists(userId);
  },

  async getWalletSummary(userId) {
    const wallet = await walletModel.createIfNotExists(userId);
    return {
      id: wallet.id,
      user_id: wallet.user_id,
      balance: parseFloat(wallet.balance),
      available_balance: parseFloat(wallet.available_balance),
      pending_balance: parseFloat(wallet.locked_balance),
    };
  },

  /**
   * DEV-ONLY topup: credits available balance and writes a ledger entry.
   */
  async topupMock(userId, amount) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new CustomError('Amount must be a positive number', 400);
    }

    return withDbTx(async (db) => {
      const wallet = await walletModel.lockByUserId(userId, db);

      const updated = await db.query(
        `UPDATE wallets
         SET available_balance = available_balance + $2,
             balance = balance + $2
         WHERE id = $1
         RETURNING *`,
        [wallet.id, amt]
      );

      await walletTransactionModel.create(
        {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount: amt,
          status: 'SUCCESS',
          referenceId: null,
        },
        db
      );

      const w = updated.rows[0];
      return {
        id: w.id,
        user_id: w.user_id,
        balance: parseFloat(w.balance),
        available_balance: parseFloat(w.available_balance),
        pending_balance: parseFloat(w.locked_balance),
      };
    });
  },

  async listTransactions(userId, { page = 1, limit = 20 } = {}) {
    const wallet = await walletModel.createIfNotExists(userId);
    const currentPage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 20, 100));
    const offset = (currentPage - 1) * safeLimit;

    // Auto-sync status between withdraw_requests and wallet_transactions
    try {
      await pool.query(`
        UPDATE wallet_transactions wt
        SET status = CASE
          WHEN wr.status = 'APPROVED' THEN 'SUCCESS'
          WHEN wr.status = 'REJECTED' THEN 'FAILED'
          ELSE wt.status
        END
        FROM withdraw_requests wr
        WHERE wt.reference_id = wr.id
          AND wt.type = 'WITHDRAW'
          AND wt.status = 'PENDING'
          AND wr.status IN ('APPROVED', 'REJECTED')
      `);
    } catch (e) {
      console.error('Error auto-syncing withdraw transactions:', e);
    }

    const countRes = await pool.query(
      'SELECT COUNT(*) as total FROM wallet_transactions WHERE wallet_id = $1',
      [wallet.id]
    );
    const total = parseInt(countRes.rows[0].total);

    const result = await pool.query(
      `SELECT wt.*, wr.status as req_status
       FROM wallet_transactions wt
       LEFT JOIN withdraw_requests wr ON wt.reference_id = wr.id
       WHERE wt.wallet_id = $1
       ORDER BY wt.created_at DESC
       LIMIT $2 OFFSET $3`,
      [wallet.id, safeLimit, offset]
    );

    const rows = result.rows.map(row => {
      let status = row.status;
      if (row.type === 'WITHDRAW' && row.req_status) {
        if (row.req_status === 'REJECTED') status = 'FAILED';
        if (row.req_status === 'APPROVED') status = 'SUCCESS';
      }
      return { ...row, status };
    });

    return {
      transactions: rows,
      pagination: {
        page: currentPage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit)
      }
    };
  },

  /**
   * Verify that a user has sufficient available balance
   * Returns { hasBalance: boolean, availableBalance: number }
   */
  async verifyBalance(userId, requiredAmount) {
    const wallet = await walletModel.findByUserId(userId);

    if (!wallet) {
      return {
        hasBalance: false,
        availableBalance: 0,
        message: 'Wallet not found. Please create a wallet first.',
      };
    }

    const availableBalance = parseFloat(wallet.available_balance);
    const amount = parseFloat(requiredAmount);

    return {
      hasBalance: availableBalance >= amount,
      availableBalance,
      message: availableBalance >= amount
        ? 'Sufficient balance.'
        : `Insufficient balance. Available: ${availableBalance}, Required: ${amount}`,
    };
  },

  /**
   * Web Flow: Create PayOS payment link
   */
  async createPayOSPaymentSession(userId, amount) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new CustomError('Amount must be a positive number', 400);
    }

    const wallet = await walletModel.createIfNotExists(userId);

    let orderCode;
    let txRecord = null;
    let retries = 5;
    while (retries > 0 && !txRecord) {
      orderCode = generateNumericOrderCode();
      try {
        txRecord = await walletTransactionModel.create({
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount: amt,
          status: 'PENDING',
          referenceId: null,
          orderCode,
        });
      } catch (err) {
        if (err.code === '23505' || err.message.includes('unique constraint')) {
          retries--;
          if (retries === 0) throw err;
        } else {
          throw err;
        }
      }
    }

    const description = `Topup SnapOn ${userId.slice(0, 8)}`;
    const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile`;
    const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile`;

    const paymentLinkRes = await payos.paymentRequests.create({
      orderCode,
      amount: amt,
      description: description.slice(0, 25), // PayOS description limit is 25 chars
      cancelUrl,
      returnUrl,
    });

    return {
      checkoutUrl: paymentLinkRes.checkoutUrl,
      orderCode,
      paymentLinkId: paymentLinkRes.paymentLinkId,
    };
  },

  /**
   * Mobile Flow: Create PayOS payment link with direct backend redirect URLs
   */
  async createPayOSPayment(userId, amount) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 1000) {
      throw new CustomError('Amount must be at least 1,000 VND', 400);
    }

    const wallet = await walletModel.createIfNotExists(userId);

    let orderCode;
    let txRecord = null;
    let retries = 5;
    while (retries > 0 && !txRecord) {
      orderCode = generateNumericOrderCode();
      try {
        txRecord = await walletTransactionModel.create({
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount: amt,
          status: 'PENDING',
          orderCode,
        });
      } catch (err) {
        if (err.code === '23505' || err.message.includes('unique constraint')) {
          retries--;
          if (retries === 0) throw err;
        } else {
          throw err;
        }
      }
    }

    const backendBase = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;
    const cancelUrl = `${backendBase}/api/wallet/topup/payos/cancel`;
    const returnUrl = `${backendBase}/api/wallet/topup/payos/success`;

    const paymentData = {
      orderCode,
      amount: amt,
      description: `Topup vi SnapOn`,
      cancelUrl,
      returnUrl,
    };

    try {
      const paymentLinkRes = await payos.paymentRequests.create(paymentData);

      return {
        checkoutUrl: paymentLinkRes.checkoutUrl,
        orderCode,
      };
    } catch (err) {
      console.error('PayOS Create Payment Link error:', err);
      if (txRecord) {
        await pool.query('DELETE FROM wallet_transactions WHERE id = $1', [txRecord.id]).catch(() => {});
      }
      throw new CustomError('Failed to create payment link: ' + err.message, 500);
    }
  },

  /**
   * Web Flow: Webhook processor
   */
  async processPayOSWebhook(webhookBody) {
    let webhookData;
    try {
      webhookData = await payos.webhooks.verify(webhookBody);
    } catch (err) {
      throw new CustomError('Invalid signature', 401);
    }
    const { orderCode, amount, code } = webhookData;

    return withDbTx(async (db) => {
      // ── Escrow-per-job funding branch ──────────────────────────────
      // Nếu orderCode thuộc một escrow → đây là thanh toán job, không phải topup.
      if (code === '00') {
        const escrowResult = await escrowService.fundEscrowByOrderCode(orderCode, db);
        if (escrowResult) {
          if (escrowResult.alreadyProcessed) {
            console.log(`ℹ️  Escrow orderCode ${orderCode} already processed.`);
            return { type: 'escrow', status: 'ALREADY_PROCESSED' };
          }
          if (escrowResult.conflict) {
            console.warn(`⚠️ Escrow funding conflict for orderCode ${orderCode}: ${escrowResult.conflict}`);
            return { type: 'escrow', status: 'CONFLICT', reason: escrowResult.conflict };
          }
          console.log(`✅ Escrow funded via webhook: orderCode ${orderCode}, task ${escrowResult.taskId}`);
          return { type: 'escrow', status: 'FUNDED', taskId: escrowResult.taskId };
        }
      } else {
        const pendingEscrow = await escrowModel.findByOrderCode(orderCode, db);
        if (pendingEscrow) {
          console.log(`❌ Escrow payment failed/cancelled for orderCode ${orderCode} (chờ hết hạn 15').`);
          return { type: 'escrow', status: 'FAILED' };
        }
      }

      // ── Legacy wallet topup branch ─────────────────────────────────
      // Find transaction in DB
      const transaction = await walletTransactionModel.findByOrderCode(orderCode, db);
      if (!transaction) {
        console.warn(`⚠️  Transaction not found for orderCode: ${orderCode}`);
        return null;
      }

      if (transaction.status !== 'PENDING') {
        console.log(`ℹ️  Transaction ${transaction.id} already processed. Status: ${transaction.status}`);
        return null;
      }

      const status = code === '00' ? 'SUCCESS' : 'FAILED';
      await walletTransactionModel.updateStatusById(transaction.id, status, db);

      if (status === 'SUCCESS') {
        // Add funds to wallet
        await db.query(
          `UPDATE wallets
           SET available_balance = available_balance + $2,
               balance = balance + $2
           WHERE id = $1`,
          [transaction.wallet_id, amount]
        );
        console.log(`✅ Credited ${amount} to wallet ${transaction.wallet_id} for transaction ${transaction.id}`);
      } else {
        console.log(`❌ Transaction ${transaction.id} failed in PayOS payload`);
      }

      return { transactionId: transaction.id, status };
    });
  },

  /**
   * Web Flow: Active check status polling
   */
  async checkPayOSPaymentStatus(orderCode) {
    const orderCodeNum = Number(orderCode);
    if (!Number.isFinite(orderCodeNum)) {
      throw new CustomError('Invalid order code', 400);
    }

    return withDbTx(async (db) => {
      // Find transaction in DB
      const transaction = await walletTransactionModel.findByOrderCode(orderCodeNum, db);
      if (!transaction) {
        throw new CustomError(`Transaction not found for order code ${orderCode}`, 404);
      }

      if (transaction.status !== 'PENDING') {
        return { transactionId: transaction.id, status: transaction.status };
      }

      // Query status from PayOS
      const details = await payos.paymentRequests.get(orderCodeNum);
      
      let status = 'PENDING';
      if (details.status === 'PAID') {
        status = 'SUCCESS';
      } else if (details.status === 'CANCELLED' || details.status === 'EXPIRED') {
        status = 'FAILED';
      }

      if (status !== 'PENDING') {
        // Update transaction status
        await walletTransactionModel.updateStatusById(transaction.id, status, db);

        if (status === 'SUCCESS') {
          const amt = Number(transaction.amount);
          // Add funds to wallet
          await db.query(
            `UPDATE wallets
             SET available_balance = available_balance + $2,
                 balance = balance + $2
             WHERE id = $1`,
            [transaction.wallet_id, amt]
          );
          console.log(`✅ [CheckStatus] Credited ${amt} to wallet ${transaction.wallet_id} for transaction ${transaction.id}`);
        }
      }

      return { transactionId: transaction.id, status };
    });
  },

  /**
   * Mobile Flow: Verify and confirm PayOS payment status on mobile app redirect
   */
  async confirmPayOSPayment(userId, orderCode) {
    return withDbTx(async (db) => {
      const wallet = await walletModel.lockByUserId(userId, db);

      // Fixed bug: pass orderCode directly instead of wallet.id as first argument
      const tx = await walletTransactionModel.findByOrderCode(orderCode, db);
      if (!tx) {
        throw new CustomError('Transaction not found', 404);
      }

      if (tx.status !== 'PENDING') {
        return {
          wallet: {
            id: wallet.id,
            user_id: wallet.user_id,
            balance: parseFloat(wallet.balance),
            available_balance: parseFloat(wallet.available_balance),
            pending_balance: parseFloat(wallet.locked_balance),
          },
          tx,
          alreadyProcessed: true,
          success: true,
        };
      }

      let paymentInfo;
      try {
        paymentInfo = await payos.paymentRequests.get(orderCode);
      } catch (err) {
        console.error('PayOS verify link error:', err);
        throw new CustomError('Failed to verify payment with PayOS', 500);
      }

      if (paymentInfo.status !== 'PAID') {
        return {
          success: false,
          status: paymentInfo.status,
          message: 'Thanh toán chưa hoàn tất. Vui lòng hoàn tất thanh toán trên trình duyệt trước khi kiểm tra.',
          wallet: {
            id: wallet.id,
            user_id: wallet.user_id,
            balance: parseFloat(wallet.balance),
            available_balance: parseFloat(wallet.available_balance),
            pending_balance: parseFloat(wallet.locked_balance),
          },
        };
      }

      const amount = parseFloat(tx.amount);
      const updatedWallet = await db.query(
        `UPDATE wallets
         SET available_balance = available_balance + $2,
             balance = balance + $2
         WHERE id = $1
         RETURNING *`,
        [wallet.id, amount]
      );

      const updatedTx = await db.query(
        `UPDATE wallet_transactions
         SET status = 'SUCCESS'
         WHERE id = $1
         RETURNING *`,
        [tx.id]
      );

      const w = updatedWallet.rows[0];
      return {
        wallet: {
          id: w.id,
          user_id: w.user_id,
          balance: parseFloat(w.balance),
          available_balance: parseFloat(w.available_balance),
          pending_balance: parseFloat(w.locked_balance),
        },
        tx: updatedTx.rows[0],
        alreadyProcessed: false,
        success: true,
      };
    });
  },

  /**
   * Create a withdrawal request.
   *
   * Holds the requested amount by moving it from available_balance to
   * locked_balance (so the same funds cannot be spent/withdrawn twice while
   * the request is pending). The money leaves the wallet only when an admin
   * APPROVES/PAYS the request; if REJECTED, the hold is released.
   * The admin portal (WithdrawService.processWithdraw) settles this hold.
   *
   * @param {string} userId
   * @param {number} amount
   * @param {string} bankName
   * @param {string} bankAccountNumber
   */
  async withdraw(userId, amount, bankName, bankAccountNumber) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 10000) {
      throw new CustomError('Số tiền rút tối thiểu là 10.000đ', 400);
    }
    if (amt > 2000000) {
      throw new CustomError('Số tiền rút mỗi lần tối đa là 2.000.000đ.', 400);
    }
    if (!bankName || !String(bankName).trim() || !bankAccountNumber || !String(bankAccountNumber).trim()) {
      throw new CustomError('Vui lòng nhập đầy đủ tên ngân hàng và số tài khoản.', 400);
    }

    return withDbTx(async (db) => {
      // Lock wallet row to prevent concurrent double-withdraw
      const wallet = await walletModel.lockByUserId(userId, db);
      if (!wallet) {
        throw new CustomError('Ví người dùng không tồn tại.', 404);
      }

      const available = parseFloat(wallet.available_balance);
      if (available < amt) {
        throw new CustomError(
          `Số dư khả dụng không đủ. Hiện có: ${available.toLocaleString('vi-VN')}đ, cần: ${amt.toLocaleString('vi-VN')}đ`,
          400
        );
      }

      // 1. Only one pending withdrawal request at a time
      const pendingCheck = await db.query(
        `SELECT id FROM wallet_transactions
         WHERE wallet_id = $1 AND type = 'WITHDRAW' AND status = 'PENDING'
         LIMIT 1`,
        [wallet.id]
      );
      if (pendingCheck.rows.length > 0) {
        throw new CustomError(
          'Bạn đang có 1 yêu cầu rút tiền đang chờ Admin xét duyệt. Vui lòng chờ Admin xử lý xong trước khi tạo yêu cầu mới.',
          400
        );
      }

      // 2. Daily (24h) withdrawal limit — 20,000,000đ max
      const dailyRes = await db.query(
        `SELECT COALESCE(SUM(amount), 0) AS daily_sum
         FROM wallet_transactions
         WHERE wallet_id = $1
           AND type = 'WITHDRAW'
           AND status IN ('PENDING', 'SUCCESS')
           AND created_at >= NOW() - INTERVAL '24 hours'`,
        [wallet.id]
      );
      const dailySum = parseFloat(dailyRes.rows[0].daily_sum || 0);
      if (dailySum + amt > 20000000) {
        const remainingLimit = Math.max(0, 20000000 - dailySum);
        throw new CustomError(
          `Hạn mức rút tiền tối đa trong 24 giờ là 20.000.000đ. Trong 24h qua bạn đã yêu cầu rút ${dailySum.toLocaleString('vi-VN')}đ. Hạn mức còn lại: ${remainingLimit.toLocaleString('vi-VN')}đ.`,
          400
        );
      }

      // Hold funds: available_balance -> locked_balance (balance total unchanged).
      // Admin approval removes it from balance; rejection releases it back.
      await db.query(
        `UPDATE wallets
         SET available_balance = available_balance - $2,
             locked_balance    = locked_balance    + $2
         WHERE id = $1`,
        [wallet.id, amt]
      );

      // Create the withdraw request (PENDING) — admin will process it
      const request = await withdrawRequestModel.create(
        {
          userId,
          amount: amt,
          bankName: String(bankName).trim(),
          bankAccountNumber: String(bankAccountNumber).trim(),
        },
        db
      );

      // Ledger entry: WITHDRAW held (PENDING). Settled to SUCCESS/FAILED by admin.
      const tx = await walletTransactionModel.create(
        {
          walletId: wallet.id,
          type: 'WITHDRAW',
          amount: amt,
          status: 'PENDING',
          referenceId: request.id,
        },
        db
      );

      const updated = await walletModel.findByUserId(userId, db);
      return {
        request,
        transactionId: tx.id,
        withdrawRequestId: request.id,
        amount: amt,
        bankName: String(bankName).trim(),
        bankAccountNumber: String(bankAccountNumber).trim(),
        status: 'PENDING',
        message: `Yêu cầu rút ${amt.toLocaleString('vi-VN')}đ đã được gửi thành công! Admin sẽ kiểm tra và xét duyệt.`,
        wallet: {
          id: updated.id,
          user_id: updated.user_id,
          balance: parseFloat(updated.balance),
          available_balance: parseFloat(updated.available_balance),
          pending_balance: parseFloat(updated.locked_balance),
        },
      };
    });
  },
};

module.exports = walletService;
