const pool = require('../config/db');
const { toDbApplicationStatus, fromDbApplicationStatus, fromDbAssignedTaskStatus } = require('../utils/dbEnum');

/**
 * Task Application Model — Database queries for task_applications table (Bids)
 */
const taskApplicationModel = {
  /**
   * Create a new application/bid
   */
  async create({ taskId, taskerId, bidPrice, estimatedTime, message }, db = pool) {
    const result = await db.query(
      `INSERT INTO task_applications (id, task_id, tasker_id, bid_price, estimated_time, message, status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'PENDING')
       RETURNING *`,
      [taskId, taskerId, bidPrice, estimatedTime, message]
    );
    const row = result.rows[0];
    if (row) row.status = fromDbApplicationStatus(row.status);
    return row;
  },

  /**
   * Find all applications for a task
   */
  async findByTaskId(taskId, db = pool) {
    const result = await db.query(
      `SELECT ta.*,
              u.full_name AS tasker_name, u.avatar_url AS tasker_avatar,
              tp.average_rating, tp.bio, tp.location_text,
              at.id AS assignment_id,
              at.status AS assignment_status
       FROM task_applications ta
       JOIN users u ON ta.tasker_id = u.id
       LEFT JOIN tasker_profiles tp ON tp.user_id = ta.tasker_id
       LEFT JOIN assigned_tasks at ON at.application_id = ta.id
       WHERE ta.task_id = $1
       ORDER BY ta.id ASC`,
      [taskId]
    );
    for (const r of result.rows) {
      r.status = fromDbApplicationStatus(r.status);
      if (r.assignment_status) {
        r.assignment_status = fromDbAssignedTaskStatus(r.assignment_status);
      }
    }
    return result.rows;
  },

  /**
   * Check if a tasker has already applied to a task
   */
  async findByTaskerAndTask(taskerId, taskId, db = pool) {
    const result = await db.query(
      `SELECT ta.*,
              at.id AS assignment_id,
              at.status AS assignment_status
       FROM task_applications ta
       LEFT JOIN assigned_tasks at ON at.application_id = ta.id
       WHERE ta.tasker_id = $1 AND ta.task_id = $2 AND ta.status != 'CANCELLED'`,
      [taskerId, taskId]
    );
    const row = result.rows[0] || null;
    if (row) {
      row.status = fromDbApplicationStatus(row.status);
      if (row.assignment_status) {
        row.assignment_status = fromDbAssignedTaskStatus(row.assignment_status);
      }
    }
    return row;
  },

  /**
   * Find application by ID
   */
  async findById(id, db = pool) {
    const result = await db.query(
      `SELECT ta.*,
              u.full_name AS tasker_name, u.avatar_url AS tasker_avatar,
              at.id AS assignment_id,
              at.status AS assignment_status
       FROM task_applications ta
       JOIN users u ON ta.tasker_id = u.id
       LEFT JOIN assigned_tasks at ON at.application_id = ta.id
       WHERE ta.id = $1`,
      [id]
    );
    const row = result.rows[0] || null;
    if (row) {
      row.status = fromDbApplicationStatus(row.status);
      if (row.assignment_status) {
        row.assignment_status = fromDbAssignedTaskStatus(row.assignment_status);
      }
    }
    return row;
  },

  /**
   * Update application status
   */
  async updateStatus(id, status, db = pool) {
    const dbStatus = toDbApplicationStatus(status);
    const result = await db.query(
      'UPDATE task_applications SET status = $2 WHERE id = $1 RETURNING *',
      [id, dbStatus]
    );
    const row = result.rows[0] || null;
    if (row) row.status = fromDbApplicationStatus(row.status);
    return row;
  },

  /**
   * Reject all pending applications for a task (except the accepted one)
   */
  async rejectAllExcept(taskId, acceptedApplicationId, db = pool) {
    const result = await db.query(
      `UPDATE task_applications
       SET status = 'REJECTED'
       WHERE task_id = $1 AND id != $2 AND status = 'PENDING'
       RETURNING *`,
      [taskId, acceptedApplicationId]
    );
    for (const r of result.rows) {
      r.status = fromDbApplicationStatus(r.status);
    }
    return result.rows;
  },

  /**
   * Count pending applications for a task
   */
  async countPendingByTaskId(taskId, db = pool) {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM task_applications
       WHERE task_id = $1 AND status = 'PENDING'`,
      [taskId]
    );
    return parseInt(result.rows[0].count);
  },

  /**
   * Update bid/application details
   */
  async update(id, { bidPrice, estimatedTime, message }, db = pool) {
    const result = await db.query(
      `UPDATE task_applications
       SET bid_price = COALESCE($2, bid_price),
           estimated_time = COALESCE($3, estimated_time),
           message = COALESCE($4, message),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, bidPrice, estimatedTime, message]
    );
    const row = result.rows[0] || null;
    if (row) row.status = fromDbApplicationStatus(row.status);
    return row;
  },

  /**
   * Delete an application (Hard delete)
   */
  async delete(id, db = pool) {
    const result = await db.query(
      'DELETE FROM task_applications WHERE id = $1 RETURNING *',
      [id]
    );
    const row = result.rows[0] || null;
    if (row) row.status = fromDbApplicationStatus(row.status);
    return row;
  },

  /**
   * Find all applications submitted by a specific tasker (worker)
   * Joins with tasks table to expose task status so we can check
   * if the worker is currently busy (task IN_PROGRESS + app ACCEPTED)
   */
  async findByTaskerId(taskerId, db = pool) {
    const result = await db.query(
      `SELECT ta.*,
              t.title        AS task_title,
              t.status       AS task_status,
              t.post_type    AS task_post_type,
              t.salary_unit  AS task_salary_unit,
              t.budget_min,
              t.budget_max,
              t.deadline_end,
              u.full_name    AS tasker_name,
              u.avatar_url   AS tasker_avatar,
              at.id          AS assignment_id,
              at.status      AS assignment_status
       FROM task_applications ta
       JOIN tasks             t  ON ta.task_id  = t.id
       JOIN users             u  ON ta.tasker_id = u.id
       LEFT JOIN assigned_tasks at ON at.application_id = ta.id
       WHERE ta.tasker_id = $1
       ORDER BY t.created_at DESC`,
      [taskerId]
    );
    for (const r of result.rows) {
      r.status = fromDbApplicationStatus(r.status);
      if (r.assignment_status) {
        r.assignment_status = fromDbAssignedTaskStatus(r.assignment_status);
      }
    }
    return result.rows;
  },
};

module.exports = taskApplicationModel;

