const pool = require('../config/db');

/**
 * Task Application Model — Database queries for task_applications table (Bids)
 */
const taskApplicationModel = {
  /**
   * Create a new application/bid
   */
  async create({ taskId, taskerId, bidPrice, estimatedTime, message }) {
    const result = await pool.query(
      `INSERT INTO task_applications (task_id, tasker_id, bid_price, estimated_time, message, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')
       RETURNING *`,
      [taskId, taskerId, bidPrice, estimatedTime, message]
    );
    return result.rows[0];
  },

  /**
   * Find all applications for a task
   */
  async findByTaskId(taskId) {
    const result = await pool.query(
      `SELECT ta.*,
              u.full_name AS tasker_name, u.avatar_url AS tasker_avatar,
              tp.average_rating, tp.bio, tp.location_text
       FROM task_applications ta
       JOIN users u ON ta.tasker_id = u.id
       LEFT JOIN tasker_profiles tp ON tp.user_id = ta.tasker_id
       WHERE ta.task_id = $1
       ORDER BY ta.id ASC`,
      [taskId]
    );
    return result.rows;
  },

  /**
   * Check if a tasker has already applied to a task
   */
  async findByTaskerAndTask(taskerId, taskId) {
    const result = await pool.query(
      `SELECT * FROM task_applications
       WHERE tasker_id = $1 AND task_id = $2 AND status != 'WITHDRAWN'`,
      [taskerId, taskId]
    );
    return result.rows[0] || null;
  },

  /**
   * Find application by ID
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT ta.*,
              u.full_name AS tasker_name, u.avatar_url AS tasker_avatar
       FROM task_applications ta
       JOIN users u ON ta.tasker_id = u.id
       WHERE ta.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Update application status
   */
  async updateStatus(id, status) {
    const result = await pool.query(
      'UPDATE task_applications SET status = $2 WHERE id = $1 RETURNING *',
      [id, status]
    );
    return result.rows[0] || null;
  },

  /**
   * Reject all pending applications for a task (except the accepted one)
   */
  async rejectAllExcept(taskId, acceptedApplicationId) {
    const result = await pool.query(
      `UPDATE task_applications
       SET status = 'REJECTED'
       WHERE task_id = $1 AND id != $2 AND status = 'PENDING'
       RETURNING *`,
      [taskId, acceptedApplicationId]
    );
    return result.rows;
  },

  /**
   * Count pending applications for a task
   */
  async countPendingByTaskId(taskId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM task_applications
       WHERE task_id = $1 AND status = 'PENDING'`,
      [taskId]
    );
    return parseInt(result.rows[0].count);
  },
};

module.exports = taskApplicationModel;
