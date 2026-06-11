const pool = require('../config/db');
const { success, error } = require('../utils/responseHandler');

const authController = {
  async devLogin(req, res) {
    try {
      const { email, name, role } = req.body;

      if (!email) {
        return error(res, 'Email is required.', 400);
      }

      const existing = await pool.query(
        'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified FROM users WHERE email = $1',
        [email]
      );

      if (existing.rows.length > 0) {
        const user = existing.rows[0];
        return success(res, { user, token: user.id }, 'Login successful.');
      }

      const result = await pool.query(
        `INSERT INTO users (email, full_name, role, status, is_verified)
         VALUES ($1, $2, $3, 'active', true)
         RETURNING id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified`,
        [email, name || email.split('@')[0], role || 'hirer']
      );

      const user = result.rows[0];

      await pool.query(
        `INSERT INTO wallets (user_id, balance, available_balance, pending_balance)
         VALUES ($1, 500000, 500000, 0)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );

      return success(res, { user, token: user.id }, 'User created successfully.');
    } catch (err) {
      console.error('Dev login error:', err);
      return error(res, 'Authentication failed.', 500);
    }
  },

  async devRegister(req, res) {
    try {
      const { email, name, password, phone, role } = req.body;

      if (!email || !name || !password) {
        return error(res, 'Email, name, and password are required.', 400);
      }

      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existing.rows.length > 0) {
        return error(res, 'Email already registered.', 409);
      }

      const result = await pool.query(
        `INSERT INTO users (email, full_name, phone, role, status, is_verified)
         VALUES ($1, $2, $3, $4, 'active', true)
         RETURNING id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified`,
        [email, name, phone || null, role || 'worker']
      );

      const user = result.rows[0];

      await pool.query(
        `INSERT INTO wallets (user_id, balance, available_balance, pending_balance)
         VALUES ($1, 500000, 500000, 0)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );

      return success(res, { user, token: user.id }, 'Registration successful.');
    } catch (err) {
      console.error('Dev register error:', err);
      return error(res, 'Registration failed.', 500);
    }
  },
};

module.exports = authController;
