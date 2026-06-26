const walletModel = require('../models/walletModel');
const walletTransactionModel = require('../models/walletTransactionModel');

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
   * - Creates or re-activates escrow row (status: HOLDING)
   * - Moves poster wallet available_balance → locked_balance
   * - Creates a wallet_transaction type=ESCROW_HOLD status=PENDING
   *
   * Must run inside an existing transaction (db client).
   */
  async holdForMatch({ taskId, posterId, taskerId, amount }, db) {
    if (!db) throw new Error('holdForMatch requires a db client');

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      const err = new Error('Invalid escrow amount');
      err.statusCode = 400;
      throw err;
    }

    const feeRate = getPlatformFeeRate();

    // Lock existing escrow if any
    const existing = await db.query(
      'SELECT * FROM escrows WHERE task_id = $1 FOR UPDATE',
      [taskId]
    );

    let escrow;

    if (existing.rows[0]) {
      const prev = existing.rows[0];

      if (prev.status === 'HOLDING') {
        // Already locked — idempotent, no double-deduct
        return { escrow: prev, created: false };
      }

      if (prev.status === 'RELEASED') {
        const err = new Error('Công việc này đã được hoàn thành và thanh toán.');
        err.statusCode = 400;
        throw err;
      }

      // status === 'REFUNDED': re-activate for new worker
      const updated = await db.query(
        `UPDATE escrows
         SET tasker_id = $2, amount = $3,
             platform_fee_amount = ROUND($3::numeric * $4::numeric, 2),
             status = 'HOLDING'
         WHERE id = $1
         RETURNING *`,
        [prev.id, taskerId, amt, feeRate]
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
      const err = new Error(
        `Số dư khả dụng không đủ. Hiện có: ${availBal.toLocaleString('vi-VN')}đ, cần: ${amt.toLocaleString('vi-VN')}đ`
      );
      err.statusCode = 400;
      throw err;
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
   * RELEASE escrow on task completion.
   * - Deducts from poster locked_balance + balance (net payment settled)
   * - Credits tasker (amount - platform_fee) into available_balance + balance
   * - Creates ledger entries for both parties
   * - Escrow status → RELEASED
   *
   * Must run inside an existing transaction (db client).
   */
  async releaseForTask(taskId, db) {
    if (!db) throw new Error('releaseForTask requires a db client');

    const escrows = await db.query(
      'SELECT * FROM escrows WHERE task_id = $1 FOR UPDATE',
      [taskId]
    );
    const escrow = escrows.rows[0];
    if (!escrow) return null;
    if (escrow.status !== 'HOLDING') return escrow;

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

    const released = await db.query('SELECT * FROM escrows WHERE id = $1', [escrow.id]);
    return released.rows[0];
  },

  /**
   * REFUND escrow on task cancellation or worker decline.
   * - Moves poster locked_balance → available_balance (no net loss)
   * - Creates REFUND ledger entry
   * - Escrow status → REFUNDED
   *
   * Must run inside an existing transaction (db client).
   */
  async refundForTask(taskId, db) {
    if (!db) throw new Error('refundForTask requires a db client');

    const escrows = await db.query(
      'SELECT * FROM escrows WHERE task_id = $1 FOR UPDATE',
      [taskId]
    );
    const escrow = escrows.rows[0];
    if (!escrow) return null;
    if (escrow.status !== 'HOLDING') return escrow;

    const amount = parseFloat(escrow.amount);

    // Update escrow status
    await db.query(
      `UPDATE escrows SET status = 'REFUNDED' WHERE id = $1`,
      [escrow.id]
    );

    // Lock poster wallet and move locked → available
    const posterWallet = await walletModel.lockByUserId(escrow.poster_id, db);
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

    const refunded = await db.query('SELECT * FROM escrows WHERE id = $1', [escrow.id]);
    return refunded.rows[0];
  },
};

module.exports = escrowService;
