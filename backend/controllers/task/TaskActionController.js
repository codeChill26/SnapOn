const taskModel = require('../../models/taskModel');
const escrowService = require('../../services/escrowService');
const pool = require('../../config/db');
const { success, error } = require('../../utils/responseHandler');
const { TASK_STATUS, APPLICATION_STATUS, ASSIGNED_TASK_STATUS } = require('../../utils/constants');
const { fromDbTaskStatus, toDbApplicationStatus, toDbAssignedTaskStatus } = require('../../utils/dbEnum');
const { invalidateTaskCache } = require('./taskCacheUtil');
const withDbTx = require('../../utils/withDbTx');

const TaskActionController = {
  /**
   * PATCH /api/tasks/:id/status
   * Update task status (Poster only — owner check)
   */
  async updateTaskStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;

      await withDbTx(async (client) => {
        // Lock base task row
        const locked = await client.query(
          'SELECT * FROM tasks WHERE id = $1 FOR UPDATE',
          [id]
        );
        const baseTask = locked.rows[0];
        if (!baseTask) {
          const e = new Error('Task not found.');
          e.statusCode = 404;
          throw e;
        }

        // Check ownership
        if (baseTask.poster_id !== userId) {
          const e = new Error('You can only update your own tasks.');
          e.statusCode = 403;
          throw e;
        }

        const currentStatus = fromDbTaskStatus(baseTask.status);

        // Validate status transition
        const validTransitions = {
          [TASK_STATUS.OPEN]: [TASK_STATUS.CANCELLED],
          [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED],
          [TASK_STATUS.COMPLETED]: [],
          [TASK_STATUS.CANCELLED]: [],
        };

        const allowedStatuses = validTransitions[currentStatus] || [];
        if (!allowedStatuses.includes(status)) {
          const e = new Error(`Cannot transition from ${currentStatus} to ${status}.`);
          e.statusCode = 400;
          throw e;
        }

        await taskModel.updateStatus(id, status, client);

        // Escrow side-effects
        if (currentStatus === TASK_STATUS.IN_PROGRESS && status === TASK_STATUS.COMPLETED) {
          await escrowService.releaseForTask(id, client);
        }
        if (currentStatus === TASK_STATUS.IN_PROGRESS && status === TASK_STATUS.CANCELLED) {
          await escrowService.refundForTask(id, client);
        }
      });

      // Clear task cache
      await invalidateTaskCache(id);

      const updatedTask = await taskModel.findById(id);
      return success(res, updatedTask, `Task status updated to ${status}.`);
    } catch (err) {
      console.error('Update task status error:', err);
      const statusCode = err.statusCode || 500;
      return error(res, err.message || 'Failed to update task status.', statusCode);
    }
  },

  /**
   * PATCH /api/tasks/:id/close-recruitment
   * Close recruitment early for a task (Poster only)
   */
  async closeRecruitment(req, res) {
    try {
      const { id } = req.params;
      const { closed_reason } = req.body;
      const userId = req.user.id;

      const { updatedTask, lockedTask, unstartedAssignments } = await withDbTx(async (client) => {
        // 1. Lock the task row
        const lockedTaskRes = await client.query(
          'SELECT * FROM tasks WHERE id = $1 FOR UPDATE',
          [id]
        );
        const lockedTaskVal = lockedTaskRes.rows[0];
        if (!lockedTaskVal) {
          const e = new Error('Task not found.');
          e.statusCode = 404;
          throw e;
        }

        if (lockedTaskVal.poster_id !== userId) {
          const e = new Error('You can only close recruitment for your own tasks.');
          e.statusCode = 403;
          throw e;
        }

        const currentStatus = fromDbTaskStatus(lockedTaskVal.status);
        if (currentStatus !== TASK_STATUS.OPEN) {
          const e = new Error('You can only close recruitment for open tasks.');
          e.statusCode = 400;
          throw e;
        }

        // 2. Close the task recruitment in DB
        const updatedTaskVal = await taskModel.closeRecruitment(id, userId, closed_reason || null, client);

        // 3. Reject pending applications using dbEnum helpers
        await client.query(
          `UPDATE task_applications 
           SET status = $2, updated_at = CURRENT_TIMESTAMP 
           WHERE task_id = $1 AND status = $3`,
          [id, toDbApplicationStatus(APPLICATION_STATUS.REJECTED), toDbApplicationStatus(APPLICATION_STATUS.PENDING)]
        );

        // 4. Cancel assignments that haven't started yet using dbEnum helpers
        const assignedRes = await client.query(
          `SELECT * FROM assigned_tasks 
           WHERE task_id = $1 AND status = $2 FOR UPDATE`,
          [id, toDbAssignedTaskStatus(ASSIGNED_TASK_STATUS.ASSIGNED)]
        );
        const unstartedAssignmentsVal = assignedRes.rows;

        for (const assoc of unstartedAssignmentsVal) {
          // Cancel assignment using dbEnum helpers
          await client.query(
            `UPDATE assigned_tasks 
             SET status = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [assoc.id, toDbAssignedTaskStatus(ASSIGNED_TASK_STATUS.CANCELLED)]
          );

          // Refund escrow for this tasker
          await escrowService.refundForTasker(id, assoc.tasker_id, client);
        }

        return { updatedTask: updatedTaskVal, lockedTask: lockedTaskVal, unstartedAssignments: unstartedAssignmentsVal };
      });

      // Socket.io & Notifications (outside transaction)
      const io = req.app.get('io');
      if (io) {
        // Notify rejected taskers using dbEnum helpers
        const rejectedAppsRes = await pool.query(
          `SELECT tasker_id FROM task_applications 
           WHERE task_id = $1 AND status = $2`,
          [id, toDbApplicationStatus(APPLICATION_STATUS.REJECTED)]
        );
        for (const row of rejectedAppsRes.rows) {
          io.to(row.tasker_id).emit('application_rejected', {
            taskId: id,
            taskTitle: lockedTask.title,
            reason: closed_reason || 'Recruitment closed by poster.'
          });
        }

        // Notify cancelled taskers
        for (const assoc of unstartedAssignments) {
          io.to(assoc.tasker_id).emit('assignment_cancelled', {
            taskId: id,
            taskTitle: lockedTask.title,
            reason: closed_reason || 'Recruitment closed by poster.'
          });
        }
      }

      // Clear task cache
      await invalidateTaskCache(id);

      return success(res, updatedTask, 'Recruitment closed successfully.');
    } catch (err) {
      console.error('Close recruitment error:', err);
      const statusCode = err.statusCode || 500;
      return error(res, err.message || 'Failed to close recruitment.', statusCode);
    }
  },

  /**
   * POST /api/tasks/:id/save
   * Save a task for the current user
   */
  async saveTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const task = await taskModel.findBaseById(id);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }

      await taskModel.saveForUser(userId, id);

      return success(res, { taskId: id, isSaved: true }, 'Task saved successfully.');
    } catch (err) {
      console.error('Save task error:', err);
      return error(res, 'Failed to save task.', 500);
    }
  },

  /**
   * DELETE /api/tasks/:id/save
   * Remove a saved task for the current user
   */
  async unsaveTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await taskModel.unsaveForUser(userId, id);

      return success(res, { taskId: id, isSaved: false }, 'Task removed from saved list.');
    } catch (err) {
      console.error('Unsave task error:', err);
      return error(res, 'Failed to remove saved task.', 500);
    }
  },
};

module.exports = TaskActionController;
