const pool = require('../config/db');

/**
 * User Model — Database queries for users table
 */
const userModel = {
  /**
   * Find user by Firebase UID
   */
  async findByFirebaseUid(firebaseUid) {
    const result = await pool.query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    return result.rows[0] || null;
  },

  /**
   * Find user by UUID
   */
  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Create a new user
   */
  async create({ firebaseUid, fullName, email, phone, avatarUrl, status = 'ACTIVE' }) {
    const fallbackName = fullName || (email ? email.split('@')[0] : 'User');
    const result = await pool.query(
      `INSERT INTO users (id, firebase_uid, full_name, email, phone, avatar_url, status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [firebaseUid, fallbackName, email, phone, avatarUrl, status]
    );
    return result.rows[0];
  },

  /**
   * Update user info
   */
  async update(id, fields) {
    const ALLOWED_COLUMNS = ['firebase_uid', 'full_name', 'email', 'phone', 'avatar_url', 'role', 'status', 'is_verified'];
    const keys = Object.keys(fields);
    
    // Check if any keys are not allowed
    for (const key of keys) {
      if (!ALLOWED_COLUMNS.includes(key)) {
        throw new Error(`Field '${key}' is not allowed for update`);
      }
    }

    if (keys.length === 0) return null;

    const values = keys.map(key => fields[key]);

    const setClause = keys
      .map((key, i) => `"${key}" = $${i + 2}`)
      .join(', ');

    const result = await pool.query(
      `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  },
};

module.exports = userModel;
