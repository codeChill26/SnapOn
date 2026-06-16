const walletModel = require('../models/walletModel');
const walletTransactionModel = require('../models/walletTransactionModel');
const withDbTx = require('../utils/withDbTx');
const payos = require('../config/payos');
const { getBin } = require('../utils/bankBins');
const pool = require('../config/db');

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
      const err = new Error('Amount must be a positive number');
      err.statusCode = 400;
      throw err;
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

  async listTransactions(userId, { limit, cursor } = {}) {
    const wallet = await walletModel.createIfNotExists(userId);
    const rows = await walletTransactionModel.listByWalletId(wallet.id, { limit, cursor });
    return rows;
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

  async createPayOSPaymentSession(userId, amount) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      const err = new Error('Amount must be a positive number');
      err.statusCode = 400;
      throw err;
    }

    const wallet = await walletModel.createIfNotExists(userId);

    // Order Code must be unique number (up to 9007199254740991)
    // Timestamp (13 digits) + 3 random digits is safe and fits in Postgres BIGINT
    const orderCode = Number(String(Date.now()) + String(Math.floor(100 + Math.random() * 900)));

    // Create pending transaction in DB
    await walletTransactionModel.create({
      walletId: wallet.id,
      type: 'DEPOSIT',
      amount: amt,
      status: 'PENDING',
      referenceId: null,
      orderCode,
    });

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

  async processPayOSWebhook(webhookBody) {
    const webhookData = payos.webhooks.verify(webhookBody);
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

  async checkPayOSPaymentStatus(orderCode) {
    const orderCodeNum = Number(orderCode);
    if (!Number.isFinite(orderCodeNum)) {
      const err = new Error('Invalid order code');
      err.statusCode = 400;
      throw err;
    }

    return withDbTx(async (db) => {
      // Find transaction in DB
      const transaction = await walletTransactionModel.findByOrderCode(orderCodeNum, db);
      if (!transaction) {
        const err = new Error(`Transaction not found for order code ${orderCode}`);
        err.statusCode = 404;
        throw err;
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

  async withdraw(userId, amount, bankName, bankAccountNumber) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      const err = new Error('Amount must be a positive number');
      err.statusCode = 400;
      throw err;
    }

    return withDbTx(async (db) => {
      const wallet = await walletModel.lockByUserId(userId, db);

      const availBalance = parseFloat(wallet.available_balance);
      if (availBalance < amt) {
        const err = new Error('Insufficient balance');
        err.statusCode = 400;
        throw err;
      }

      const updated = await db.query(
        `UPDATE wallets
         SET available_balance = available_balance - $2,
             balance = balance - $2
         WHERE id = $1
         RETURNING *`,
        [wallet.id, amt]    
      );

      await walletTransactionModel.create(
        {
          walletId: wallet.id,
          type: 'WITHDRAW',
          amount: amt,
          status: 'PENDING',
          referenceId: null,
        },
        db
      );

      await db.query(
        `INSERT INTO withdraw_requests (id, user_id, amount, bank_name, bank_account_number, status)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'PENDING')`,
        [userId, amt, bankName, bankAccountNumber]
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

  async listWithdrawals({ limit = 20, offset = 0, status } = {}) {
    let query = `SELECT wr.*, u.full_name, u.email
                 FROM withdraw_requests wr
                 JOIN users u ON wr.user_id = u.id`;
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push(`wr.status = $${params.length + 1}`);
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY wr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.map(r => ({
      ...r,
      amount: parseFloat(r.amount),
    }));
  },

  async getWithdrawal(id) {
    const result = await pool.query(
      `SELECT wr.*, u.full_name, u.email
       FROM withdraw_requests wr
       JOIN users u ON wr.user_id = u.id
       WHERE wr.id = $1`,
      [id]
    );
    const row = result.rows[0] || null;
    if (row) row.amount = parseFloat(row.amount);
    return row;
  },

  async approveWithdrawal(withdrawalId, adminId) {
    const withdrawal = await this.getWithdrawal(withdrawalId);
    if (!withdrawal) {
      const err = new Error('Withdrawal request not found');
      err.statusCode = 404;
      throw err;
    }

    if (withdrawal.status !== 'PENDING') {
      const err = new Error(`Cannot approve withdrawal with status: ${withdrawal.status}`);
      err.statusCode = 400;
      throw err;
    }

    const bin = getBin(withdrawal.bank_name);
    if (!bin) {
      const err = new Error(`Unknown bank: ${withdrawal.bank_name}. Cannot determine bank BIN code.`);
      err.statusCode = 400;
      throw err;
    }

    const payoutData = {
      referenceId: withdrawalId,
      amount: Math.round(Number(withdrawal.amount)),
      description: `SnapOn withdrawal ${withdrawalId.slice(0, 8)}`,
      toBin: bin,
      toAccountNumber: withdrawal.bank_account_number,
    };

    let payoutResult;
    try {
      payoutResult = await payos.payouts.create(payoutData);
      console.log(`✅ PayOS payout created: ${payoutResult.id}`);
    } catch (err) {
      console.error(`❌ PayOS payout failed:`, err.message);
      await pool.query(
        `UPDATE withdraw_requests SET status = 'FAILED' WHERE id = $1`,
        [withdrawalId]
      );
      const error = new Error(`PayOS payout failed: ${err.message}`);
      error.statusCode = 502;
      throw error;
    }

    const txState = payoutResult.transactions?.[0]?.state;
    const approvalState = payoutResult.approvalState;

    if (approvalState === 'COMPLETED' && txState === 'SUCCEEDED') {
      await pool.query(
        `UPDATE withdraw_requests SET status = 'PAID' WHERE id = $1`,
        [withdrawalId]
      );
      return { ...withdrawal, status: 'PAID', payoutId: payoutResult.id };
    }

    if (approvalState === 'FAILED' || txState === 'FAILED') {
      await this._refundWithdrawal(withdrawalId, withdrawal.user_id, Number(withdrawal.amount));
      return { ...withdrawal, status: 'FAILED', payoutId: payoutResult.id };
    }

    await pool.query(
      `UPDATE withdraw_requests SET status = 'PROCESSING' WHERE id = $1`,
      [withdrawalId]
    );
    return { ...withdrawal, status: 'PROCESSING', payoutId: payoutResult.id };
  },

  async rejectWithdrawal(withdrawalId, adminId) {
    const withdrawal = await this.getWithdrawal(withdrawalId);
    if (!withdrawal) {
      const err = new Error('Withdrawal request not found');
      err.statusCode = 404;
      throw err;
    }

    if (withdrawal.status !== 'PENDING') {
      const err = new Error(`Cannot reject withdrawal with status: ${withdrawal.status}`);
      err.statusCode = 400;
      throw err;
    }

    await this._refundWithdrawal(withdrawalId, withdrawal.user_id, Number(withdrawal.amount));
    return { ...withdrawal, status: 'REJECTED' };
  },

  async _refundWithdrawal(withdrawalId, userId, amount) {
    return withDbTx(async (db) => {
      await db.query(
        `UPDATE withdraw_requests SET status = 'REJECTED' WHERE id = $1`,
        [withdrawalId]
      );

      const wallet = await walletModel.lockByUserId(userId, db);
      await db.query(
        `UPDATE wallets
         SET available_balance = available_balance + $2,
             balance = balance + $2
         WHERE id = $1`,
        [wallet.id, amount]
      );

      await walletTransactionModel.create(
        {
          walletId: wallet.id,
          type: 'REFUND',
          amount,
          status: 'SUCCESS',
          referenceId: withdrawalId,
        },
        db
      );
    });
  },

  async processPayoutWebhook(webhookData) {
    const data = payos.webhooks.verify(webhookData);
    const payoutId = data.id;
    const referenceId = data.referenceId;
    const txState = data.transactions?.[0]?.state;
    const approvalState = data.approvalState;

    if (!referenceId) {
      console.warn('⚠️  Payout webhook missing referenceId');
      return null;
    }

    if (approvalState === 'COMPLETED' && txState === 'SUCCEEDED') {
      await pool.query(
        `UPDATE withdraw_requests SET status = 'PAID' WHERE id = $1 AND status = 'PROCESSING'`,
        [referenceId]
      );
      console.log(`✅ Withdrawal ${referenceId} marked as PAID via webhook`);
    } else if (approvalState === 'FAILED' || txState === 'FAILED') {
      const withdrawal = await this.getWithdrawal(referenceId);
      if (withdrawal && (withdrawal.status === 'PROCESSING' || withdrawal.status === 'PENDING')) {
        await this._refundWithdrawal(referenceId, withdrawal.user_id, Number(withdrawal.amount));
        console.log(`✅ Withdrawal ${referenceId} refunded due to payout failure`);
      }
    }

    return { payoutId, referenceId, approvalState };
  },
};

module.exports = walletService;
