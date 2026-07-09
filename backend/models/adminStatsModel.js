const pool = require('../config/db');

/**
 * Admin Stats Model — aggregate platform statistics (read-only)
 */
const adminStatsModel = {
  /** All dashboard counters, queried in parallel. */
  async getPlatformStats(db = pool) {
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
      db.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_this_month,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_this_week,
          COUNT(*) FILTER (WHERE is_verified = TRUE) AS verified
        FROM users
        WHERE status != 'BANNED'
      `),

      db.query(`
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

      db.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
          COUNT(*) FILTER (WHERE status = 'ACCEPTED') AS accepted,
          COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected,
          COUNT(*) FILTER (WHERE status = 'WITHDRAWN') AS withdrawn
        FROM task_applications
      `),

      db.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
          COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
          COUNT(*) FILTER (WHERE status IN ('IN_PROGRESS', 'ACTIVE')) AS in_progress,
          COUNT(*) FILTER (WHERE status = 'ASSIGNED') AS assigned
        FROM assigned_tasks
      `),

      db.query(`
        SELECT
          COALESCE(SUM(amount), 0) AS total_volume,
          COALESCE(SUM(amount) FILTER (WHERE status = 'RELEASED'), 0) AS released_volume,
          COALESCE(SUM(amount) FILTER (WHERE status = 'HOLDING'), 0) AS holding_volume,
          COALESCE(SUM(amount) FILTER (WHERE status = 'REFUNDED'), 0) AS refunded_volume
        FROM escrows
      `),

      db.query(`
        SELECT c.name, c.slug, COUNT(t.id) AS count
        FROM categories c
        LEFT JOIN tasks t ON t.category_id = c.id
        GROUP BY c.id, c.name, c.slug
        ORDER BY count DESC
        LIMIT 10
      `),

      db.query(`
        SELECT
          DATE(created_at) AS date,
          COUNT(*) AS count,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed
        FROM tasks
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),

      db.query(`
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

      db.query(`
        SELECT
          COALESCE(SUM(available_balance + locked_balance), 0) AS total_balance,
          COUNT(*) AS wallet_count
        FROM wallets
      `),
    ]);

    return {
      userStats: userStats.rows[0],
      taskStats: taskStats.rows[0],
      applicationStats: applicationStats.rows[0],
      assignmentStats: assignmentStats.rows[0],
      escrowStats: escrowStats.rows[0],
      tasksByCategory: tasksByCategory.rows,
      tasksByDay: tasksByDay.rows,
      topUsers: topUsers.rows,
      walletStats: walletStats.rows[0],
    };
  },
};

module.exports = adminStatsModel;
