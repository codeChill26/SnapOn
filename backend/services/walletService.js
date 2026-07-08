const walletModel = require('../models/walletModel');
const walletTransactionModel = require('../models/walletTransactionModel');
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

    const countRes = await pool.query(
      'SELECT COUNT(*) as total FROM wallet_transactions WHERE wallet_id = $1',
      [wallet.id]
    );
    const total = parseInt(countRes.rows[0].total);

    const result = await pool.query(
      `SELECT * FROM wallet_transactions
       WHERE wallet_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [wallet.id, safeLimit, offset]
    );

    return {
      transactions: result.rows,
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
};

module.exports = walletService;
