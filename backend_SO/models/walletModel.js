const pool = require('../config/db');

/**
 * Wallet Model — Database queries for wallets table
 */
const walletModel = {
  /**
   * Find wallet by user ID
   */
  async findByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  },

  /**
   * Check if user has sufficient available balance
   */
  async checkBalance(userId, amount) {
    const result = await pool.query(
      'SELECT available_balance FROM wallets WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length === 0) return false;
    return parseFloat(result.rows[0].available_balance) >= parseFloat(amount);
  },

  /**
   * Create wallet for user (if not exists)
   */
  async createIfNotExists(userId) {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;

    const result = await pool.query(
      `INSERT INTO wallets (user_id, balance, available_balance, pending_balance)
       VALUES ($1, 0, 0, 0)
       RETURNING *`,
      [userId]
    );
    return result.rows[0];
  },
};

module.exports = walletModel;
