const assignedTaskModel = require('../models/assignedTaskModel');
const taskModel = require('../models/taskModel');
const taskApplicationModel = require('../models/taskApplicationModel');
const escrowService = require('../services/escrowService');
const pool = require('../config/db');
const { success, error } = require('../utils/responseHandler');
const { TASK_STATUS, APPLICATION_STATUS } = require('../utils/constants');
const withDbTx = require('../utils/withDbTx');

const assignmentController = {
  /**
   * PATCH /api/assignments/:id/accept
   * Worker accepts the job assignment
   */
  async acceptAssignment(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      let taskData = null;
      let assignmentData = null;

      const result = await withDbTx(async (client) => {
        // 1. Fetch assignment
        const assignment = await assignedTaskModel.findById(id, client);
        if (!assignment) {
          return { error: true, status: 404, message: 'Không tìm thấy thông tin giao việc.' };
        }

        // 2. Verify worker
        if (assignment.tasker_id !== userId) {
          return { error: true, status: 403, message: 'Bạn không thể chấp nhận công việc này.' };
        }

        if (assignment.status !== 'ASSIGNED') {
          return { error: true, status: 400, message: `Trạng thái công việc không hợp lệ: ${assignment.status}` };
        }

        // 3. Re-verify the active jobs limit (max 3 concurrent IN_PROGRESS)
        const activeJobsCount = await assignedTaskModel.countActiveByTaskerId(userId, client);
        if (activeJobsCount >= 3) {
          return { error: true, status: 400, message: 'Bạn không thể nhận thêm việc vì đang làm 3 hoặc nhiều hơn công việc cùng lúc.' };
        }

        // 4. Update assignment to IN_PROGRESS
        await assignedTaskModel.updateStatus(id, 'IN_PROGRESS', client);

        // 5. Update task to IN_PROGRESS if we have met or exceeded the hiring quota (people_needed)
        const task = await taskModel.findById(assignment.task_id);
        if (task && task.status === TASK_STATUS.OPEN) {
          const activeAssignments = await assignedTaskModel.findListByTaskId(task.id, client);
          const inProgressCount = activeAssignments.filter(a => a.status === 'IN_PROGRESS').length;
          const peopleNeeded = task.people_needed || 1;
          if (inProgressCount >= peopleNeeded) {
            await taskModel.updateStatus(assignment.task_id, TASK_STATUS.IN_PROGRESS, client);
          }
        }

        taskData = task;
        assignmentData = assignment;
        return { success: true };
      });

      if (result.error) {
        return error(res, result.message, result.status);
      }

      // Notify poster via socket
      const io = req.app.get('io');
      if (io && taskData && assignmentData) {
        io.to(taskData.poster_id).emit('assignment_accepted', {
          taskId: taskData.id,
          taskTitle: taskData.title,
          taskerName: assignmentData.tasker_name,
        });
      }

      return success(res, null, 'Chấp nhận công việc thành công.');
    } catch (err) {
      console.error('Accept assignment error:', err);
      return error(res, 'Chấp nhận công việc thất bại.', 500);
    }
  },

  /**
   * PATCH /api/assignments/:id/decline
   * Worker declines the job assignment
   */
  async declineAssignment(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      let taskData = null;
      let assignmentData = null;

      const result = await withDbTx(async (client) => {
        // 1. Fetch assignment
        const assignment = await assignedTaskModel.findById(id, client);
        if (!assignment) {
          return { error: true, status: 404, message: 'Không tìm thấy thông tin giao việc.' };
        }

        // 2. Verify worker
        if (assignment.tasker_id !== userId) {
          return { error: true, status: 403, message: 'Bạn không thể từ chối công việc này.' };
        }

        if (assignment.status !== 'ASSIGNED') {
          return { error: true, status: 400, message: `Trạng thái công việc không hợp lệ: ${assignment.status}` };
        }

        // 3. Update assignment to CANCELLED
        await assignedTaskModel.updateStatus(id, 'CANCELLED', client);

        // 4. Update task application status back to REJECTED (declined)
        if (assignment.application_id) {
          await taskApplicationModel.updateStatus(assignment.application_id, APPLICATION_STATUS.REJECTED, client);
        }

        // 5. Refund escrow so poster's funds are unlocked and they can accept another worker
        await escrowService.refundForTasker(assignment.task_id, assignment.tasker_id, client);

        assignmentData = assignment;
        return { success: true };
      });

      if (result.error) {
        return error(res, result.message, result.status);
      }

      // Notify poster
      const task = await taskModel.findById(assignmentData.task_id);
      const io = req.app.get('io');
      if (io && task) {
        io.to(task.poster_id).emit('assignment_declined', {
          taskId: task.id,
          taskTitle: task.title,
          taskerName: assignmentData.tasker_name,
        });
      }

      return success(res, null, 'Đã từ chối nhận công việc.');
    } catch (err) {
      console.error('Decline assignment error:', err);
      return error(res, 'Từ chối nhận công việc thất bại.', 500);
    }
  },

  /**
   * PATCH /api/assignments/:id/complete
   * Poster completes the worker's assignment
   */
  async completeAssignment(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      let taskData = null;
      let assignmentData = null;

      const result = await withDbTx(async (client) => {
        // 1. Fetch assignment
        const assignment = await assignedTaskModel.findById(id, client);
        if (!assignment) {
          return { error: true, status: 404, message: 'Không tìm thấy thông tin giao việc.' };
        }

        // 2. Fetch task
        const task = await taskModel.findById(assignment.task_id);
        if (!task) {
          return { error: true, status: 404, message: 'Không tìm thấy công việc tương ứng.' };
        }

        // 3. Verify poster
        if (task.poster_id !== userId) {
          return { error: true, status: 403, message: 'Bạn không có quyền thực hiện hành động này.' };
        }

        if (assignment.status !== 'IN_PROGRESS') {
          return { error: true, status: 400, message: 'Chỉ có thể hoàn thành công việc đang thực hiện.' };
        }

        // 4. Update assignment to COMPLETED
        await assignedTaskModel.updateStatus(id, 'COMPLETED', client);

        // Check if all non-cancelled assignments of this task are completed
        const allAssignments = await assignedTaskModel.findListByTaskId(task.id, client);
        const activeOrAssigned = allAssignments.filter(a => ['ASSIGNED', 'IN_PROGRESS'].includes(a.status));
        
        // If there are no more active or pending assignments, we can set the task to COMPLETED
        if (activeOrAssigned.length === 0) {
          await taskModel.updateStatus(task.id, TASK_STATUS.COMPLETED, client);
          
          // Release escrow only for completed assignments
          const completedAssignments = allAssignments.filter(a => a.status === 'COMPLETED');
          for (const assoc of completedAssignments) {
            await escrowService.releaseForTasker(task.id, assoc.tasker_id, client);
          }
        }

        taskData = task;
        assignmentData = assignment;
        return { success: true };
      });

      if (result.error) {
        return error(res, result.message, result.status);
      }

      // Notify worker
      const io = req.app.get('io');
      if (io && taskData && assignmentData) {
        io.to(assignmentData.tasker_id).emit('assignment_completed', {
          taskId: taskData.id,
          taskTitle: taskData.title,
        });
      }

      return success(res, null, 'Đã hoàn tất công việc cho ứng viên này.');
    } catch (err) {
      console.error('Complete assignment error:', err);
      return error(res, 'Xác nhận hoàn thành thất bại.', 500);
    }
  },

  /**
   * PATCH /api/assignments/:id/cancel
   * Poster cancels the worker's assignment
   */
  async cancelAssignment(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      let taskData = null;
      let assignmentData = null;

      const result = await withDbTx(async (client) => {
        // 1. Fetch assignment
        const assignment = await assignedTaskModel.findById(id, client);
        if (!assignment) {
          return { error: true, status: 404, message: 'Không tìm thấy thông tin giao việc.' };
        }

        // 2. Fetch task
        const task = await taskModel.findById(assignment.task_id);
        if (!task) {
          return { error: true, status: 404, message: 'Không tìm thấy công việc tương ứng.' };
        }

        // 3. Verify poster
        if (task.poster_id !== userId) {
          return { error: true, status: 403, message: 'Bạn không có quyền thực hiện hành động này.' };
        }

        if (!['ASSIGNED', 'IN_PROGRESS'].includes(assignment.status)) {
          return { error: true, status: 400, message: 'Chỉ có thể hủy công việc chưa làm hoặc đang làm.' };
        }

        // 4. Update assignment to CANCELLED
        await assignedTaskModel.updateStatus(id, 'CANCELLED', client);

        // Refund escrow for this specific tasker
        await escrowService.refundForTasker(task.id, assignment.tasker_id, client);

        // Check if all non-cancelled assignments of this task are completed/cancelled
        const allAssignments = await assignedTaskModel.findListByTaskId(task.id, client);
        const activeOrAssigned = allAssignments.filter(a => ['ASSIGNED', 'IN_PROGRESS'].includes(a.status));

        if (activeOrAssigned.length === 0) {
          if (task.status === TASK_STATUS.IN_PROGRESS) {
            await taskModel.updateStatus(task.id, TASK_STATUS.OPEN, client);
          }
        }

        taskData = task;
        assignmentData = assignment;
        return { success: true };
      });

      if (result.error) {
        return error(res, result.message, result.status);
      }

      // Notify worker
      const io = req.app.get('io');
      if (io && taskData && assignmentData) {
        io.to(assignmentData.tasker_id).emit('assignment_cancelled', {
          taskId: taskData.id,
          taskTitle: taskData.title,
        });
      }

      return success(res, null, 'Đã hủy công việc cho ứng viên này.');
    } catch (err) {
      console.error('Cancel assignment error:', err);
      return error(res, 'Hủy công việc thất bại.', 500);
    }
  },
};

module.exports = assignmentController;
