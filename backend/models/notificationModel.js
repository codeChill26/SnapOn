const pool = require('../config/db');

const notificationModel = {
  async create({ userId, title, content, type = 'GENERAL', taskId = null }) {
    const query = `
      INSERT INTO notifications (id, user_id, title, content, type, task_id, is_read, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, false, NOW())
      RETURNING *
    `;
    const res = await pool.query(query, [userId, title, content, type, taskId]);
    return res.rows[0];
  },

  async findByUserId(userId, limit = 20, offset = 0) {
    const query = `
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const res = await pool.query(query, [userId, limit, offset]);
    return res.rows;
  },

  async countUnread(userId) {
    const query = `
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = $1 AND is_read = false
    `;
    const res = await pool.query(query, [userId]);
    return parseInt(res.rows[0].count, 10);
  },

  async markAsRead(id, userId) {
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const res = await pool.query(query, [id, userId]);
    return res.rows[0];
  },

  async markAllAsRead(userId) {
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1 AND is_read = false
    `;
    await pool.query(query, [userId]);
    return true;
  },
};

module.exports = notificationModel;
