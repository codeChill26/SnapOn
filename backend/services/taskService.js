const withDbTx = require('../utils/withDbTx');
const taskModel = require('../models/taskModel');
const escrowService = require('./escrowService');
const { TASK_STATUS } = require('../utils/constants');
const { fromDbTaskStatus, toDbAssignedTaskStatus, toDbApplicationStatus } = require('../utils/dbEnum');

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Task Service — transactional task lifecycle operations
 */
const taskService = {
  /**
   * Poster updates task status with transition validation + escrow side-effects.
   *   IN_PROGRESS → COMPLETED : release escrow (nhả tiền cho worker)
   *   IN_PROGRESS → CANCELLED : refund escrow (hoàn cho poster)
   */
  async updateStatus({ taskId, userId, status }) {
    return withDbTx(async (client) => {
      // Lock base task row
      const locked = await client.query(
        'SELECT * FROM tasks WHERE id = $1 FOR UPDATE',
        [taskId]
      );
      const baseTask = locked.rows[0];
      if (!baseTask) throw httpError('Task not found.', 404);

      if (baseTask.poster_id !== userId) {
        throw httpError('You can only update your own tasks.', 403);
      }

      const currentStatus = fromDbTaskStatus(baseTask.status);

      const validTransitions = {
        [TASK_STATUS.OPEN]: [TASK_STATUS.CANCELLED],
        [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED],
        [TASK_STATUS.COMPLETED]: [],
        [TASK_STATUS.CANCELLED]: [],
      };

      const allowedStatuses = validTransitions[currentStatus] || [];
      if (!allowedStatuses.includes(status)) {
        throw httpError(`Cannot transition from ${currentStatus} to ${status}.`, 400);
      }

      await taskModel.updateStatus(taskId, status, client);

      // Escrow side-effects
      if (currentStatus === TASK_STATUS.IN_PROGRESS && status === TASK_STATUS.COMPLETED) {
        await escrowService.releaseForTask(taskId, client);
      }
      if (currentStatus === TASK_STATUS.IN_PROGRESS && status === TASK_STATUS.CANCELLED) {
        await escrowService.refundForTask(taskId, client);
      }

      return { previousStatus: currentStatus };
    });
  },

  /**
   * Poster closes recruitment early:
   * reject pending applications, cancel un-started assignments + refund their escrows.
   * Returns data for post-commit notifications.
   */
  async closeRecruitment({ taskId, userId, closedReason }) {
    return withDbTx(async (client) => {
      // 1. Lock the task row
      const lockedTaskRes = await client.query(
        'SELECT * FROM tasks WHERE id = $1 FOR UPDATE',
        [taskId]
      );
      const lockedTask = lockedTaskRes.rows[0];
      if (!lockedTask) throw httpError('Task not found.', 404);

      if (lockedTask.poster_id !== userId) {
        throw httpError('You can only close recruitment for your own tasks.', 403);
      }

      const currentStatus = fromDbTaskStatus(lockedTask.status);
      if (currentStatus !== TASK_STATUS.OPEN) {
        throw httpError('You can only close recruitment for open tasks.', 400);
      }

      // 2. Close the task recruitment in DB
      const updatedTask = await taskModel.closeRecruitment(taskId, userId, closedReason || null, client);

      // 3. Reject pending applications (RETURNING để chỉ notify người mới bị reject)
      const rejectedRes = await client.query(
        `UPDATE task_applications SET status = $2
         WHERE task_id = $1 AND status = $3
         RETURNING tasker_id`,
        [taskId, toDbApplicationStatus('REJECTED'), toDbApplicationStatus('PENDING')]
      );

      // 4. Cancel assignments that haven't started yet (ASSIGNED) + refund escrow
      const assignedRes = await client.query(
        'SELECT * FROM assigned_tasks WHERE task_id = $1 AND status = $2 FOR UPDATE',
        [taskId, toDbAssignedTaskStatus('ASSIGNED')]
      );
      const unstartedAssignments = assignedRes.rows;

      for (const assoc of unstartedAssignments) {
        await client.query(
          'UPDATE assigned_tasks SET status = $2 WHERE id = $1',
          [assoc.id, toDbAssignedTaskStatus('CANCELLED')]
        );
        await escrowService.refundForTasker(taskId, assoc.tasker_id, client);
      }

      return {
        updatedTask,
        taskTitle: lockedTask.title,
        rejectedTaskerIds: rejectedRes.rows.map(r => r.tasker_id),
        cancelledTaskerIds: unstartedAssignments.map(a => a.tasker_id),
      };
    });
  },
};

module.exports = taskService;
