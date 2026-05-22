const pool = require('../config/db');

/**
 * Assigned Task Model — Database queries for assigned_tasks table
 */
const assignedTaskModel = {
  /**
   * Create an assigned task record
   */
  async create({ taskId, taskerId, applicationId, assignedBy }) {
    const result = await pool.query(
      `INSERT INTO assigned_tasks (task_id, tasker_id, application_id, assigned_by, status)
       VALUES ($1, $2, $3, $4, 'ASSIGNED')
       RETURNING *`,
      [taskId, taskerId, applicationId, assignedBy]
    );
    return result.rows[0];
  },

  /**
   * Find assigned task by task ID
   */
  async findByTaskId(taskId) {
    const result = await pool.query(
      `SELECT at.*,
              u.full_name AS tasker_name, u.avatar_url AS tasker_avatar
       FROM assigned_tasks at
       JOIN users u ON at.tasker_id = u.id
       WHERE at.task_id = $1`,
      [taskId]
    );
    return result.rows[0] || null;
  },

  /**
   * Update assigned task status
   */
  async updateStatus(id, status) {
    const result = await pool.query(
      'UPDATE assigned_tasks SET status = $2 WHERE id = $1 RETURNING *',
      [id, status]
    );
    return result.rows[0] || null;
  },
};

module.exports = assignedTaskModel;
