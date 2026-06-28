const pool = require('../config/db');
const { toDbAssignedBy, toDbAssignedTaskStatus, fromDbAssignedTaskStatus } = require('../utils/dbEnum');

/**
 * Assigned Task Model — Database queries for assigned_tasks table
 */
const assignedTaskModel = {
  /**
   * Create an assigned task record
   */
  async create({ taskId, taskerId, applicationId, assignedBy }, db = pool) {
    const dbAssignedBy = toDbAssignedBy(assignedBy);
    const dbStatus = toDbAssignedTaskStatus('ASSIGNED');
    const result = await db.query(
      `INSERT INTO assigned_tasks (id, task_id, tasker_id, application_id, assigned_by, status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING *`,
      [taskId, taskerId, applicationId, dbAssignedBy, dbStatus]
    );
    const row = result.rows[0];
    if (row) row.status = fromDbAssignedTaskStatus(row.status);
    return row;
  },

  /**
   * Find assigned task by task ID
   */
  async findByTaskId(taskId, db = pool) {
    const result = await db.query(
      `SELECT at.*,
              u.full_name AS tasker_name, u.avatar_url AS tasker_avatar
       FROM assigned_tasks at
       JOIN users u ON at.tasker_id = u.id
       WHERE at.task_id = $1`,
      [taskId]
    );
    const row = result.rows[0] || null;
    if (row) row.status = fromDbAssignedTaskStatus(row.status);
    return row;
  },

  /**
   * Update assigned task status
   */
  async updateStatus(id, status, db = pool) {
    const dbStatus = toDbAssignedTaskStatus(status);
    const result = await db.query(
      'UPDATE assigned_tasks SET status = $2 WHERE id = $1 RETURNING *',
      [id, dbStatus]
    );
    const row = result.rows[0] || null;
    if (row) row.status = fromDbAssignedTaskStatus(row.status);
    return row;
  },

  /**
   * Find assigned task by ID
   */
  async findById(id, db = pool) {
    const result = await db.query(
      `SELECT at.*,
              u.full_name AS tasker_name, u.avatar_url AS tasker_avatar
       FROM assigned_tasks at
       JOIN users u ON at.tasker_id = u.id
       WHERE at.id = $1`,
      [id]
    );
    const row = result.rows[0] || null;
    if (row) row.status = fromDbAssignedTaskStatus(row.status);
    return row;
  },

  /**
   * Find all assigned tasks for a task ID
   */
  async findListByTaskId(taskId, db = pool) {
    const result = await db.query(
      `SELECT at.*,
              u.full_name AS tasker_name, u.avatar_url AS tasker_avatar
       FROM assigned_tasks at
       JOIN users u ON at.tasker_id = u.id
       WHERE at.task_id = $1`,
      [taskId]
    );
    for (const row of result.rows) {
      row.status = fromDbAssignedTaskStatus(row.status);
    }
    return result.rows;
  },

  /**
   * Count active (IN_PROGRESS) assignments for a tasker
   */
  async countActiveByTaskerId(taskerId, db = pool) {
    const dbStatus = toDbAssignedTaskStatus('IN_PROGRESS');
    const result = await db.query(
      `SELECT COUNT(*) AS count 
       FROM assigned_tasks 
       WHERE tasker_id = $1 AND status = $2`,
      [taskerId, dbStatus]
    );
    return parseInt(result.rows[0].count, 10);
  },
};

module.exports = assignedTaskModel;
