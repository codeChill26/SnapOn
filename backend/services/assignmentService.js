const withDbTx = require('../utils/withDbTx');
const assignedTaskModel = require('../models/assignedTaskModel');
const taskModel = require('../models/taskModel');
const taskApplicationModel = require('../models/taskApplicationModel');
const escrowService = require('./escrowService');
const { TASK_STATUS, APPLICATION_STATUS } = require('../utils/constants');

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Assignment Service — transactional lifecycle of an assigned task.
 * Controllers stay thin: validate request → call service → respond + emit.
 */
const assignmentService = {
  /**
   * Worker accepts the job assignment (ASSIGNED → IN_PROGRESS).
   * Task flips to IN_PROGRESS when hiring quota is met.
   */
  async accept({ assignmentId, userId }) {
    return withDbTx(async (client) => {
      const assignment = await assignedTaskModel.findById(assignmentId, client);
      if (!assignment) throw httpError('Không tìm thấy thông tin giao việc.', 404);

      if (assignment.tasker_id !== userId) {
        throw httpError('Bạn không thể chấp nhận công việc này.', 403);
      }
      if (assignment.status !== 'ASSIGNED') {
        throw httpError(`Trạng thái công việc không hợp lệ: ${assignment.status}`, 400);
      }

      // Re-verify the active jobs limit (max 3 concurrent IN_PROGRESS)
      const activeJobsCount = await assignedTaskModel.countActiveByTaskerId(userId, client);
      if (activeJobsCount >= 3) {
        throw httpError('Bạn không thể nhận thêm việc vì đang làm 3 hoặc nhiều hơn công việc cùng lúc.', 400);
      }

      await assignedTaskModel.updateStatus(assignmentId, 'IN_PROGRESS', client);

      // Task flips to IN_PROGRESS when hiring quota (people_needed) is met
      const task = await taskModel.findById(assignment.task_id);
      if (task && task.status === TASK_STATUS.OPEN) {
        const activeAssignments = await assignedTaskModel.findListByTaskId(task.id, client);
        const inProgressCount = activeAssignments.filter(a => a.status === 'IN_PROGRESS').length;
        const peopleNeeded = task.people_needed || 1;
        if (inProgressCount >= peopleNeeded) {
          await taskModel.updateStatus(assignment.task_id, TASK_STATUS.IN_PROGRESS, client);
        }
      }

      return { assignment, task };
    });
  },

  /**
   * Worker declines the assignment (ASSIGNED → CANCELLED).
   * Application rejected + escrow refunded so poster can pick someone else.
   */
  async decline({ assignmentId, userId }) {
    return withDbTx(async (client) => {
      const assignment = await assignedTaskModel.findById(assignmentId, client);
      if (!assignment) throw httpError('Không tìm thấy thông tin giao việc.', 404);

      if (assignment.tasker_id !== userId) {
        throw httpError('Bạn không thể từ chối công việc này.', 403);
      }
      if (assignment.status !== 'ASSIGNED') {
        throw httpError(`Trạng thái công việc không hợp lệ: ${assignment.status}`, 400);
      }

      await assignedTaskModel.updateStatus(assignmentId, 'CANCELLED', client);

      if (assignment.application_id) {
        await taskApplicationModel.updateStatus(assignment.application_id, APPLICATION_STATUS.REJECTED, client);
      }

      // Refund escrow so poster's funds are released and they can accept another worker
      await escrowService.refundForTasker(assignment.task_id, assignment.tasker_id, client);

      return { assignment };
    });
  },

  /**
   * Worker báo "Đã hoàn thành" (IN_PROGRESS → SUBMITTED).
   * Bật đồng hồ auto-release 72h trên escrow. KHÔNG nhả tiền.
   */
  async submit({ assignmentId, userId }) {
    return withDbTx(async (client) => {
      const assignment = await assignedTaskModel.findById(assignmentId, client);
      if (!assignment) throw httpError('Không tìm thấy thông tin giao việc.', 404);

      if (assignment.tasker_id !== userId) {
        throw httpError('Bạn không có quyền thực hiện hành động này.', 403);
      }
      if (assignment.status !== 'IN_PROGRESS') {
        throw httpError('Chỉ có thể báo hoàn thành công việc đang thực hiện.', 400);
      }

      await assignedTaskModel.updateStatus(assignmentId, 'SUBMITTED', client);
      await assignedTaskModel.markSubmittedAt(assignmentId, client);

      const escrow = await escrowService.startAutoReleaseForTasker(
        assignment.task_id,
        assignment.tasker_id,
        client
      );

      return { assignment, escrow };
    });
  },

  /**
   * Poster nghiệm thu (IN_PROGRESS/SUBMITTED → COMPLETED) → NHẢ escrow.
   * Task COMPLETED khi không còn assignment hoạt động.
   */
  async complete({ assignmentId, userId }) {
    return withDbTx(async (client) => {
      const assignment = await assignedTaskModel.findById(assignmentId, client);
      if (!assignment) throw httpError('Không tìm thấy thông tin giao việc.', 404);

      const task = await taskModel.findById(assignment.task_id);
      if (!task) throw httpError('Không tìm thấy công việc tương ứng.', 404);

      if (task.poster_id !== userId) {
        throw httpError('Bạn không có quyền thực hiện hành động này.', 403);
      }

      // Nghiệm thu khi worker đã báo xong (SUBMITTED), hoặc nghiệm thu sớm
      // khi đang IN_PROGRESS (poster tự nguyện nhả tiền)
      if (!['IN_PROGRESS', 'SUBMITTED'].includes(assignment.status)) {
        throw httpError('Chỉ có thể nghiệm thu công việc đang thực hiện hoặc đã báo hoàn thành.', 400);
      }

      await assignedTaskModel.updateStatus(assignmentId, 'COMPLETED', client);

      // Task COMPLETED nếu không còn assignment hoạt động; release escrow từng người
      const allAssignments = await assignedTaskModel.findListByTaskId(task.id, client);
      const activeOrAssigned = allAssignments.filter(a => ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED'].includes(a.status));

      if (activeOrAssigned.length === 0) {
        await taskModel.updateStatus(task.id, TASK_STATUS.COMPLETED, client);

        const completedAssignments = allAssignments.filter(a => a.status === 'COMPLETED');
        for (const assoc of completedAssignments) {
          await escrowService.releaseForTasker(task.id, assoc.tasker_id, client);
        }
      }

      return { assignment, task };
    });
  },

  /**
   * Poster hủy giao việc (ASSIGNED/IN_PROGRESS → CANCELLED) → hoàn escrow.
   * Task quay về OPEN nếu không còn assignment hoạt động.
   */
  async cancel({ assignmentId, userId }) {
    return withDbTx(async (client) => {
      const assignment = await assignedTaskModel.findById(assignmentId, client);
      if (!assignment) throw httpError('Không tìm thấy thông tin giao việc.', 404);

      const task = await taskModel.findById(assignment.task_id);
      if (!task) throw httpError('Không tìm thấy công việc tương ứng.', 404);

      if (task.poster_id !== userId) {
        throw httpError('Bạn không có quyền thực hiện hành động này.', 403);
      }
      if (!['ASSIGNED', 'IN_PROGRESS'].includes(assignment.status)) {
        throw httpError('Chỉ có thể hủy công việc chưa làm hoặc đang làm.', 400);
      }

      await assignedTaskModel.updateStatus(assignmentId, 'CANCELLED', client);

      // Refund escrow for this specific tasker
      await escrowService.refundForTasker(task.id, assignment.tasker_id, client);

      // Task về OPEN nếu không còn assignment hoạt động
      const allAssignments = await assignedTaskModel.findListByTaskId(task.id, client);
      const activeOrAssigned = allAssignments.filter(a => ['ASSIGNED', 'IN_PROGRESS'].includes(a.status));

      if (activeOrAssigned.length === 0 && task.status === TASK_STATUS.IN_PROGRESS) {
        await taskModel.updateStatus(task.id, TASK_STATUS.OPEN, client);
      }

      return { assignment, task };
    });
  },
};

module.exports = assignmentService;
