const taskApplicationModel = require('../models/taskApplicationModel');
const taskModel = require('../models/taskModel');
const walletService = require('../services/walletService');
const taskerProfileModel = require('../models/taskerProfileModel');
const { success, error } = require('../utils/responseHandler');
const { TASK_STATUS, APPLICATION_STATUS } = require('../utils/constants');

/**
 * Application Controller — Handles bidding operations
 */
const applicationController = {
  /**
   * POST /api/tasks/:taskId/applications
   * Tasker creates a bid on a task
   */
  async createApplication(req, res) {
    try {
      const { taskId } = req.params;
      const taskerId = req.user.id;
      const { bid_price, estimated_time, message } = req.body;

      // 1. Check task exists and is OPEN
      const task = await taskModel.findById(taskId);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }
      if (task.status !== TASK_STATUS.OPEN) {
        return error(res, 'This task is no longer accepting applications.', 400);
      }

      // 2. Check tasker is not the poster
      if (task.poster_id === taskerId) {
        return error(res, 'You cannot bid on your own task.', 400);
      }

      // 3. Check tasker hasn't already applied
      const existingApplication = await taskApplicationModel.findByTaskerAndTask(taskerId, taskId);
      if (existingApplication) {
        return error(res, 'You have already applied to this task.', 409);
      }

      // 4. Check bid_price doesn't exceed budget_max
      if (parseFloat(bid_price) > parseFloat(task.budget_max)) {
        return error(
          res,
          `Bid price cannot exceed the maximum budget of ${task.budget_max}.`,
          400
        );
      }

      // 5. Check bid_price is at least budget_min
      if (parseFloat(bid_price) < parseFloat(task.budget_min)) {
        return error(
          res,
          `Bid price cannot be less than the minimum budget of ${task.budget_min}.`,
          400
        );
      }

      // 6. Check tasker has a profile (basic eligibility)
      const taskerProfile = await taskerProfileModel.findByUserId(taskerId);
      if (!taskerProfile) {
        return error(res, 'You need to create a tasker profile before bidding.', 400);
      }

      // 7. Check wallet balance (optional business rule)
      // Uncomment if you want to require minimum balance to bid
      // const balanceCheck = await walletService.verifyBalance(taskerId, bid_price);
      // if (!balanceCheck.hasBalance) {
      //   return error(res, balanceCheck.message, 400);
      // }

      // 8. Create the application
      const application = await taskApplicationModel.create({
        taskId,
        taskerId,
        bidPrice: bid_price,
        estimatedTime: estimated_time || null,
        message: message || null,
      });

      return success(res, application, 'Application submitted successfully.', 201);
    } catch (err) {
      console.error('Create application error:', err);
      return error(res, 'Failed to submit application.', 500);
    }
  },

  /**
   * GET /api/tasks/:taskId/applications
   * Get all applications for a task (Poster or Admin)
   */
  async getApplicationsByTask(req, res) {
    try {
      const { taskId } = req.params;
      const userId = req.user.id;

      // Check task exists
      const task = await taskModel.findById(taskId);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }

      // Only the poster can view applications for their task
      if (task.poster_id !== userId) {
        return error(res, 'You can only view applications for your own tasks.', 403);
      }

      const applications = await taskApplicationModel.findByTaskId(taskId);

      return success(res, applications, 'Applications retrieved successfully.');
    } catch (err) {
      console.error('Get applications error:', err);
      return error(res, 'Failed to retrieve applications.', 500);
    }
  },

  /**
   * PATCH /api/applications/:id/withdraw
   * Tasker withdraws their application
   */
  async withdrawApplication(req, res) {
    try {
      const { id } = req.params;
      const taskerId = req.user.id;

      // Find the application
      const application = await taskApplicationModel.findById(id);
      if (!application) {
        return error(res, 'Application not found.', 404);
      }

      // Check ownership
      if (application.tasker_id !== taskerId) {
        return error(res, 'You can only withdraw your own applications.', 403);
      }

      // Check if application is still pending
      if (application.status !== APPLICATION_STATUS.PENDING) {
        return error(res, `Cannot withdraw an application with status: ${application.status}.`, 400);
      }

      const updatedApplication = await taskApplicationModel.updateStatus(id, APPLICATION_STATUS.WITHDRAWN);

      return success(res, updatedApplication, 'Application withdrawn successfully.');
    } catch (err) {
      console.error('Withdraw application error:', err);
      return error(res, 'Failed to withdraw application.', 500);
    }
  },

  /**
   * PATCH /api/applications/:id
   * Update application bid details (Tasker only — owner check)
   */
  async updateApplication(req, res) {
    try {
      const { id } = req.params;
      const taskerId = req.user.id;
      const { bid_price, estimated_time, message } = req.body;

      // 1. Check application exists
      const application = await taskApplicationModel.findById(id);
      if (!application) {
        return error(res, 'Application not found.', 404);
      }

      // 2. Check ownership
      if (application.tasker_id !== taskerId) {
        return error(res, 'You can only update your own applications.', 403);
      }

      // 3. Check application is PENDING
      if (application.status !== APPLICATION_STATUS.PENDING) {
        return error(res, 'You can only update pending applications.', 400);
      }

      // 4. Check parent task is still OPEN
      const task = await taskModel.findById(application.task_id);
      if (!task || task.status !== TASK_STATUS.OPEN) {
        return error(res, 'The parent task is no longer accepting bids.', 400);
      }

      // 5. Check price boundaries if updating bid price
      if (bid_price) {
        if (parseFloat(bid_price) > parseFloat(task.budget_max)) {
          return error(res, `Bid price cannot exceed the maximum budget of ${task.budget_max}.`, 400);
        }
        if (parseFloat(bid_price) < parseFloat(task.budget_min)) {
          return error(res, `Bid price cannot be less than the minimum budget of ${task.budget_min}.`, 400);
        }
      }

      // 6. Perform update
      const updatedApplication = await taskApplicationModel.update(id, {
        bidPrice: bid_price,
        estimatedTime: estimated_time,
        message,
      });

      return success(res, updatedApplication, 'Application updated successfully.');
    } catch (err) {
      console.error('Update application error:', err);
      return error(res, 'Failed to update application.', 500);
    }
  },

  /**
   * DELETE /api/applications/:id
   * Delete application bid (Tasker only — owner check)
   */
  async deleteApplication(req, res) {
    try {
      const { id } = req.params;
      const taskerId = req.user.id;

      // 1. Check application exists
      const application = await taskApplicationModel.findById(id);
      if (!application) {
        return error(res, 'Application not found.', 404);
      }

      // 2. Check ownership
      if (application.tasker_id !== taskerId) {
        return error(res, 'You can only delete your own applications.', 403);
      }

      // 3. Check application is PENDING
      if (application.status !== APPLICATION_STATUS.PENDING) {
        return error(res, 'You can only delete pending applications.', 400);
      }

      // 4. Perform delete
      await taskApplicationModel.delete(id);

      return success(res, null, 'Application deleted successfully.');
    } catch (err) {
      console.error('Delete application error:', err);
      return error(res, 'Failed to delete application.', 500);
    }
  },
};

module.exports = applicationController;
