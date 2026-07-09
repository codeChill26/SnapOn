const activityModel = require('../models/activityModel');
const { success, error, paginated } = require('../utils/responseHandler');
const { fromDbTaskStatus, fromDbApplicationStatus } = require('../utils/dbEnum');

/**
 * Activity Controller — thin layer over activityModel (read-only feed/summary)
 */
const activityController = {
  async getActivities(req, res) {
    try {
      const userId = req.user.id;
      const { view = 'POSTED', status, search, page = 1, limit = 10 } = req.query;

      const currentPage = parseInt(page) || 1;
      const currentLimit = parseInt(limit) || 10;
      const offset = (currentPage - 1) * currentLimit;

      if (view !== 'POSTED' && view !== 'PARTICIPATING') {
        return error(res, 'Invalid view param.', 400);
      }

      const { rows, total } =
        view === 'POSTED'
          ? await activityModel.listPosted(userId, { status, search, limit: currentLimit, offset })
          : await activityModel.listParticipating(userId, { status, search, limit: currentLimit, offset });

      const data = rows.map(row => {
        row.post.status = fromDbTaskStatus(row.post.status);
        if (row.participation) {
          row.participation.status = fromDbApplicationStatus(row.participation.status);
        }
        return row;
      });

      return paginated(res, data, {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages: Math.ceil(total / currentLimit),
        hasNext: currentPage * currentLimit < total,
      }, 'Activities retrieved successfully.');
    } catch (err) {
      console.error('getActivities error:', err);
      return error(res, 'Failed to retrieve activities.', 500);
    }
  },

  async getActivitySummary(req, res) {
    try {
      const userId = req.user.id;
      const c = await activityModel.getSummaryCounts(userId);

      const summary = {
        posted: {
          total: c[0],
          open: c[1],
          inProgress: c[2],
          completed: c[3],
          cancelled: c[4],
        },
        participating: {
          total: c[5],
          pending: c[6],
          accepted: c[7],
          inProgress: c[8],
          completed: c[9],
          ended: c[10],
        },
      };

      return success(res, summary, 'Activity summary retrieved successfully.');
    } catch (err) {
      console.error('getActivitySummary error:', err);
      return error(res, 'Failed to retrieve activity summary.', 500);
    }
  },
};

module.exports = activityController;
