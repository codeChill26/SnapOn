const notificationModel = require('../models/notificationModel');
const { success, error } = require('../utils/responseHandler');

const notificationController = {
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

      const [notifications, unreadCount] = await Promise.all([
        notificationModel.findByUserId(userId, parseInt(limit, 10), offset),
        notificationModel.countUnread(userId),
      ]);

      return success(res, { notifications, unreadCount }, 'Notifications retrieved successfully.');
    } catch (err) {
      console.error('Get notifications error:', err);
      return error(res, 'Failed to fetch notifications.', 500);
    }
  },

  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const updated = await notificationModel.markAsRead(id, userId);
      return success(res, updated, 'Notification marked as read.');
    } catch (err) {
      console.error('Mark read error:', err);
      return error(res, 'Failed to mark notification as read.', 500);
    }
  },

  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      await notificationModel.markAllAsRead(userId);
      return success(res, null, 'All notifications marked as read.');
    } catch (err) {
      console.error('Mark all read error:', err);
      return error(res, 'Failed to mark all as read.', 500);
    }
  },
};

module.exports = notificationController;
