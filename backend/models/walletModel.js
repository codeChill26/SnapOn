const pool = require('../config/db');

/**
 * Wallet Model — Database queries for wallets table
 */
const walletModel = {
  /**
   * Find wallet by user ID
   */
  async findByUserId(userId, db = pool) {
    const result = await db.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  },

  /**
   * Lock wallet row for update inside a transaction.
   * Creates wallet if missing.
   */
  async lockByUserId(userId, db) {
    if (!db) throw new Error('lockByUserId requires a db client');

    const result = await db.query(
      'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    if (result.rows[0]) return result.rows[0];

    const created = await db.query(
      `INSERT INTO wallets (user_id, balance, available_balance, locked_balance)
       VALUES ($1, 0, 0, 0)
       RETURNING *`,
      [userId]
    );
    return created.rows[0];
  },

  /**
   * Check if user has sufficient available balance
   */
  async checkBalance(userId, amount, db = pool) {
    const result = await db.query(
      'SELECT available_balance FROM wallets WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length === 0) return false;
    return parseFloat(result.rows[0].available_balance) >= parseFloat(amount);
  },

  /**
   * Create wallet for user (if not exists)
   */
  async createIfNotExists(userId, db = pool) {
    const existing = await this.findByUserId(userId, db);
    if (existing) return existing;

    const result = await db.query(
      `INSERT INTO wallets (user_id, balance, available_balance, locked_balance)
       VALUES ($1, 0, 0, 0)
       RETURNING *`,
      [userId]
    );
    return result.rows[0];
  },
};

module.exports = walletModel;
