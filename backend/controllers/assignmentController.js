const assignedTaskModel = require('../models/assignedTaskModel');
const taskModel = require('../models/taskModel');
const taskApplicationModel = require('../models/taskApplicationModel');
const escrowService = require('../services/escrowService');
const pool = require('../config/db');
const { success, error } = require('../utils/responseHandler');
const { TASK_STATUS, APPLICATION_STATUS } = require('../utils/constants');

const assignmentController = {
  /**
   * PATCH /api/assignments/:id/accept
   * Worker accepts the job assignment
   */
  async acceptAssignment(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch assignment
      const assignment = await assignedTaskModel.findById(id, client);
      if (!assignment) {
        await client.query('ROLLBACK');
        return error(res, 'Không tìm thấy thông tin giao việc.', 404);
      }

      // 2. Verify worker
      if (assignment.tasker_id !== userId) {
        await client.query('ROLLBACK');
        return error(res, 'Bạn không thể chấp nhận công việc này.', 403);
      }

      if (assignment.status !== 'ASSIGNED') {
        await client.query('ROLLBACK');
        return error(res, `Trạng thái công việc không hợp lệ: ${assignment.status}`, 400);
      }

      // 3. Re-verify the active jobs limit (max 3 concurrent IN_PROGRESS)
      const activeJobsCount = await assignedTaskModel.countActiveByTaskerId(userId, client);
      if (activeJobsCount >= 3) {
        await client.query('ROLLBACK');
        return error(res, 'Bạn không thể nhận thêm việc vì đang làm 3 hoặc nhiều hơn công việc cùng lúc.', 400);
      }

      // 4. Update assignment to IN_PROGRESS
      await assignedTaskModel.updateStatus(id, 'IN_PROGRESS', client);

      // 5. Update task to IN_PROGRESS if we have met or exceeded the hiring quota (people_needed)
<<<<<<< Updated upstream
<<<<<<< HEAD
      const task = await taskModel.findById(assignment.task_id);
=======
      const task = await taskModel.findBaseById(assignment.task_id, client);
>>>>>>> 87e4b5f29e584af243811f5cf20eea8339a7ec41
=======
      const task = await taskModel.findById(assignment.task_id);
>>>>>>> Stashed changes
      if (task && task.status === TASK_STATUS.OPEN) {
        const activeAssignments = await assignedTaskModel.findListByTaskId(task.id, client);
        const inProgressCount = activeAssignments.filter(a => a.status === 'IN_PROGRESS').length;
        const peopleNeeded = task.people_needed || 1;
        if (inProgressCount >= peopleNeeded) {
          await taskModel.updateStatus(assignment.task_id, TASK_STATUS.IN_PROGRESS, client);
        }
      }

      await client.query('COMMIT');

      // Notify poster via socket
      const io = req.app.get('io');
      if (io && task) {
        io.to(task.poster_id).emit('assignment_accepted', {
          taskId: task.id,
          taskTitle: task.title,
          taskerName: assignment.tasker_name,
        });
      }

      return success(res, null, 'Chấp nhận công việc thành công.');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Accept assignment error:', err);
      return error(res, 'Chấp nhận công việc thất bại.', 500);
    } finally {
      client.release();
    }
  },

  /**
   * PATCH /api/assignments/:id/decline
   * Worker declines the job assignment
   */
  async declineAssignment(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch assignment
      const assignment = await assignedTaskModel.findById(id, client);
      if (!assignment) {
        await client.query('ROLLBACK');
        return error(res, 'Không tìm thấy thông tin giao việc.', 404);
      }

      // 2. Verify worker
      if (assignment.tasker_id !== userId) {
        await client.query('ROLLBACK');
        return error(res, 'Bạn không thể từ chối công việc này.', 403);
      }

      if (assignment.status !== 'ASSIGNED') {
        await client.query('ROLLBACK');
        return error(res, `Trạng thái công việc không hợp lệ: ${assignment.status}`, 400);
      }

      // 3. Update assignment to CANCELLED
      await assignedTaskModel.updateStatus(id, 'CANCELLED', client);

      // 4. Update task application status back to REJECTED or CANCELLED (declined)
      if (assignment.application_id) {
        await taskApplicationModel.updateStatus(assignment.application_id, APPLICATION_STATUS.REJECTED, client);
      }

      await client.query('COMMIT');

      // Notify poster
      const task = await taskModel.findById(assignment.task_id);
      const io = req.app.get('io');
      if (io && task) {
        io.to(task.poster_id).emit('assignment_declined', {
          taskId: task.id,
          taskTitle: task.title,
          taskerName: assignment.tasker_name,
        });
      }

      return success(res, null, 'Đã từ chối nhận công việc.');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Decline assignment error:', err);
      return error(res, 'Từ chối nhận công việc thất bại.', 500);
    } finally {
      client.release();
    }
  },

  /**
   * PATCH /api/assignments/:id/complete
   * Poster completes the worker's assignment
   */
  async completeAssignment(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch assignment
      const assignment = await assignedTaskModel.findById(id, client);
      if (!assignment) {
        await client.query('ROLLBACK');
        return error(res, 'Không tìm thấy thông tin giao việc.', 404);
      }

      // 2. Fetch task
<<<<<<< Updated upstream
<<<<<<< HEAD
      const task = await taskModel.findById(assignment.task_id);
=======
      const task = await taskModel.findBaseById(assignment.task_id, client);
>>>>>>> 87e4b5f29e584af243811f5cf20eea8339a7ec41
=======
      const task = await taskModel.findById(assignment.task_id);
>>>>>>> Stashed changes
      if (!task) {
        await client.query('ROLLBACK');
        return error(res, 'Không tìm thấy công việc tương ứng.', 404);
      }

      // 3. Verify poster
      if (task.poster_id !== userId) {
        await client.query('ROLLBACK');
        return error(res, 'Bạn không có quyền thực hiện hành động này.', 403);
      }

      if (assignment.status !== 'IN_PROGRESS') {
        await client.query('ROLLBACK');
        return error(res, 'Chỉ có thể hoàn thành công việc đang thực hiện.', 400);
      }

      // 4. Update assignment to COMPLETED
      await assignedTaskModel.updateStatus(id, 'COMPLETED', client);

      // Check if all non-cancelled assignments of this task are completed
      const allAssignments = await assignedTaskModel.findListByTaskId(task.id, client);
      const activeOrAssigned = allAssignments.filter(a => ['ASSIGNED', 'IN_PROGRESS'].includes(a.status));
      
      // If there are no more active or pending assignments, we can set the task to COMPLETED
      if (activeOrAssigned.length === 0) {
        await taskModel.updateStatus(task.id, TASK_STATUS.COMPLETED, client);
        // Release escrow: locked_balance → tasker
        await escrowService.releaseForTask(task.id, client);
      }

      await client.query('COMMIT');

      // Notify worker
      const io = req.app.get('io');
      if (io) {
        io.to(assignment.tasker_id).emit('assignment_completed', {
          taskId: task.id,
          taskTitle: task.title,
        });
      }

      return success(res, null, 'Đã hoàn tất công việc cho ứng viên này.');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Complete assignment error:', err);
      return error(res, 'Xác nhận hoàn thành thất bại.', 500);
    } finally {
      client.release();
    }
  },

  /**
   * PATCH /api/assignments/:id/cancel
   * Poster cancels the worker's assignment
   */
  async cancelAssignment(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch assignment
      const assignment = await assignedTaskModel.findById(id, client);
      if (!assignment) {
        await client.query('ROLLBACK');
        return error(res, 'Không tìm thấy thông tin giao việc.', 404);
      }

      // 2. Fetch task
<<<<<<< Updated upstream
<<<<<<< HEAD
      const task = await taskModel.findById(assignment.task_id);
=======
      const task = await taskModel.findBaseById(assignment.task_id, client);
>>>>>>> 87e4b5f29e584af243811f5cf20eea8339a7ec41
=======
      const task = await taskModel.findById(assignment.task_id);
>>>>>>> Stashed changes
      if (!task) {
        await client.query('ROLLBACK');
        return error(res, 'Không tìm thấy công việc tương ứng.', 404);
      }

      // 3. Verify poster
      if (task.poster_id !== userId) {
        await client.query('ROLLBACK');
        return error(res, 'Bạn không có quyền thực hiện hành động này.', 403);
      }

      if (!['ASSIGNED', 'IN_PROGRESS'].includes(assignment.status)) {
        await client.query('ROLLBACK');
        return error(res, 'Chỉ có thể hủy công việc chưa làm hoặc đang làm.', 400);
      }

      // 4. Update assignment to CANCELLED
      await assignedTaskModel.updateStatus(id, 'CANCELLED', client);

      // Check if all non-cancelled assignments of this task are completed/cancelled
      const allAssignments = await assignedTaskModel.findListByTaskId(task.id, client);
      const activeOrAssigned = allAssignments.filter(a => ['ASSIGNED', 'IN_PROGRESS'].includes(a.status));
      
      // If there are no more active assignments, and the task status is IN_PROGRESS, return task to OPEN
      if (activeOrAssigned.length === 0 && task.status === TASK_STATUS.IN_PROGRESS) {
        await taskModel.updateStatus(task.id, TASK_STATUS.OPEN, client);
        // Refund escrow: locked_balance → available_balance
        await escrowService.refundForTask(task.id, client);
      }

      await client.query('COMMIT');

      // Notify worker
      const io = req.app.get('io');
      if (io) {
        io.to(assignment.tasker_id).emit('assignment_cancelled', {
          taskId: task.id,
          taskTitle: task.title,
        });
      }

      return success(res, null, 'Đã hủy công việc cho ứng viên này.');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Cancel assignment error:', err);
      return error(res, 'Hủy công việc thất bại.', 500);
    } finally {
      client.release();
    }
  },
};

module.exports = assignmentController;
