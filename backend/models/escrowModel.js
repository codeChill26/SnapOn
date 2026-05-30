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
};

module.exports = escrowModel;
