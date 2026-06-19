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

    const feeRate = getPlatformFeeRate();

    const escrowInsert = await db.query(
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

    const escrow = escrowInsert.rows[0];
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

    if (escrow.status !== 'HOLDING') return escrow;

    // Update escrow
    const updatedEscrow = await db.query(
      `UPDATE escrows
       SET status = 'RELEASED'
       WHERE id = $1
       RETURNING *`,
      [escrow.id]
    );

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

    if (escrow.status !== 'HOLDING') return escrow;

    const updatedEscrow = await db.query(
      `UPDATE escrows
       SET status = 'REFUNDED'
       WHERE id = $1
       RETURNING *`,
      [escrow.id]
    );

    return updatedEscrow.rows[0];
  },
};

module.exports = escrowService;
