const pool = require('../config/db');

/**
 * WalletTransaction Model — DB queries for wallet_transactions
 */
const walletTransactionModel = {
  async create({ walletId, type, amount, status = 'PENDING', referenceId = null, orderCode = null }, db = pool) {
    const result = await db.query(
      `INSERT INTO wallet_transactions (id, wallet_id, type, amount, status, reference_id, order_code)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [walletId, type, amount, status, referenceId, orderCode]
    );
    return result.rows[0] || null;
  },

  async updateStatusById(id, status, db = pool) {
    const result = await db.query(
      'UPDATE wallet_transactions SET status = $2 WHERE id = $1 RETURNING *',
      [id, status]
    );
    return result.rows[0] || null;
  },

  async findByOrderCode(orderCode, db = pool) {
    const result = await db.query(
      'SELECT * FROM wallet_transactions WHERE order_code = $1 LIMIT 1',
      [orderCode]
    );
    return result.rows[0] || null;
  },

  async findByReference(walletId, referenceId, type, db = pool) {
    const result = await db.query(
      `SELECT * FROM wallet_transactions
       WHERE wallet_id = $1 AND reference_id = $2 AND type = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [walletId, referenceId, type]
    );
    return result.rows[0] || null;
  },

  async listByWalletId(walletId, { limit = 20, cursor } = {}, db = pool) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));

    // Cursor is transaction id (uuid) for simplicity
    if (cursor) {
      const result = await db.query(
        `SELECT * FROM wallet_transactions
         WHERE wallet_id = $1
           AND created_at < (SELECT created_at FROM wallet_transactions WHERE id = $2)
         ORDER BY created_at DESC
         LIMIT $3`,
        [walletId, cursor, safeLimit]
      );
      return result.rows;
    }

    const result = await db.query(
      `SELECT * FROM wallet_transactions
       WHERE wallet_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [walletId, safeLimit]
    );
    return result.rows;
  },
};

module.exports = walletTransactionModel;
