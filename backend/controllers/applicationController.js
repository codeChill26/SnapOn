const taskApplicationModel = require('../models/taskApplicationModel');
const taskModel = require('../models/taskModel');
const assignedTaskModel = require('../models/assignedTaskModel');
const applicationService = require('../services/applicationService');
const escrowService = require('../services/escrowService');
const notificationModel = require('../models/notificationModel');
const { success, error, paginated } = require('../utils/responseHandler');
const { TASK_STATUS, APPLICATION_STATUS, ASSIGNED_BY } = require('../utils/constants');

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

      // Validation + insert run transactionally in applicationService
      const { application, task } = await applicationService.createApplication({
        taskId,
        taskerId,
        bidPrice: bid_price,
        estimatedTime: estimated_time,
        message,
      });

      // Persist + broadcast the notification to the task poster (outside transaction)
      if (task && task.poster_id) {
        try {
          const notif = await notificationModel.create({
            userId: task.poster_id,
            title: 'Ứng viên mới ứng tuyển',
            content: `${req.user.fullName || 'Một ứng viên'} vừa ứng tuyển vào bài đăng "${task.title}". Hãy vào kiểm tra ngay!`,
            type: 'NEW_APPLICATION',
            taskId,
          });

          const io = req.app.get('io');
          if (io) {
            io.to(task.poster_id).emit('new_notification', notif);
            io.to(task.poster_id).emit('application_joined', {
              taskId,
              taskTitle: task.title,
              taskerId,
              taskerName: req.user.fullName,
            });
          }
        } catch (notifErr) {
          console.error('Failed to create notification for application:', notifErr);
        }
      }

      return success(res, application, 'Application submitted successfully.', 201);
    } catch (err) {
      console.error('Create application error:', err);
      return error(res, err.statusCode ? err.message : 'Failed to submit application.', err.statusCode || 500);
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
      const { page = 1, limit = 10 } = req.query;

      const currentPage = Math.max(parseInt(page) || 1, 1);
      const currentLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
      const offset = (currentPage - 1) * currentLimit;

      // Check task exists
      const task = await taskModel.findById(taskId);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }

      // Only the poster can view applications for their task
      if (task.poster_id !== userId) {
        return error(res, 'You can only view applications for your own tasks.', 403);
      }

      const total = await taskApplicationModel.countByTaskId(taskId);
      const rows = await taskApplicationModel.listByTaskWithDetails(taskId, {
        limit: currentLimit,
        offset,
      });

      return paginated(res, rows, {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages: Math.ceil(total / currentLimit)
      }, 'Applications retrieved successfully.');
    } catch (err) {
      console.error('Get applications error:', err);
      return error(res, 'Failed to retrieve applications.', 500);
    }
  },

  /**
   * GET /api/applications/my-applications
   * Tasker (worker) retrieves all their own applications across all tasks.
   * Also exposes `is_busy` flag: true when worker has an ACCEPTED application
   * on a task that is currently IN_PROGRESS — meaning they cannot take new jobs.
   */
  async getMyApplications(req, res) {
    try {
      const taskerId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      const currentPage = Math.max(parseInt(page) || 1, 1);
      const currentLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
      const offset = (currentPage - 1) * currentLimit;

      const total = await taskApplicationModel.countByTaskerId(taskerId);
      const result = { rows: await taskApplicationModel.listByTaskerWithTaskDetails(taskerId, { limit: currentLimit, offset }) };

      const { fromDbApplicationStatus, fromDbAssignedTaskStatus, fromDbTaskStatus } = require('../utils/dbEnum');
      for (const r of result.rows) {
        r.status = fromDbApplicationStatus(r.status);
        r.task_status = fromDbTaskStatus(r.task_status);
        if (r.assignment_status) {
          r.assignment_status = fromDbAssignedTaskStatus(r.assignment_status);
        }
      }

      // Check busy flag
      const allApps = await taskApplicationModel.findByTaskerId(taskerId);
      const isBusy = allApps.some(
        (app) =>
          app.status === APPLICATION_STATUS.ACCEPTED &&
          app.task_status === TASK_STATUS.IN_PROGRESS
      );

      return res.status(200).json({
        success: true,
        message: 'My applications retrieved successfully.',
        data: result.rows,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages: Math.ceil(total / currentLimit)
        },
        is_busy: isBusy,
      });
    } catch (err) {
      console.error('Get my applications error:', err);
      return error(res, 'Failed to retrieve your applications.', 500);
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
        if (task.budget_max !== null && task.budget_max !== undefined && parseFloat(bid_price) > parseFloat(task.budget_max)) {
          return error(res, `Bid price cannot exceed the maximum budget of ${task.budget_max}.`, 400);
        }
        if (task.budget_min !== null && task.budget_min !== undefined && parseFloat(bid_price) < parseFloat(task.budget_min)) {
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

  /**
   * GET /api/tasks/:taskId/my-application
   * Get application of the logged in user for a specific task
   */
  async getMyApplicationForTask(req, res) {
    try {
      const { taskId } = req.params;
      const taskerId = req.user.id;

      const application = await taskApplicationModel.findByTaskerAndTask(taskerId, taskId);
      return success(res, application || null, 'My application retrieved successfully.');
    } catch (err) {
      console.error('Get my application for task error:', err);
      return error(res, 'Failed to retrieve your application.', 500);
    }
  },

  /**
   * PATCH /api/applications/:id/status
   * Accept or Reject an application (Poster only)
   */
  async updateApplicationStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;

      if (!['ACCEPTED', 'REJECTED'].includes(status)) {
        return error(res, 'Status must be ACCEPTED or REJECTED.', 400);
      }

      // 1. Get the application and its task
      const application = await taskApplicationModel.findById(id);
      if (!application) {
        return error(res, 'Application not found.', 404);
      }

      const task = await taskModel.findById(application.task_id);
      if (!task) {
        return error(res, 'Parent task not found.', 404);
      }

      // 2. Verify poster ownership
      if (task.poster_id !== userId) {
        return error(res, 'You can only update applications for your own tasks.', 403);
      }

      if (application.status !== APPLICATION_STATUS.PENDING) {
        return error(res, `Application is already ${application.status}.`, 400);
      }

      // 3. Handle rejection
      if (status === 'REJECTED') {
        const updatedApplication = await taskApplicationModel.updateStatus(id, APPLICATION_STATUS.REJECTED);
        return success(res, updatedApplication, 'Application rejected successfully.');
      }

      // 4. Handle acceptance (performs manual matching and locks escrow)
      if (task.status !== TASK_STATUS.OPEN) {
        return error(res, 'Task is no longer open for matching.', 400);
      }

      // Check if the same worker is already assigned to this task (not cancelled status)
      const alreadyAssigned = await assignedTaskModel.hasActiveForTaskAndTasker(task.id, application.tasker_id);
      if (alreadyAssigned) {
        return error(res, 'Người dùng này đã được giao công việc này.', 409);
      }

      // Escrow price selection: bid_price or budget_max
      const escrowAmount = application.bid_price !== null && application.bid_price !== undefined
        ? parseFloat(application.bid_price)
        : parseFloat(task.budget_max);

      if (isNaN(escrowAmount) || escrowAmount <= 0) {
        return error(res, 'Invalid match amount / task budget.', 400);
      }

      // Two-phase: PENDING_PAYMENT escrow + PayOS link.
      // Application được ACCEPT + assignment được tạo khi thanh toán thành công.
      const pending = await escrowService.createPendingEscrow({
        taskId: task.id,
        posterId: task.poster_id,
        taskerId: application.tasker_id,
        amount: escrowAmount,
        applicationId: id,
        flow: 'ACCEPT',
        assignedBy: ASSIGNED_BY.MANUAL,
        voucherCode: req.body?.voucher_code,
      });

      return success(
        res,
        {
          paymentRequired: true,
          checkoutUrl: pending.checkoutUrl,
          orderCode: pending.orderCode,
          payAmount: pending.payAmount,
          discount: pending.discount,
          expiresAt: pending.expiresAt,
          selectedApplication: application,
          escrow: pending.escrow,
        },
        'Vui lòng thanh toán để xác nhận thuê ứng viên này.'
      );
    } catch (err) {
      console.error('Update application status error:', err);
      const status = err.statusCode || 500;
      const message = err.message || 'Failed to update application status.';
      return error(res, message, status);
    }
  },
};

module.exports = applicationController;
