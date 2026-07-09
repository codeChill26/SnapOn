const adminStatsModel = require('../models/adminStatsModel');

/**
 * Admin Controller — platform statistics for the admin console
 */
const adminController = {
  /** GET /api/admin/stats */
  async getStats(req, res) {
    try {
      const s = await adminStatsModel.getPlatformStats();

      res.json({
        success: true,
        data: {
          users: {
            total: parseInt(s.userStats.total),
            newThisMonth: parseInt(s.userStats.new_this_month),
            newThisWeek: parseInt(s.userStats.new_this_week),
            verified: parseInt(s.userStats.verified),
          },
          tasks: {
            total: parseInt(s.taskStats.total),
            open: parseInt(s.taskStats.open),
            inProgress: parseInt(s.taskStats.in_progress),
            completed: parseInt(s.taskStats.completed),
            cancelled: parseInt(s.taskStats.cancelled),
            recruitment: parseInt(s.taskStats.recruitment),
            serviceOffer: parseInt(s.taskStats.service_offer),
            newThisMonth: parseInt(s.taskStats.new_this_month),
            newThisWeek: parseInt(s.taskStats.new_this_week),
          },
          applications: {
            total: parseInt(s.applicationStats.total),
            pending: parseInt(s.applicationStats.pending),
            accepted: parseInt(s.applicationStats.accepted),
            rejected: parseInt(s.applicationStats.rejected),
            withdrawn: parseInt(s.applicationStats.withdrawn),
          },
          assignments: {
            total: parseInt(s.assignmentStats.total),
            completed: parseInt(s.assignmentStats.completed),
            cancelled: parseInt(s.assignmentStats.cancelled),
            inProgress: parseInt(s.assignmentStats.in_progress),
            assigned: parseInt(s.assignmentStats.assigned),
          },
          escrow: {
            totalVolume: parseFloat(s.escrowStats.total_volume),
            releasedVolume: parseFloat(s.escrowStats.released_volume),
            holdingVolume: parseFloat(s.escrowStats.holding_volume),
            refundedVolume: parseFloat(s.escrowStats.refunded_volume),
          },
          wallet: {
            totalBalance: parseFloat(s.walletStats.total_balance),
            walletCount: parseInt(s.walletStats.wallet_count),
          },
          tasksByCategory: s.tasksByCategory.map(r => ({
            name: r.name,
            slug: r.slug,
            count: parseInt(r.count),
          })),
          tasksByDay: s.tasksByDay.map(r => ({
            date: r.date,
            count: parseInt(r.count),
            completed: parseInt(r.completed),
          })),
          topUsers: s.topUsers.map(r => ({
            id: r.id,
            name: r.full_name,
            avatarUrl: r.avatar_url,
            email: r.email,
            joinedAt: r.created_at,
            postCount: parseInt(r.post_count),
            completedCount: parseInt(r.completed_count),
          })),
        },
      });
    } catch (err) {
      console.error('Admin stats error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch admin stats',
        error: err.message,
      });
    }
  },
};

module.exports = adminController;
