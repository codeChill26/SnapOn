const withDbTx = require('../utils/withDbTx');
const taskApplicationModel = require('../models/taskApplicationModel');
const taskerProfileModel = require('../models/taskerProfileModel');
const assignedTaskModel = require('../models/assignedTaskModel');
const { TASK_STATUS } = require('../utils/constants');
const { fromDbTaskStatus } = require('../utils/dbEnum');

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Application Service — transactional bidding operations
 */
const applicationService = {
  /**
   * Tasker creates a bid on a task. Locks the task row and validates:
   * OPEN status, no active assignment, not self-bid, no duplicate,
   * max-3-concurrent-jobs, bid within budget bounds.
   */
  async createApplication({ taskId, taskerId, bidPrice, estimatedTime, message }) {
    return withDbTx(async (client) => {
      // 1. Lock task row
      const lockedTaskRes = await client.query(
        'SELECT * FROM tasks WHERE id = $1 FOR UPDATE',
        [taskId]
      );
      const dbTask = lockedTaskRes.rows[0];
      if (!dbTask) throw httpError('Task not found.', 404);

      const task = { ...dbTask, status: fromDbTaskStatus(dbTask.status) };

      if (task.status !== TASK_STATUS.OPEN) {
        throw httpError('This task is no longer accepting applications.', 400);
      }

      // 2. Check assignments — task already picked a worker?
      const assignments = await assignedTaskModel.findListByTaskId(taskId, client);
      const hasActiveAssignment = assignments.some(a => ['ASSIGNED', 'IN_PROGRESS'].includes(a.status));
      if (hasActiveAssignment) {
        throw httpError('Công việc này đã chọn được người làm và không nhận thêm ứng tuyển mới.', 400);
      }

      // 3. Tasker is not the poster
      if (task.poster_id === taskerId) {
        throw httpError('You cannot bid on your own task.', 400);
      }

      // 4. No duplicate application
      const existingApplication = await taskApplicationModel.findByTaskerAndTask(taskerId, taskId, client);
      if (existingApplication) {
        throw httpError('You have already applied to this task.', 409);
      }

      // Max 3 concurrent IN_PROGRESS jobs
      const activeJobsCount = await assignedTaskModel.countActiveByTaskerId(taskerId, client);
      if (activeJobsCount >= 3) {
        throw httpError('Bạn không thể ứng tuyển thêm công việc mới vì hiện tại bạn đang có 3 hoặc nhiều hơn công việc ở trạng thái đang làm.', 400);
      }

      // 5. Bid price within budget bounds (if provided)
      if (bidPrice !== undefined && bidPrice !== null) {
        if (task.budget_max !== null && task.budget_max !== undefined && parseFloat(bidPrice) > parseFloat(task.budget_max)) {
          throw httpError(`Bid price cannot exceed the maximum budget of ${task.budget_max}.`, 400);
        }
        if (task.budget_min !== null && task.budget_min !== undefined && parseFloat(bidPrice) < parseFloat(task.budget_min)) {
          throw httpError(`Bid price cannot be less than the minimum budget of ${task.budget_min}.`, 400);
        }
      }

      // 6. Auto-create a minimal tasker profile if missing
      await taskerProfileModel.createIfNotExists(taskerId, client);

      // 7. Create the application
      const application = await taskApplicationModel.create({
        taskId,
        taskerId,
        bidPrice: bidPrice !== undefined ? bidPrice : null,
        estimatedTime: estimatedTime || null,
        message: message || null,
      }, client);

      return { application, task };
    });
  },
};

module.exports = applicationService;
