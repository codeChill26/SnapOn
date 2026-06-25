const matchingService = require('../services/matchingService');
const taskModel = require('../models/taskModel');
const taskApplicationModel = require('../models/taskApplicationModel');
const assignedTaskModel = require('../models/assignedTaskModel');
const escrowService = require('../services/escrowService');
const pool = require('../config/db');
const { success, error } = require('../utils/responseHandler');
const { TASK_STATUS, APPLICATION_STATUS, ASSIGNED_BY } = require('../utils/constants');
const { toDbTaskStatus, toDbApplicationStatus } = require('../utils/dbEnum');

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

      // 5-9. Atomic: HOLD escrow + assign + update task + accept/reject
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Lock task to prevent concurrent matches
        const lockedTaskRes = await client.query(
          'SELECT * FROM tasks WHERE id = $1 FOR UPDATE',
          [taskId]
        );
        const lockedTask = lockedTaskRes.rows[0];
        if (!lockedTask) {
          const e = new Error('Task not found.');
          e.statusCode = 404;
          throw e;
        }
        if (lockedTask.status !== toDbTaskStatus(TASK_STATUS.OPEN)) {
          const e = new Error('Task is not in OPEN status. Cannot match.');
          e.statusCode = 400;
          throw e;
        }

        const existingAssignmentRes = await client.query(
          'SELECT id FROM assigned_tasks WHERE task_id = $1 LIMIT 1 FOR UPDATE',
          [taskId]
        );
        if (existingAssignmentRes.rows.length > 0) {
          const e = new Error('This task has already been assigned.');
          e.statusCode = 409;
          throw e;
        }

        // Lock selected application
        const appRes = await client.query(
          'SELECT * FROM task_applications WHERE id = $1 FOR UPDATE',
          [bestMatch.applicationId]
        );
        const application = appRes.rows[0];
        if (!application || application.task_id !== taskId) {
          const e = new Error('Application not found for this task.');
          e.statusCode = 404;
          throw e;
        }
        if (application.status !== toDbApplicationStatus(APPLICATION_STATUS.PENDING)) {
          const e = new Error('Selected application is no longer pending.');
          e.statusCode = 409;
          throw e;
        }

        const { escrow } = await escrowService.holdForMatch(
          {
            taskId,
            posterId: lockedTask.poster_id,
            taskerId: application.tasker_id,
            amount: application.bid_price,
          },
          client
        );

        const assignedTask = await assignedTaskModel.create(
          {
            taskId,
            taskerId: application.tasker_id,
            applicationId: bestMatch.applicationId,
            assignedBy: ASSIGNED_BY.AUTO_MATCH,
          },
          client
        );

        await taskModel.updateStatus(taskId, TASK_STATUS.IN_PROGRESS, client);
        await taskModel.updateFinalPrice(taskId, application.bid_price, client);

        await taskApplicationModel.updateStatus(bestMatch.applicationId, APPLICATION_STATUS.ACCEPTED, client);
        await taskApplicationModel.rejectAllExcept(taskId, bestMatch.applicationId, client);

        await client.query('COMMIT');

        // Broadcast to the accepted worker (tasker) via Socket.io
        const io = req.app.get('io');
        if (io) {
          io.to(application.tasker_id).emit('task_assigned', {
            taskId,
            taskTitle: lockedTask.title,
          });
        }

        return success(
          res,
          { assignedTask, matchedTasker: bestMatch, escrow },
          'Auto-match completed successfully.'
        );
      } catch (txErr) {
        try { await client.query('ROLLBACK'); } catch {}
        throw txErr;
      } finally {
        client.release();
      }
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

      // 4-8. Atomic: HOLD escrow + assign + update task + accept/reject
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const lockedTaskRes = await client.query(
          'SELECT * FROM tasks WHERE id = $1 FOR UPDATE',
          [taskId]
        );
        const lockedTask = lockedTaskRes.rows[0];
        if (!lockedTask) {
          const e = new Error('Task not found.');
          e.statusCode = 404;
          throw e;
        }
        if (lockedTask.status !== toDbTaskStatus(TASK_STATUS.OPEN)) {
          const e = new Error('Task is not in OPEN status. Cannot match.');
          e.statusCode = 400;
          throw e;
        }

        const existingAssignmentRes = await client.query(
          'SELECT id FROM assigned_tasks WHERE task_id = $1 LIMIT 1 FOR UPDATE',
          [taskId]
        );
        if (existingAssignmentRes.rows.length > 0) {
          const e = new Error('This task has already been assigned.');
          e.statusCode = 409;
          throw e;
        }

        const appRes = await client.query(
          'SELECT * FROM task_applications WHERE id = $1 FOR UPDATE',
          [application_id]
        );
        const lockedApp = appRes.rows[0];
        if (!lockedApp || lockedApp.task_id !== taskId) {
          const e = new Error('Application not found for this task.');
          e.statusCode = 404;
          throw e;
        }
        if (lockedApp.status !== toDbApplicationStatus(APPLICATION_STATUS.PENDING)) {
          const e = new Error(`Cannot select an application with status: ${lockedApp.status}.`);
          e.statusCode = 409;
          throw e;
        }

        const { escrow } = await escrowService.holdForMatch(
          {
            taskId,
            posterId: lockedTask.poster_id,
            taskerId: lockedApp.tasker_id,
            amount: lockedApp.bid_price,
          },
          client
        );

        const assignedTask = await assignedTaskModel.create(
          {
            taskId,
            taskerId: lockedApp.tasker_id,
            applicationId: application_id,
            assignedBy: ASSIGNED_BY.MANUAL,
          },
          client
        );

        await taskModel.updateStatus(taskId, TASK_STATUS.IN_PROGRESS, client);
        await taskModel.updateFinalPrice(taskId, lockedApp.bid_price, client);

        await taskApplicationModel.updateStatus(application_id, APPLICATION_STATUS.ACCEPTED, client);
        await taskApplicationModel.rejectAllExcept(taskId, application_id, client);

        await client.query('COMMIT');

        // Broadcast to the accepted worker (tasker) via Socket.io
        const io = req.app.get('io');
        if (io) {
          io.to(lockedApp.tasker_id).emit('task_assigned', {
            taskId,
            taskTitle: lockedTask.title,
          });
        }

        return success(
          res,
          { assignedTask, selectedApplication: application, escrow },
          'Manual match completed successfully.'
        );
      } catch (txErr) {
        try { await client.query('ROLLBACK'); } catch {}
        throw txErr;
      } finally {
        client.release();
      }
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
