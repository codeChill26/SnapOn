const matchingService = require('../services/matchingService');
const taskModel = require('../models/taskModel');
const taskApplicationModel = require('../models/taskApplicationModel');
const assignedTaskModel = require('../models/assignedTaskModel');
const escrowService = require('../services/escrowService');
const { success, error } = require('../utils/responseHandler');
const { TASK_STATUS, APPLICATION_STATUS, ASSIGNED_BY } = require('../utils/constants');

/**
 * Matching Controller — Handles task matching (auto & manual)
 */
const matchingController = {
  /**
   * POST /api/tasks/:taskId/auto-match
   * Auto-match: System selects the best tasker based on scoring algorithm
   */
  async autoMatch(req, res) {
    try {
      const { taskId } = req.params;
      const userId = req.user.id;

      // 1. Check task exists and is OPEN
      const task = await taskModel.findById(taskId);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }
      if (task.poster_id !== userId) {
        return error(res, 'You can only match your own tasks.', 403);
      }
      if (task.status !== TASK_STATUS.OPEN) {
        return error(res, 'Task is not in OPEN status. Cannot match.', 400);
      }

      // 2. Check if already assigned
      const existingAssignment = await assignedTaskModel.findByTaskId(taskId);
      if (existingAssignment) {
        return error(res, 'This task has already been assigned.', 409);
      }

      // 3. Check if there are pending applications
      const pendingCount = await taskApplicationModel.countPendingByTaskId(taskId);
      if (pendingCount === 0) {
        return error(res, 'No pending applications to match.', 400);
      }

      // 4. Run auto-match algorithm
      const bestMatch = await matchingService.autoMatch(taskId);
      if (!bestMatch) {
        return error(res, 'Could not find a suitable match.', 400);
      }

      // 5. Two-phase: create PENDING_PAYMENT escrow + PayOS link.
      // Match sẽ được CHỐT khi thanh toán thành công (webhook/confirm).
      const application = await taskApplicationModel.findById(bestMatch.applicationId);
      if (!application || application.task_id !== taskId) {
        return error(res, 'Application not found for this task.', 404);
      }

      const pending = await escrowService.createPendingEscrow({
        taskId,
        posterId: task.poster_id,
        taskerId: application.tasker_id,
        amount: application.bid_price,
        applicationId: bestMatch.applicationId,
        flow: 'MATCH',
        assignedBy: ASSIGNED_BY.AUTO_MATCH,
        voucherCode: req.body?.voucher_code,
      });

      return success(
        res,
        {
          paymentRequired: true,
          checkoutUrl: pending.checkoutUrl,
          orderCode: pending.orderCode,
          payAmount: pending.payAmount,
          discount: pending.discount,
          expiresAt: pending.expiresAt,
          matchedTasker: bestMatch,
          escrow: pending.escrow,
        },
        'Vui lòng thanh toán để xác nhận ghép việc.'
      );
    } catch (err) {
      console.error('Auto-match error:', err);
      const status = err.statusCode || 500;
      const message = err.message || 'Failed to auto-match.';
      return error(res, message, status);
    }
  },

  /**
   * POST /api/tasks/:taskId/manual-match
   * Manual match: Poster selects a specific application
   */
  async manualMatch(req, res) {
    try {
      const { taskId } = req.params;
      const { application_id } = req.body;
      const userId = req.user.id;

      // 1. Check task exists and is OPEN
      const task = await taskModel.findById(taskId);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }
      if (task.poster_id !== userId) {
        return error(res, 'You can only match your own tasks.', 403);
      }
      if (task.status !== TASK_STATUS.OPEN) {
        return error(res, 'Task is not in OPEN status. Cannot match.', 400);
      }

      // 2. Check if already assigned
      const existingAssignment = await assignedTaskModel.findByTaskId(taskId);
      if (existingAssignment) {
        return error(res, 'This task has already been assigned.', 409);
      }

      // 3. Check the selected application exists and belongs to this task
      const application = await taskApplicationModel.findById(application_id);
      if (!application) {
        return error(res, 'Application not found.', 404);
      }
      if (application.task_id !== taskId) {
        return error(res, 'This application does not belong to this task.', 400);
      }
      if (application.status !== APPLICATION_STATUS.PENDING) {
        return error(res, `Cannot select an application with status: ${application.status}.`, 400);
      }

      // 4. Two-phase: create PENDING_PAYMENT escrow + PayOS link.
      // Match sẽ được CHỐT khi thanh toán thành công (webhook/confirm).
      const pending = await escrowService.createPendingEscrow({
        taskId,
        posterId: task.poster_id,
        taskerId: application.tasker_id,
        amount: application.bid_price,
        applicationId: application_id,
        flow: 'MATCH',
        assignedBy: ASSIGNED_BY.MANUAL,
        voucherCode: req.body?.voucher_code,
      });

      return success(
        res,
        {
          paymentRequired: true,
          checkoutUrl: pending.checkoutUrl,
          orderCode: pending.orderCode,
          payAmount: pending.payAmount,
          discount: pending.discount,
          expiresAt: pending.expiresAt,
          selectedApplication: application,
          escrow: pending.escrow,
        },
        'Vui lòng thanh toán để xác nhận ghép việc.'
      );
    } catch (err) {
      console.error('Manual-match error:', err);
      const status = err.statusCode || 500;
      const message = err.message || 'Failed to manual-match.';
      return error(res, message, status);
    }
  },

  /**
   * GET /api/tasks/:taskId/ranked-applications
   * Get applications ranked by matching score
   */
  async getRankedApplications(req, res) {
    try {
      const { taskId } = req.params;
      const userId = req.user.id;

      // Check task exists
      const task = await taskModel.findById(taskId);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }
      if (task.poster_id !== userId) {
        return error(res, 'You can only view ranked applications for your own tasks.', 403);
      }

      // Rank applications
      const rankedApplications = await matchingService.rankApplications(taskId);

      return success(res, rankedApplications, 'Ranked applications retrieved successfully.');
    } catch (err) {
      console.error('Get ranked applications error:', err);
      return error(res, 'Failed to retrieve ranked applications.', 500);
    }
  },
};

module.exports = matchingController;
