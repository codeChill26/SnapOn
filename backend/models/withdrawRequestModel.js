const pool = require('../config/db');

/**
 * WithdrawRequest Model — DB queries for withdraw_requests
 */
const withdrawRequestModel = {
  /**
   * Create a withdraw request (default status PENDING).
   */
  async create({ userId, amount, bankName, bankAccountNumber, status = 'PENDING' }, db = pool) {
    const result = await db.query(
      `INSERT INTO withdraw_requests (id, user_id, amount, bank_name, bank_account_number, status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, amount, bankName, bankAccountNumber, status]
    );
    return result.rows[0] || null;
  },

  async findById(id, db = pool) {
    const result = await db.query(
      'SELECT * FROM withdraw_requests WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Sum of amounts already held in PENDING withdraw requests for a user.
   * Used as a safety cross-check.
   */
  async sumPendingByUser(userId, db = pool) {
    const result = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM withdraw_requests
       WHERE user_id = $1 AND status = 'PENDING'`,
      [userId]
    );
    return parseFloat(result.rows[0].total);
  },
};

module.exports = withdrawRequestModel;
