const walletModel = require('../models/walletModel');
const walletTransactionModel = require('../models/walletTransactionModel');
const CustomError = require('../utils/CustomError');

function getPlatformFeeRate() {
  const raw = process.env.PLATFORM_FEE_RATE;
  if (raw == null || raw === '') return 0.1; // default 10%
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return 0.1;
  return n;
}

const escrowService = {
  /**
   * HOLD funds when a match is confirmed.
   * - Creates or re-activates escrow row (status: HOLDING) for the specific task and tasker.
   * - Moves poster wallet available_balance → locked_balance
   * - Creates a wallet_transaction type=ESCROW_HOLD status=PENDING
   *
   * Must run inside an existing transaction (db client).
   */
  async holdForMatch({ taskId, posterId, taskerId, amount }, db) {
    if (!db) throw new Error('holdForMatch requires a db client');

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new CustomError('Invalid escrow amount', 400, 'BAD_REQUEST');
    }

    const feeRate = getPlatformFeeRate();

    // Lock existing escrow for this specific task and tasker
    const existing = await db.query(
      'SELECT * FROM escrows WHERE task_id = $1 AND tasker_id = $2 FOR UPDATE',
      [taskId, taskerId]
    );

    let escrow;

    if (existing.rows[0]) {
      const prev = existing.rows[0];

      if (prev.status === 'HOLDING') {
        // Already locked — idempotent, no double-deduct
        return { escrow: prev, created: false };
      }

      if (prev.status === 'RELEASED') {
        throw new CustomError('Giao dịch ký quỹ của bạn với người làm này đã hoàn thành và thanh toán.', 400, 'LIMIT_EXCEEDED');
      }

      // status === 'REFUNDED': re-activate for tasker
      const updated = await db.query(
        `UPDATE escrows
         SET amount = $2,
             platform_fee_amount = ROUND($2::numeric * $3::numeric, 2),
             status = 'HOLDING'
         WHERE id = $1
         RETURNING *`,
        [prev.id, amt, feeRate]
      );
      escrow = updated.rows[0];
    } else {
      const inserted = await db.query(
        `INSERT INTO escrows (
           id, task_id, poster_id, tasker_id,
           amount, platform_fee_amount, insurance_fee_amount,
           status
         )
         VALUES (
           gen_random_uuid(), $1, $2, $3,
           $4,
           ROUND($4::numeric * $5::numeric, 2),
           0,
           'HOLDING'
         )
         RETURNING *`,
        [taskId, posterId, taskerId, amt, feeRate]
      );
      escrow = inserted.rows[0];
    }

    // Lock poster wallet (create if missing)
    const posterWallet = await walletModel.lockByUserId(posterId, db);

    const availBal = parseFloat(posterWallet.available_balance);
    if (availBal < amt) {
      throw new CustomError(
        `Số dư khả dụng không đủ. Hiện có: ${availBal.toLocaleString('vi-VN')}đ, cần: ${amt.toLocaleString('vi-VN')}đ`,
        400,
        'INSUFFICIENT_BALANCE'
      );
    }

    // Move available_balance → locked_balance (balance total unchanged)
    await db.query(
      `UPDATE wallets
       SET available_balance = available_balance - $2,
           locked_balance    = locked_balance    + $2
       WHERE id = $1`,
      [posterWallet.id, amt]
    );

    // Ledger entry: poster ESCROW_HOLD
    await walletTransactionModel.create(
      {
        walletId: posterWallet.id,
        type: 'ESCROW_HOLD',
        amount: amt,
        status: 'PENDING',
        referenceId: escrow.id,
      },
      db
    );

    return { escrow, created: true };
  },

  /**
   * RELEASE escrow on task completion (for all escrows holding for this task).
   * Must run inside an existing transaction (db client).
   */
  async releaseForTask(taskId, db) {
    if (!db) throw new Error('releaseForTask requires a db client');

    const escrows = await db.query(
      "SELECT * FROM escrows WHERE task_id = $1 AND status = 'HOLDING' FOR UPDATE",
      [taskId]
    );
    
    for (const escrow of escrows.rows) {
      await this.releaseEscrowRecord(escrow, db);
    }
  },

  /**
   * RELEASE escrow for a specific tasker/worker.
   */
  async releaseForTasker(taskId, taskerId, db) {
    if (!db) throw new Error('releaseForTasker requires a db client');

    const escrows = await db.query(
      "SELECT * FROM escrows WHERE task_id = $1 AND tasker_id = $2 AND status = 'HOLDING' FOR UPDATE",
      [taskId, taskerId]
    );
    
    if (escrows.rows[0]) {
      await this.releaseEscrowRecord(escrows.rows[0], db);
    }
  },

  /**
   * Helper function to release a single escrow record.
   */
  async releaseEscrowRecord(escrow, db) {
    const amount = parseFloat(escrow.amount);
    const platformFee = parseFloat(escrow.platform_fee_amount);
    const taskerEarning = amount - platformFee;

    // Update escrow status
    await db.query(
      `UPDATE escrows SET status = 'RELEASED' WHERE id = $1`,
      [escrow.id]
    );

    // Lock poster wallet and settle: locked_balance -= amount, balance -= amount
    const posterWallet = await walletModel.lockByUserId(escrow.poster_id, db);
    const lockedBalance = parseFloat(posterWallet.locked_balance);
    if (lockedBalance < amount) {
      throw new Error(`Insufficient locked balance to release escrow. Wallet locked balance: ${lockedBalance}, required: ${amount}`);
    }
    await db.query(
      `UPDATE wallets
       SET locked_balance = locked_balance - $2,
           balance        = balance        - $2
       WHERE id = $1`,
      [posterWallet.id, amount]
    );

    // Ledger: poster payment completed
    await walletTransactionModel.create(
      {
        walletId: posterWallet.id,
        type: 'ESCROW_RELEASE',
        amount: amount,
        status: 'SUCCESS',
        referenceId: escrow.id,
      },
      db
    );

    // Lock tasker wallet and credit earnings
    if (taskerEarning > 0) {
      const taskerWallet = await walletModel.lockByUserId(escrow.tasker_id, db);
      await db.query(
        `UPDATE wallets
         SET available_balance = available_balance + $2,
             balance           = balance           + $2
         WHERE id = $1`,
        [taskerWallet.id, taskerEarning]
      );

      // Ledger: tasker earning
      await walletTransactionModel.create(
        {
          walletId: taskerWallet.id,
          type: 'ESCROW_RELEASE',
          amount: taskerEarning,
          status: 'SUCCESS',
          referenceId: escrow.id,
        },
        db
      );
    }
  },

  /**
   * REFUND escrow on task cancellation or worker decline (for all escrows holding for this task).
   * Must run inside an existing transaction (db client).
   */
  async refundForTask(taskId, db) {
    if (!db) throw new Error('refundForTask requires a db client');

    const escrows = await db.query(
      "SELECT * FROM escrows WHERE task_id = $1 AND status = 'HOLDING' FOR UPDATE",
      [taskId]
    );
    
    for (const escrow of escrows.rows) {
      await this.refundEscrowRecord(escrow, db);
    }
  },

  /**
   * REFUND escrow for a specific tasker/worker.
   */
  async refundForTasker(taskId, taskerId, db) {
    if (!db) throw new Error('refundForTasker requires a db client');

    const escrows = await db.query(
      "SELECT * FROM escrows WHERE task_id = $1 AND tasker_id = $2 AND status = 'HOLDING' FOR UPDATE",
      [taskId, taskerId]
    );
    
    if (escrows.rows[0]) {
      await this.refundEscrowRecord(escrows.rows[0], db);
    }
  },

  /**
   * Helper function to refund a single escrow record.
   */
  async refundEscrowRecord(escrow, db) {
    const amount = parseFloat(escrow.amount);

    // Update escrow status
    await db.query(
      `UPDATE escrows SET status = 'REFUNDED' WHERE id = $1`,
      [escrow.id]
    );

    // Lock poster wallet and move locked → available
    const posterWallet = await walletModel.lockByUserId(escrow.poster_id, db);
    const lockedBalance = parseFloat(posterWallet.locked_balance);
    if (lockedBalance < amount) {
      throw new Error(`Insufficient locked balance to refund escrow. Wallet locked balance: ${lockedBalance}, required: ${amount}`);
    }
    await db.query(
      `UPDATE wallets
       SET locked_balance    = locked_balance    - $2,
           available_balance = available_balance + $2
       WHERE id = $1`,
      [posterWallet.id, amount]
    );

    // Ledger: poster refund
    await walletTransactionModel.create(
      {
        walletId: posterWallet.id,
        type: 'REFUND',
        amount: amount,
        status: 'SUCCESS',
        referenceId: escrow.id,
      },
      db
    );
  },
};

module.exports = escrowService;
