const assignmentService = require('../services/assignmentService');
const taskModel = require('../models/taskModel');
const { success, error } = require('../utils/responseHandler');

/**
 * Assignment Controller — thin layer: validate → assignmentService → respond + emit.
 * All transactional logic lives in services/assignmentService.js.
 */
const assignmentController = {
  /**
   * PATCH /api/assignments/:id/accept
   * Worker accepts the job assignment
   */
  async acceptAssignment(req, res) {
    try {
      const { assignment, task } = await assignmentService.accept({
        assignmentId: req.params.id,
        userId: req.user.id,
      });

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
      console.error('Accept assignment error:', err);
      return error(res, err.statusCode ? err.message : 'Chấp nhận công việc thất bại.', err.statusCode || 500);
    }
  },

  /**
   * PATCH /api/assignments/:id/decline
   * Worker declines the job assignment
   */
  async declineAssignment(req, res) {
    try {
      const { assignment } = await assignmentService.decline({
        assignmentId: req.params.id,
        userId: req.user.id,
      });

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
      console.error('Decline assignment error:', err);
      return error(res, err.statusCode ? err.message : 'Từ chối nhận công việc thất bại.', err.statusCode || 500);
    }
  },

  /**
   * PATCH /api/assignments/:id/submit
   * Worker báo "Đã hoàn thành" → bật đồng hồ auto-release 72h.
   * KHÔNG nhả tiền — chờ poster nghiệm thu (hoặc tự nhả sau 72h).
   */
  async submitAssignment(req, res) {
    try {
      const { assignment, escrow } = await assignmentService.submit({
        assignmentId: req.params.id,
        userId: req.user.id,
      });

      // Notify poster
      const task = await taskModel.findById(assignment.task_id);
      const io = req.app.get('io');
      if (io && task) {
        io.to(task.poster_id).emit('assignment_submitted', {
          taskId: task.id,
          taskTitle: task.title,
          taskerName: assignment.tasker_name,
          message: `"${assignment.tasker_name}" đã báo hoàn thành công việc "${task.title}". Vui lòng nghiệm thu trong 72 giờ (quá hạn hệ thống sẽ tự động giải ngân).`,
        });
      }

      return success(
        res,
        { autoReleaseAt: escrow ? escrow.auto_release_at : null },
        'Đã báo hoàn thành. Chờ chủ công việc nghiệm thu (tự động giải ngân sau 72 giờ).'
      );
    } catch (err) {
      console.error('Submit assignment error:', err);
      return error(res, err.statusCode ? err.message : 'Báo hoàn thành thất bại.', err.statusCode || 500);
    }
  },

  /**
   * PATCH /api/assignments/:id/complete
   * Poster nghiệm thu → nhả tiền ký quỹ cho worker
   */
  async completeAssignment(req, res) {
    try {
      const { assignment, task } = await assignmentService.complete({
        assignmentId: req.params.id,
        userId: req.user.id,
      });

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
      console.error('Complete assignment error:', err);
      return error(res, err.statusCode ? err.message : 'Xác nhận hoàn thành thất bại.', err.statusCode || 500);
    }
  },

  /**
   * PATCH /api/assignments/:id/cancel
   * Poster cancels the worker's assignment
   */
  async cancelAssignment(req, res) {
    try {
      const { assignment, task } = await assignmentService.cancel({
        assignmentId: req.params.id,
        userId: req.user.id,
      });

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
      console.error('Cancel assignment error:', err);
      return error(res, err.statusCode ? err.message : 'Hủy công việc thất bại.', err.statusCode || 500);
    }
  },
};

module.exports = assignmentController;
