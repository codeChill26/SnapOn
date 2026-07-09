const pool = require('../config/db');

/**
 * Escrow Model — DB queries for escrows
 */
const escrowModel = {
  async findByTaskId(taskId, db = pool) {
    const result = await db.query(
      'SELECT * FROM escrows WHERE task_id = $1 LIMIT 1',
      [taskId]
    );
    return result.rows[0] || null;
  },

  async listByUserId(userId, { role = 'all', status, limit = 20, cursor } = {}, db = pool) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));

    const whereParts = [];
    const params = [];

    // role filter
    params.push(userId);
    if (role === 'poster') {
      whereParts.push('poster_id = $1');
    } else if (role === 'tasker') {
      whereParts.push('tasker_id = $1');
    } else {
      whereParts.push('(poster_id = $1 OR tasker_id = $1)');
    }

    // status filter
    if (status) {
      params.push(status);
      whereParts.push(`status = $${params.length}`);
    }

    // cursor pagination (cursor is escrow id)
    if (cursor) {
      params.push(cursor);
      whereParts.push(
        `created_at < (SELECT created_at FROM escrows WHERE id = $${params.length})`
      );
    }

    params.push(safeLimit);

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT * FROM escrows
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );

    return result.rows;
  },
  async deleteByTaskId(taskId, db = pool) {
    const result = await db.query(
      'DELETE FROM escrows WHERE task_id = $1 RETURNING *',
      [taskId]
    );
    return result.rows[0] || null;
  },

  /** Find escrow by PayOS order code (payment mapping). */
  async findByOrderCode(orderCode, db = pool) {
    const result = await db.query(
      'SELECT * FROM escrows WHERE order_code = $1 LIMIT 1',
      [orderCode]
    );
    return result.rows[0] || null;
  },

  /** Tasker ids of escrows currently HOLDING for a task. */
  async findHoldingTaskerIds(taskId, db = pool) {
    const result = await db.query(
      "SELECT tasker_id FROM escrows WHERE task_id = $1 AND status = 'HOLDING'",
      [taskId]
    );
    return result.rows.map(r => r.tasker_id);
  },

  /** Lock escrow row by order code inside a transaction. */
  async lockByOrderCode(orderCode, db) {
    if (!db) throw new Error('lockByOrderCode requires a db client');
    const result = await db.query(
      'SELECT * FROM escrows WHERE order_code = $1 FOR UPDATE',
      [orderCode]
    );
    return result.rows[0] || null;
  },
};

module.exports = escrowModel;
