const walletModel = require('../models/walletModel');
const walletTransactionModel = require('../models/walletTransactionModel');
const withDbTx = require('../utils/withDbTx');
const payos = require('../config/payos');

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
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'pending')`,
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
};

module.exports = walletService;
