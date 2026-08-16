const walletModel = require('../models/walletModel');
const walletTransactionModel = require('../models/walletTransactionModel');
const notificationModel = require('../models/notificationModel');
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

      await notificationModel.create(
        {
          userId,
          title: 'Nạp tiền vào ví thành công',
          content: `Bạn đã nạp thành công ${amt.toLocaleString('vi-VN')}đ vào tài khoản ví SnapOn.`,
          type: 'WALLET',
        },
        db
      ).catch(() => {});

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
      await pool.query(`
        UPDATE wallet_transactions
        SET status = 'SUCCESS'
        WHERE type = 'ESCROW_HOLD' AND status = 'PENDING'
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
      `SELECT wt.*, 
              wr.status as req_status, 
              COALESCE(wr.bank_name, u.bank_name, (
                SELECT bank_name FROM withdraw_requests WHERE user_id = w.user_id AND bank_name IS NOT NULL ORDER BY created_at DESC LIMIT 1
              )) as bank_name, 
              COALESCE(wr.bank_account_number, u.bank_account_number, (
                SELECT bank_account_number FROM withdraw_requests WHERE user_id = w.user_id AND bank_account_number IS NOT NULL ORDER BY created_at DESC LIMIT 1
              )) as bank_account_number
       FROM wallet_transactions wt
       JOIN wallets w ON wt.wallet_id = w.id
       LEFT JOIN users u ON w.user_id = u.id
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
        if (row.req_status === 'CANCELLED') status = 'CANCELLED';
      }
      return {
        ...row,
        status,
        bank_name: row.bank_name || null,
        bank_account_number: row.bank_account_number || null,
      };
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

        const wRes = await db.query('SELECT user_id FROM wallets WHERE id = $1', [transaction.wallet_id]);
        if (wRes.rows[0]?.user_id) {
          await notificationModel.create(
            {
              userId: wRes.rows[0].user_id,
              title: 'Nạp tiền vào ví thành công',
              content: `Bạn đã nạp thành công ${Number(amount).toLocaleString('vi-VN')}đ qua PayOS vào ví SnapOn.`,
              type: 'WALLET',
            },
            db
          ).catch(() => {});
        }
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

          const wRes = await db.query('SELECT user_id FROM wallets WHERE id = $1', [transaction.wallet_id]);
          if (wRes.rows[0]?.user_id) {
            await notificationModel.create(
              {
                userId: wRes.rows[0].user_id,
                title: 'Nạp tiền vào ví thành công',
                content: `Bạn đã nạp thành công ${amt.toLocaleString('vi-VN')}đ qua PayOS vào ví SnapOn.`,
                type: 'WALLET',
              },
              db
            ).catch(() => {});
          }
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

      await notificationModel.create(
        {
          userId,
          title: 'Nạp tiền vào ví thành công',
          content: `Bạn đã nạp thành công ${amount.toLocaleString('vi-VN')}đ qua PayOS vào ví SnapOn.`,
          type: 'WALLET',
        },
        db
      ).catch(() => {});

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
   * Submit withdrawal request for Admin approval
   */
  async withdraw(userId, amount, bankName, bankAccountNumber) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new CustomError('Số tiền rút không hợp lệ', 400);
    }
    if (amt > 2000000) {
      throw new CustomError('Số tiền rút mỗi lần tối đa là 2.000.000đ.', 400);
    }
    if (!bankName || !bankAccountNumber) {
      throw new CustomError('Vui lòng cung cấp đầy đủ thông tin ngân hàng và số tài khoản.', 400);
    }

    return withDbTx(async (db) => {
      // 0. Strict row lock on users table to enforce serial execution across concurrent requests
      await db.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [userId]);

      const wallet = await walletModel.lockByUserId(userId, db);
      if (!wallet) {
        throw new CustomError('Ví người dùng không tồn tại.', 404);
      }

      const avail = parseFloat(wallet.available_balance);
      if (avail < amt) {
        throw new CustomError(`Số dư khả dụng không đủ để rút. Số dư hiện có: ${avail.toLocaleString('vi-VN')}đ`, 400);
      }

      // 1. Check if user already has an active pending withdrawal request in withdraw_requests
      const pendingCheck = await db.query(
        `SELECT id FROM withdraw_requests
         WHERE user_id = $1 AND status = 'PENDING'
         LIMIT 1`,
        [userId]
      );
      if (pendingCheck.rows.length > 0) {
        throw new CustomError(
          'Bạn đang có 1 yêu cầu rút tiền đang chờ Admin xét duyệt. Vui lòng chờ Admin xử lý xong trước khi tạo yêu cầu mới.',
          400
        );
      }

      // 1b. Strict 30-second anti-duplicate cooldown check on withdraw_requests table
      const recentCheck = await db.query(
        `SELECT id FROM withdraw_requests
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 seconds'
         LIMIT 1`,
        [userId]
      );
      if (recentCheck.rows.length > 0) {
        throw new CustomError(
          'Yêu cầu rút tiền vừa được gửi. Vui lòng chờ ít nhất 30 giây trước khi gửi yêu cầu tiếp theo.',
          400
        );
      }

      // 2. Check daily (24h) withdrawal limit (20,000,000 VND max per 24h)
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

      // Do NOT deduct balance or lock money on request creation.
      // Money will be deducted from balance & available_balance only when Admin approves.

      // Create withdraw_requests record
      const reqRes = await db.query(
        `INSERT INTO withdraw_requests (id, user_id, amount, bank_name, bank_account_number, status)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'PENDING')
         RETURNING *`,
        [userId, amt, bankName.trim(), bankAccountNumber.trim()]
      );
      const withdrawReq = reqRes.rows[0];

      // Save pending transaction with valid UUID reference_id pointing to withdraw_requests.id
      const tx = await walletTransactionModel.create(
        {
          walletId: wallet.id,
          type: 'WITHDRAW',
          amount: amt,
          status: 'PENDING',
          referenceId: withdrawReq.id,
        },
        db
      );

      await db.query(
        `UPDATE users SET bank_name = $2, bank_account_number = $3 WHERE id = $1`,
        [userId, bankName.trim(), bankAccountNumber.trim()]
      ).catch(() => {});

      await notificationModel.create(
        {
          userId,
          title: 'Đã tạo yêu cầu rút tiền',
          content: `Yêu cầu rút ${amt.toLocaleString('vi-VN')}đ về tài khoản ${bankName.trim()} (${bankAccountNumber.trim()}) đã được tạo và đang chờ Admin xét duyệt.`,
          type: 'WALLET',
        },
        db
      ).catch(() => {});

      return {
        transactionId: tx.id,
        withdrawRequestId: withdrawReq.id,
        amount: amt,
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        status: 'PENDING',
        message: `Yêu cầu rút ${amt.toLocaleString('vi-VN')}đ đã được gửi thành công! Admin sẽ kiểm tra và xét duyệt.`,
      };
    });
  },

  /**
   * Update a pending withdrawal request
   */
  async updateWithdrawRequest(userId, withdrawId, { amount, bankName, bankAccountNumber }) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new CustomError('Số tiền rút không hợp lệ', 400);
    }
    if (amt > 2000000) {
      throw new CustomError('Số tiền rút mỗi lần tối đa là 2.000.000đ.', 400);
    }
    if (!bankName || !bankAccountNumber) {
      throw new CustomError('Vui lòng cung cấp đầy đủ thông tin ngân hàng và số tài khoản.', 400);
    }

    return withDbTx(async (db) => {
      const wallet = await walletModel.lockByUserId(userId, db);
      if (!wallet) throw new CustomError('Ví không tồn tại', 404);

      const txRes = await db.query(
        `SELECT wt.*, wr.status as req_status
         FROM wallet_transactions wt
         LEFT JOIN withdraw_requests wr ON wt.reference_id = wr.id
         WHERE (wt.id = $1 OR wt.reference_id = $1) AND wt.wallet_id = $2 AND wt.type = 'WITHDRAW'
         FOR UPDATE`,
        [withdrawId, wallet.id]
      );

      if (txRes.rows.length === 0) {
        throw new CustomError('Không tìm thấy yêu cầu rút tiền', 404);
      }

      const tx = txRes.rows[0];
      const status = tx.req_status || tx.status;

      if (status !== 'PENDING') {
        throw new CustomError('Chỉ có thể chỉnh sửa yêu cầu rút tiền đang ở trạng thái Chờ duyệt.', 400);
      }

      const avail = parseFloat(wallet.available_balance);
      if (avail < amt) {
        throw new CustomError(`Số dư khả dụng không đủ. Số dư hiện có: ${avail.toLocaleString('vi-VN')}đ`, 400);
      }

      if (tx.reference_id) {
        await db.query(
          `UPDATE withdraw_requests
           SET amount = $1, bank_name = $2, bank_account_number = $3, updated_at = NOW()
           WHERE id = $4`,
          [amt, bankName.trim(), bankAccountNumber.trim(), tx.reference_id]
        );
      }

      const updatedTx = await db.query(
        `UPDATE wallet_transactions
         SET amount = $1
         WHERE id = $2
         RETURNING *`,
        [amt, tx.id]
      );

      return {
        ...updatedTx.rows[0],
        bank_name: bankName.trim(),
        bank_account_number: bankAccountNumber.trim(),
        message: 'Cập nhật yêu cầu rút tiền thành công!',
      };
    });
  },

  /**
   * Cancel (Delete) a pending withdrawal request
   */
  async cancelWithdrawRequest(userId, withdrawId) {
    return withDbTx(async (db) => {
      const wallet = await walletModel.lockByUserId(userId, db);
      if (!wallet) throw new CustomError('Ví không tồn tại', 404);

      const txRes = await db.query(
        `SELECT wt.*, wr.status as req_status
         FROM wallet_transactions wt
         LEFT JOIN withdraw_requests wr ON wt.reference_id = wr.id
         WHERE (wt.id = $1 OR wt.reference_id = $1) AND wt.wallet_id = $2 AND wt.type = 'WITHDRAW'
         FOR UPDATE`,
        [withdrawId, wallet.id]
      );

      if (txRes.rows.length === 0) {
        throw new CustomError('Không tìm thấy yêu cầu rút tiền', 404);
      }

      const tx = txRes.rows[0];
      const status = tx.req_status || tx.status;

      if (status !== 'PENDING') {
        throw new CustomError('Chỉ có thể hủy yêu cầu rút tiền đang ở trạng thái Chờ duyệt.', 400);
      }

      if (tx.reference_id) {
        await db.query(
          `UPDATE withdraw_requests SET status = 'CANCELLED' WHERE id = $1`,
          [tx.reference_id]
        );
      }

      await db.query(
        `UPDATE wallet_transactions SET status = 'CANCELLED' WHERE id = $1`,
        [tx.id]
      );

      await notificationModel.create(
        {
          userId,
          title: 'Đã hủy yêu cầu rút tiền',
          content: `Yêu cầu rút ${parseFloat(tx.amount).toLocaleString('vi-VN')}đ đã được hủy thành công.`,
          type: 'WALLET',
        },
        db
      ).catch(() => {});

      return {
        success: true,
        message: 'Đã hủy yêu cầu rút tiền thành công.',
      };
    });
  },
};

module.exports = walletService;
