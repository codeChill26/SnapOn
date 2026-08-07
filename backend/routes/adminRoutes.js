const express = require('express');
const router = express.Router();
const verifyFirebaseToken = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const pool = require('../config/db');
const { success } = require('../utils/responseHandler');

// GET /api/admin/stats — Aggregated platform statistics
router.get('/stats', verifyFirebaseToken, authorize('ADMIN'), async (req, res, next) => {
  try {
    const [
      userStats,
      taskStats,
      applicationStats,
      assignmentStats,
      escrowStats,
      tasksByCategory,
      tasksByDay,
      topUsers,
      walletStats,
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_this_month,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_this_week,
          COUNT(*) FILTER (WHERE is_verified = TRUE) AS verified
        FROM users
        WHERE status != 'BANNED'
      `),

      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'OPEN') AS open,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
          COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
          COUNT(*) FILTER (WHERE post_type = 'RECRUITMENT' OR post_type IS NULL) AS recruitment,
          COUNT(*) FILTER (WHERE post_type = 'SERVICE_OFFER') AS service_offer,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_this_month,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_this_week
        FROM tasks
      `),

      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
          COUNT(*) FILTER (WHERE status = 'ACCEPTED') AS accepted,
          COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected,
          COUNT(*) FILTER (WHERE status = 'WITHDRAWN') AS withdrawn
        FROM task_applications
      `),

      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
          COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
          COUNT(*) FILTER (WHERE status IN ('IN_PROGRESS', 'ACTIVE')) AS in_progress,
          COUNT(*) FILTER (WHERE status = 'ASSIGNED') AS assigned
        FROM assigned_tasks
      `),

      pool.query(`
        SELECT
          COALESCE(SUM(amount), 0) AS total_volume,
          COALESCE(SUM(amount) FILTER (WHERE status = 'RELEASED'), 0) AS released_volume,
          COALESCE(SUM(amount) FILTER (WHERE status = 'HOLDING'), 0) AS holding_volume,
          COALESCE(SUM(amount) FILTER (WHERE status = 'REFUNDED'), 0) AS refunded_volume
        FROM escrows
      `),

      pool.query(`
        SELECT c.name, c.slug, COUNT(t.id) AS count
        FROM categories c
        LEFT JOIN tasks t ON t.category_id = c.id
        GROUP BY c.id, c.name, c.slug
        ORDER BY count DESC
        LIMIT 10
      `),

      pool.query(`
        SELECT
          DATE(created_at) AS date,
          COUNT(*) AS count,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed
        FROM tasks
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),

      pool.query(`
        SELECT
          u.id, u.full_name, u.avatar_url, u.email, u.created_at,
          COUNT(DISTINCT t.id) AS post_count,
          COUNT(DISTINCT at.id) FILTER (WHERE at.status = 'COMPLETED') AS completed_count
        FROM users u
        LEFT JOIN tasks t ON t.poster_id = u.id
        LEFT JOIN assigned_tasks at ON at.tasker_id = u.id
        WHERE u.status != 'BANNED'
        GROUP BY u.id, u.full_name, u.avatar_url, u.email, u.created_at
        ORDER BY post_count DESC
        LIMIT 8
      `),

      pool.query(`
        SELECT
          COALESCE(SUM(available_balance + locked_balance), 0) AS total_balance,
          COUNT(*) AS wallet_count
        FROM wallets
      `),
    ]);

    return success(
      res,
      {
        users: {
          total: parseInt(userStats.rows[0].total),
          newThisMonth: parseInt(userStats.rows[0].new_this_month),
          newThisWeek: parseInt(userStats.rows[0].new_this_week),
          verified: parseInt(userStats.rows[0].verified),
        },
        tasks: {
          total: parseInt(taskStats.rows[0].total),
          open: parseInt(taskStats.rows[0].open),
          inProgress: parseInt(taskStats.rows[0].in_progress),
          completed: parseInt(taskStats.rows[0].completed),
          cancelled: parseInt(taskStats.rows[0].cancelled),
          recruitment: parseInt(taskStats.rows[0].recruitment),
          serviceOffer: parseInt(taskStats.rows[0].service_offer),
          newThisMonth: parseInt(taskStats.rows[0].new_this_month),
          newThisWeek: parseInt(taskStats.rows[0].new_this_week),
        },
        applications: {
          total: parseInt(applicationStats.rows[0].total),
          pending: parseInt(applicationStats.rows[0].pending),
          accepted: parseInt(applicationStats.rows[0].accepted),
          rejected: parseInt(applicationStats.rows[0].rejected),
          withdrawn: parseInt(applicationStats.rows[0].withdrawn),
        },
        assignments: {
          total: parseInt(assignmentStats.rows[0].total),
          completed: parseInt(assignmentStats.rows[0].completed),
          cancelled: parseInt(assignmentStats.rows[0].cancelled),
          inProgress: parseInt(assignmentStats.rows[0].in_progress),
          assigned: parseInt(assignmentStats.rows[0].assigned),
        },
        escrow: {
          totalVolume: parseFloat(escrowStats.rows[0].total_volume),
          releasedVolume: parseFloat(escrowStats.rows[0].released_volume),
          holdingVolume: parseFloat(escrowStats.rows[0].holding_volume),
          refundedVolume: parseFloat(escrowStats.rows[0].refunded_volume),
        },
        wallet: {
          totalBalance: parseFloat(walletStats.rows[0].total_balance),
          walletCount: parseInt(walletStats.rows[0].wallet_count),
        },
        tasksByCategory: tasksByCategory.rows.map(r => ({
          name: r.name,
          slug: r.slug,
          count: parseInt(r.count),
        })),
        tasksByDay: tasksByDay.rows.map(r => ({
          date: r.date,
          count: parseInt(r.count),
          completed: parseInt(r.completed),
        })),
        topUsers: topUsers.rows.map(r => ({
          id: r.id,
          name: r.full_name,
          avatarUrl: r.avatar_url,
          email: r.email,
          joinedAt: r.created_at,
          postCount: parseInt(r.post_count),
          completedCount: parseInt(r.completed_count),
        })),
      },
      'Admin stats fetched successfully'
    );
  } catch (err) {
    console.error('Admin stats error:', err);
    next(err);
  }
});

// GET /api/admin/withdrawals — List withdrawal requests for admin review
router.get('/withdrawals', verifyFirebaseToken, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT wt.*, w.user_id, u.full_name, u.email, u.phone, u.avatar_url
      FROM wallet_transactions wt
      JOIN wallets w ON wt.wallet_id = w.id
      JOIN users u ON w.user_id = u.id
      WHERE wt.type = 'WITHDRAW'
    `;
    const params = [];
    if (status) {
      params.push(status);
      query += ` AND wt.status = $${params.length}`;
    }
    query += ` ORDER BY wt.created_at DESC`;

    const result = await pool.query(query, params);
    return success(res, result.rows, 'Withdrawal requests fetched successfully');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/withdrawals/:id/approve — Admin approves withdrawal
router.patch('/withdrawals/:id/approve', verifyFirebaseToken, authorize('ADMIN'), async (req, res, next) => {
  const { id } = req.params;
  const withDbTx = require('../utils/withDbTx');
  try {
    const result = await withDbTx(async (db) => {
      const txRes = await db.query(
        `SELECT wt.*, w.id as wallet_id FROM wallet_transactions wt JOIN wallets w ON wt.wallet_id = w.id WHERE wt.id = $1 FOR UPDATE`,
        [id]
      );
      if (txRes.rows.length === 0) {
        const err = new Error('Withdrawal request not found');
        err.statusCode = 404;
        throw err;
      }
      const tx = txRes.rows[0];
      if (tx.status !== 'PENDING') {
        const err = new Error(`Withdrawal is already in ${tx.status} status.`);
        err.statusCode = 400;
        throw err;
      }

      const amt = parseFloat(tx.amount);
      // Deduct locked_balance and total balance upon approval
      await db.query(
        `UPDATE wallets
         SET locked_balance = locked_balance - $2,
             balance = balance - $2
         WHERE id = $1`,
        [tx.wallet_id, amt]
      );

      const updatedTx = await db.query(
        `UPDATE wallet_transactions SET status = 'SUCCESS' WHERE id = $1 RETURNING *`,
        [id]
      );

      return updatedTx.rows[0];
    });

    return success(res, result, 'Withdrawal request approved successfully.');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/withdrawals/:id/reject — Admin rejects withdrawal
router.patch('/withdrawals/:id/reject', verifyFirebaseToken, authorize('ADMIN'), async (req, res, next) => {
  const { id } = req.params;
  const withDbTx = require('../utils/withDbTx');
  try {
    const result = await withDbTx(async (db) => {
      const txRes = await db.query(
        `SELECT wt.*, w.id as wallet_id FROM wallet_transactions wt JOIN wallets w ON wt.wallet_id = w.id WHERE wt.id = $1 FOR UPDATE`,
        [id]
      );
      if (txRes.rows.length === 0) {
        const err = new Error('Withdrawal request not found');
        err.statusCode = 404;
        throw err;
      }
      const tx = txRes.rows[0];
      if (tx.status !== 'PENDING') {
        const err = new Error(`Withdrawal is already in ${tx.status} status.`);
        err.statusCode = 400;
        throw err;
      }

      const amt = parseFloat(tx.amount);
      // Return locked_balance back to available_balance upon rejection
      await db.query(
        `UPDATE wallets
         SET locked_balance = locked_balance - $2,
             available_balance = available_balance + $2
         WHERE id = $1`,
        [tx.wallet_id, amt]
      );

      const updatedTx = await db.query(
        `UPDATE wallet_transactions SET status = 'FAILED' WHERE id = $1 RETURNING *`,
        [id]
      );

      return updatedTx.rows[0];
    });

    return success(res, result, 'Withdrawal request rejected successfully.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
