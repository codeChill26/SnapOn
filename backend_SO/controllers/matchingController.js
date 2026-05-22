const matchingService = require('../services/matchingService');
const taskModel = require('../models/taskModel');
const taskApplicationModel = require('../models/taskApplicationModel');
const assignedTaskModel = require('../models/assignedTaskModel');
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

      // 5. Create assigned task
      const assignedTask = await assignedTaskModel.create({
        taskId,
        taskerId: bestMatch.taskerId,
        applicationId: bestMatch.applicationId,
        assignedBy: ASSIGNED_BY.AUTO_MATCH,
      });

      // 6. Update task status to IN_PROGRESS & set final price
      await taskModel.updateStatus(taskId, TASK_STATUS.IN_PROGRESS);
      await taskModel.updateFinalPrice(taskId, bestMatch.bidPrice);

      // 7. Accept the matched application, reject all others
      await taskApplicationModel.updateStatus(bestMatch.applicationId, APPLICATION_STATUS.ACCEPTED);
      await taskApplicationModel.rejectAllExcept(taskId, bestMatch.applicationId);

      return success(res, {
        assignedTask,
        matchedTasker: bestMatch,
      }, 'Auto-match completed successfully.');
    } catch (err) {
      console.error('Auto-match error:', err);
      return error(res, 'Failed to auto-match.', 500);
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

      // 4. Create assigned task
      const assignedTask = await assignedTaskModel.create({
        taskId,
        taskerId: application.tasker_id,
        applicationId: application_id,
        assignedBy: ASSIGNED_BY.MANUAL,
      });

      // 5. Update task status to IN_PROGRESS & set final price
      await taskModel.updateStatus(taskId, TASK_STATUS.IN_PROGRESS);
      await taskModel.updateFinalPrice(taskId, application.bid_price);

      // 6. Accept this application, reject all others
      await taskApplicationModel.updateStatus(application_id, APPLICATION_STATUS.ACCEPTED);
      await taskApplicationModel.rejectAllExcept(taskId, application_id);

      return success(res, {
        assignedTask,
        selectedApplication: application,
      }, 'Manual match completed successfully.');
    } catch (err) {
      console.error('Manual-match error:', err);
      return error(res, 'Failed to manual-match.', 500);
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
