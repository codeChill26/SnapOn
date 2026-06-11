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
   * - Creates escrow row (status: holding)
   * - Moves poster wallet available -> pending
   * - Creates a wallet_transaction type=payment status=pending reference_id=escrow.id
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

    // Lock escrow row by task
    const existing = await db.query(
      'SELECT * FROM escrows WHERE task_id = $1 FOR UPDATE',
      [taskId]
    );
    if (existing.rows[0]) {
      const escrow = existing.rows[0];
      // If already holding/released/etc, do not create a new one
      return { escrow, created: false };
    }

    const posterWallet = await walletModel.lockByUserId(posterId, db);

    if (Number(posterWallet.available_balance) < amt) {
      const err = new Error('Insufficient wallet balance to hold escrow.');
      err.statusCode = 400;
      err.code = 'INSUFFICIENT_BALANCE';
      err.availableBalance = Number(posterWallet.available_balance);
      throw err;
    }

    const feeRate = getPlatformFeeRate();

    const escrowInsert = await db.query(
      `INSERT INTO escrows (
         task_id, poster_id, tasker_id,
         amount, platform_fee_amount, insurance_fee_amount,
         status
       )
       VALUES (
         $1, $2, $3,
         $4,
         ROUND($4::numeric * $5::numeric, 2),
         0,
         'holding'
       )
       RETURNING *`,
      [taskId, posterId, taskerId, amt, feeRate]
    );

    const escrow = escrowInsert.rows[0];

    // Move money: available -> pending
    await db.query(
      `UPDATE wallets
       SET available_balance = available_balance - $2,
           locked_balance = locked_balance + $2
       WHERE id = $1`,
      [posterWallet.id, amt]
    );

    // Ledger: payment pending
    await walletTransactionModel.create(
      {
        walletId: posterWallet.id,
        type: 'payment',
        amount: amt,
        status: 'pending',
        referenceId: escrow.id,
      },
      db
    );

    return { escrow, created: true };
  },

  /**
   * RELEASE escrow on task completion.
   * - Poster pending decreases; poster balance decreases
   * - Tasker receives (amount - fee)
   * - Escrow status: released
   * - Poster payment tx -> success
   * - Tasker ledger entries: earning + fee
   */
  async releaseForTask(taskId, db) {
    if (!db) throw new Error('releaseForTask requires a db client');

    const escrows = await db.query(
      'SELECT * FROM escrows WHERE task_id = $1 FOR UPDATE',
      [taskId]
    );
    const escrow = escrows.rows[0];
    if (!escrow) return null;

    if (escrow.status !== 'holding') return escrow;

    const amount = Number(escrow.amount);
    const fee = Number(escrow.platform_fee_amount || 0);
    const net = Math.max(0, amount - fee);

    const posterWallet = await walletModel.lockByUserId(escrow.poster_id, db);
    const taskerWallet = await walletModel.lockByUserId(escrow.tasker_id, db);

    // Poster: pending -> out (balance decreases)
    await db.query(
      `UPDATE wallets
       SET locked_balance = locked_balance - $2,
           balance = balance - $2
       WHERE id = $1`,
      [posterWallet.id, amount]
    );

    // Tasker: receive net
    await db.query(
      `UPDATE wallets
       SET available_balance = available_balance + $2,
           balance = balance + $2
       WHERE id = $1`,
      [taskerWallet.id, net]
    );

    // Update escrow
    const updatedEscrow = await db.query(
      `UPDATE escrows
       SET status = 'released'
       WHERE id = $1
       RETURNING *`,
      [escrow.id]
    );

    // Poster payment tx: pending -> success
    const posterPaymentTx = await walletTransactionModel.findByReference(
      posterWallet.id,
      escrow.id,
      'payment',
      db
    );
    if (posterPaymentTx && posterPaymentTx.status === 'pending') {
      await walletTransactionModel.updateStatusById(posterPaymentTx.id, 'success', db);
    }

    // Tasker ledger
    if (net > 0) {
      await walletTransactionModel.create(
        {
          walletId: taskerWallet.id,
          type: 'earning',
          amount: net,
          status: 'success',
          referenceId: escrow.id,
        },
        db
      );
    }

    if (fee > 0) {
      await walletTransactionModel.create(
        {
          walletId: taskerWallet.id,
          type: 'fee',
          amount: fee,
          status: 'success',
          referenceId: escrow.id,
        },
        db
      );
    }

    return updatedEscrow.rows[0];
  },

  /**
   * REFUND escrow on task cancellation.
   * - Poster pending -> available
   * - Escrow status: refunded
   * - Poster payment tx -> cancelled
   * - Create refund tx
   */
  async refundForTask(taskId, db) {
    if (!db) throw new Error('refundForTask requires a db client');

    const escrows = await db.query(
      'SELECT * FROM escrows WHERE task_id = $1 FOR UPDATE',
      [taskId]
    );
    const escrow = escrows.rows[0];
    if (!escrow) return null;

    if (escrow.status !== 'holding') return escrow;

    const amount = Number(escrow.amount);
    const posterWallet = await walletModel.lockByUserId(escrow.poster_id, db);

    await db.query(
      `UPDATE wallets
       SET locked_balance = locked_balance - $2,
           available_balance = available_balance + $2
       WHERE id = $1`,
      [posterWallet.id, amount]
    );

    const updatedEscrow = await db.query(
      `UPDATE escrows
       SET status = 'refunded'
       WHERE id = $1
       RETURNING *`,
      [escrow.id]
    );

    const posterPaymentTx = await walletTransactionModel.findByReference(
      posterWallet.id,
      escrow.id,
      'payment',
      db
    );
    if (posterPaymentTx && posterPaymentTx.status === 'pending') {
      await walletTransactionModel.updateStatusById(posterPaymentTx.id, 'cancelled', db);
    }

    await walletTransactionModel.create(
      {
        walletId: posterWallet.id,
        type: 'refund',
        amount,
        status: 'success',
        referenceId: escrow.id,
      },
      db
    );

    return updatedEscrow.rows[0];
  },
};

module.exports = escrowService;
