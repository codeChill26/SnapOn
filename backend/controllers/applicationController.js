const taskApplicationModel = require('../models/taskApplicationModel');
const taskModel = require('../models/taskModel');
const walletService = require('../services/walletService');
const taskerProfileModel = require('../models/taskerProfileModel');
const assignedTaskModel = require('../models/assignedTaskModel');
const notificationModel = require('../models/notificationModel');
const escrowService = require('../services/escrowService');
const pool = require('../config/db');
const { success, error, paginated } = require('../utils/responseHandler');
const { TASK_STATUS, APPLICATION_STATUS, ASSIGNED_BY } = require('../utils/constants');
const { toDbTaskStatus, toDbApplicationStatus, toDbAssignedTaskStatus } = require('../utils/dbEnum');
const withDbTx = require('../utils/withDbTx');

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

      const { application, task } = await withDbTx(async (client) => {
        // 1. Lock task row
        const lockedTaskRes = await client.query(
          'SELECT * FROM tasks WHERE id = $1 FOR UPDATE',
          [taskId]
        );
        const dbTask = lockedTaskRes.rows[0];
        if (!dbTask) {
          const err = new Error('Task not found.');
          err.statusCode = 404;
          throw err;
        }

        const { fromDbTaskStatus } = require('../utils/dbEnum');
        const taskVal = {
          ...dbTask,
          status: fromDbTaskStatus(dbTask.status),
        };

        if (taskVal.status !== TASK_STATUS.OPEN) {
          const err = new Error('This task is no longer accepting applications.');
          err.statusCode = 400;
          throw err;
        }

        // 2. Lock and check assignments
        const assignments = await assignedTaskModel.findListByTaskId(taskId, client);
        const hasActiveAssignment = assignments.some(a => ['ASSIGNED', 'IN_PROGRESS'].includes(a.status));
        if (hasActiveAssignment) {
          const err = new Error('Công việc này đã chọn được người làm và không nhận thêm ứng tuyển mới.');
          err.statusCode = 400;
          throw err;
        }

        // 3. Check tasker is not the poster
        if (taskVal.poster_id === taskerId) {
          const err = new Error('You cannot bid on your own task.');
          err.statusCode = 400;
          throw err;
        }

        // 4. Check tasker hasn't already applied
        const existingApplication = await taskApplicationModel.findByTaskerAndTask(taskerId, taskId, client);
        if (existingApplication) {
          const err = new Error('You have already applied to this task.');
          err.statusCode = 409;
          throw err;
        }

        // Check active jobs count limit (max 3 concurrent IN_PROGRESS)
        const activeJobsCount = await assignedTaskModel.countActiveByTaskerId(taskerId, client);
        if (activeJobsCount >= 3) {
          const err = new Error('Bạn không thể ứng tuyển thêm công việc mới vì hiện tại bạn đang có 3 hoặc nhiều hơn công việc ở trạng thái đang làm.');
          err.statusCode = 400;
          throw err;
        }

        // 5. Check bid_price boundaries only if provided
        if (bid_price !== undefined && bid_price !== null) {
          if (taskVal.budget_max !== null && taskVal.budget_max !== undefined && parseFloat(bid_price) > parseFloat(taskVal.budget_max)) {
            const err = new Error(`Bid price cannot exceed the maximum budget of ${taskVal.budget_max}.`);
            err.statusCode = 400;
            throw err;
          }

          if (taskVal.budget_min !== null && taskVal.budget_min !== undefined && parseFloat(bid_price) < parseFloat(taskVal.budget_min)) {
            const err = new Error(`Bid price cannot be less than the minimum budget of ${taskVal.budget_min}.`);
            err.statusCode = 400;
            throw err;
          }
        }

        // 6. Auto-create a minimal tasker profile if the worker doesn't have one yet.
        await taskerProfileModel.createIfNotExists(taskerId, client);

        // 7. Create the application
        const applicationVal = await taskApplicationModel.create({
          taskId,
          taskerId,
          bidPrice: bid_price !== undefined ? bid_price : null,
          estimatedTime: estimated_time || null,
          message: message || null,
        }, client);

        return { application: applicationVal, task: taskVal };
      });

      // Create notification in DB for the task poster
      if (task && task.poster_id) {
        try {
          const notif = await notificationModel.create({
            userId: task.poster_id,
            title: 'Ứng viên mới ứng tuyển',
            content: `${req.user.fullName || 'Một ứng viên'} vừa ứng tuyển vào bài đăng "${task.title}". Hãy vào kiểm tra ngay!`,
            type: 'NEW_APPLICATION',
            taskId: taskId,
          });

          // Broadcast notification via Socket.io to the task poster
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
      const status = err.statusCode || 500;
      return error(res, err.message || 'Failed to submit application.', status);
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

      // Count total
      const countRes = await pool.query(
        'SELECT COUNT(*) as total FROM task_applications WHERE task_id = $1',
        [taskId]
      );
      const total = parseInt(countRes.rows[0].total);

      // Paginated query
      const result = await pool.query(
        `SELECT ta.*,
                u.full_name AS tasker_name, u.avatar_url AS tasker_avatar, u.phone AS tasker_phone,
                tp.average_rating, tp.bio, tp.location_text,
                at.id AS assignment_id,
                at.status AS assignment_status
         FROM task_applications ta
         JOIN users u ON ta.tasker_id = u.id
         LEFT JOIN tasker_profiles tp ON tp.user_id = ta.tasker_id
         LEFT JOIN assigned_tasks at ON at.application_id = ta.id
         WHERE ta.task_id = $1
         ORDER BY ta.id ASC
         LIMIT $2 OFFSET $3`,
        [taskId, currentLimit, offset]
      );

      const { fromDbApplicationStatus, fromDbAssignedTaskStatus } = require('../utils/dbEnum');
      for (const r of result.rows) {
        r.status = fromDbApplicationStatus(r.status);
        if (r.assignment_status) {
          r.assignment_status = fromDbAssignedTaskStatus(r.assignment_status);
        }
      }

      return paginated(res, result.rows, {
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
   * Get applications submitted by current tasker
   */
  async getMyApplications(req, res) {
    try {
      const taskerId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      const currentPage = Math.max(parseInt(page) || 1, 1);
      const currentLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
      const offset = (currentPage - 1) * currentLimit;

      // Count total
      const countRes = await pool.query(
        'SELECT COUNT(*) as total FROM task_applications WHERE tasker_id = $1',
        [taskerId]
      );
      const total = parseInt(countRes.rows[0].total);

      // Query detailed bids
      const result = await pool.query(
        `SELECT ta.*,
                t.title AS task_title, t.budget_min, t.budget_max, t.status AS task_status,
                t.post_type, t.work_mode, t.salary_unit, t.application_deadline,
                u.full_name AS poster_name, u.avatar_url AS poster_avatar,
                at.id AS assignment_id,
                at.status AS assignment_status
         FROM task_applications ta
         JOIN tasks t ON ta.task_id = t.id
         JOIN users u ON t.poster_id = u.id
         LEFT JOIN assigned_tasks at ON at.application_id = ta.id
         WHERE ta.tasker_id = $1
         ORDER BY t.created_at DESC
         LIMIT $2 OFFSET $3`,
        [taskerId, currentLimit, offset]
      );

      const { fromDbApplicationStatus, fromDbTaskStatus, fromDbAssignedTaskStatus } = require('../utils/dbEnum');
      for (const r of result.rows) {
        r.status = fromDbApplicationStatus(r.status);
        r.task_status = fromDbTaskStatus(r.task_status);
        if (r.assignment_status) {
          r.assignment_status = fromDbAssignedTaskStatus(r.assignment_status);
        }
      }

      return paginated(res, result.rows, {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages: Math.ceil(total / currentLimit)
      }, 'Your applications retrieved successfully.');
    } catch (err) {
      console.error('Get my applications error:', err);
      return error(res, 'Failed to retrieve your applications.', 500);
    }
  },

  /**
   * DELETE /api/applications/:id
   * Tasker withdraws their application (Pending status only)
   */
  async withdrawApplication(req, res) {
    try {
      const { id } = req.params;
      const taskerId = req.user.id;

      // Fetch the application
      const application = await taskApplicationModel.findById(id);
      if (!application) {
        return error(res, 'Application not found.', 404);
      }

      // Check ownership
      if (application.tasker_id !== taskerId) {
        return error(res, 'You can only withdraw your own applications.', 403);
      }

      // Can only withdraw if still pending
      if (application.status !== APPLICATION_STATUS.PENDING) {
        return error(res, `Cannot withdraw an application in ${application.status} status.`, 400);
      }

      await taskApplicationModel.delete(id);

      return success(res, null, 'Application withdrawn successfully.');
    } catch (err) {
      console.error('Withdraw application error:', err);
      return error(res, 'Failed to withdraw application.', 500);
    }
  },

  /**
   * PATCH /api/applications/:id/status
   * Poster updates application status (ACCEPT or REJECT)
   */
  async updateApplicationStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body; // 'ACCEPTED' or 'REJECTED'
      const userId = req.user.id;

      if (!['ACCEPTED', 'REJECTED'].includes(status)) {
        return error(res, 'Invalid status update payload.', 400);
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

      try {
        const { assignedTask, escrow, lockedApp, lockedTask } = await withDbTx(async (client) => {
          // Lock task row
          const lockedTaskRes = await client.query(
            'SELECT * FROM tasks WHERE id = $1 FOR UPDATE',
            [task.id]
          );
          const lockedTaskVal = lockedTaskRes.rows[0];
          if (!lockedTaskVal) {
            const e = new Error('Task not found.');
            e.statusCode = 404;
            throw e;
          }
          if (lockedTaskVal.status !== toDbTaskStatus(TASK_STATUS.OPEN)) {
            const e = new Error('Task is not in OPEN status. Cannot match.');
            e.statusCode = 400;
            throw e;
          }

          // Lock application row
          const appRes = await client.query(
            'SELECT * FROM task_applications WHERE id = $1 FOR UPDATE',
            [id]
          );
          const lockedAppVal = appRes.rows[0];
          if (!lockedAppVal) {
            const e = new Error('Application not found.');
            e.statusCode = 404;
            throw e;
          }
          if (lockedAppVal.status !== toDbApplicationStatus(APPLICATION_STATUS.PENDING)) {
            const e = new Error('Application is no longer pending.');
            e.statusCode = 409;
            throw e;
          }

          // Check if the same worker is already assigned to this task (not cancelled status)
          const dbCancelledStatus = toDbAssignedTaskStatus('CANCELLED');
          const existingAssignmentRes = await client.query(
            'SELECT id FROM assigned_tasks WHERE task_id = $1 AND tasker_id = $2 AND status != $3 FOR UPDATE',
            [task.id, lockedAppVal.tasker_id, dbCancelledStatus]
          );
          if (existingAssignmentRes.rows.length > 0) {
            const e = new Error('Người dùng này đã được giao công việc này.');
            e.statusCode = 409;
            throw e;
          }

          // Escrow price selection: bid_price or budget_max
          const escrowAmount = lockedAppVal.bid_price !== null && lockedAppVal.bid_price !== undefined
            ? parseFloat(lockedAppVal.bid_price)
            : parseFloat(lockedTaskVal.budget_max);

          if (isNaN(escrowAmount) || escrowAmount <= 0) {
            const e = new Error('Invalid match amount / task budget.');
            e.statusCode = 400;
            throw e;
          }

          const { escrow: escrowVal } = await escrowService.holdForMatch(
            {
              taskId: task.id,
              posterId: lockedTaskVal.poster_id,
              taskerId: lockedAppVal.tasker_id,
              amount: escrowAmount,
            },
            client
          );

          const assignedTaskVal = await assignedTaskModel.create(
            {
              taskId: task.id,
              taskerId: lockedAppVal.tasker_id,
              applicationId: id,
              assignedBy: ASSIGNED_BY.MANUAL,
            },
            client
          );

          // Keep task status as OPEN (do not transition to IN_PROGRESS yet)
          await taskModel.updateFinalPrice(task.id, escrowAmount, client);

          await taskApplicationModel.updateStatus(id, APPLICATION_STATUS.ACCEPTED, client);
          // Do NOT reject other applicants yet, keeping them pending.

          return { assignedTask: assignedTaskVal, escrow: escrowVal, lockedApp: lockedAppVal, lockedTask: lockedTaskVal };
        });

        // Broadcast notification via Socket.io
        const io = req.app.get('io');
        if (io) {
          io.to(lockedApp.tasker_id).emit('task_assigned', {
            taskId: task.id,
            taskTitle: lockedTask.title,
          });
        }

        // Lên lịch tự động hủy giao việc sau 15 phút nếu ứng viên không xác nhận nhận việc
        const assignmentExpiryService = require('../services/assignmentExpiryService');
        assignmentExpiryService.setupExpiryTimer(assignedTask.id, io);

        // Fetch complete updated application to return
        const fullApp = await taskApplicationModel.findById(id);

        return success(
          res,
          { assignedTask, selectedApplication: fullApp, escrow },
          'Application accepted and task assigned successfully.'
        );
      } catch (txErr) {
        console.error('Inner accept transaction error:', txErr);
        const status = txErr.statusCode || 500;
        const message = txErr.message || 'Failed to accept application.';
        return error(res, message, status);
      }
    } catch (err) {
      console.error('Update application status error:', err);
      const status = err.statusCode || 500;
      const message = err.message || 'Failed to update application status.';
      return error(res, message, status);
    }
  },

  /**
   * PATCH /api/applications/:id
   * Tasker updates their application details
   */
  async updateApplication(req, res) {
    try {
      const { id } = req.params;
      const taskerId = req.user.id;
      const { bid_price, estimated_time, message } = req.body;

      const application = await taskApplicationModel.findById(id);
      if (!application) {
        return error(res, 'Application not found.', 404);
      }

      if (application.tasker_id !== taskerId) {
        return error(res, 'You can only update your own applications.', 403);
      }

      if (application.status !== APPLICATION_STATUS.PENDING) {
        return error(res, 'Cannot update an application that is no longer pending.', 400);
      }

      const updated = await taskApplicationModel.update(id, {
        bidPrice: bid_price,
        estimatedTime: estimated_time,
        message,
      });

      return success(res, updated, 'Application updated successfully.');
    } catch (err) {
      console.error('Update application error:', err);
      return error(res, 'Failed to update application.', 500);
    }
  },

  /**
   * DELETE /api/applications/:id
   * Tasker deletes their application
   */
  async deleteApplication(req, res) {
    return applicationController.withdrawApplication(req, res);
  },

  /**
   * GET /api/tasks/:taskId/my-application
   * Get current tasker's application for a specific task
   */
  async getMyApplicationForTask(req, res) {
    try {
      const { taskId } = req.params;
      const taskerId = req.user.id;

      const application = await taskApplicationModel.findByTaskerAndTask(taskerId, taskId);
      if (!application) {
        return error(res, 'No application found for this task.', 404);
      }

      return success(res, application, 'Application retrieved successfully.');
    } catch (err) {
      console.error('Get my application for task error:', err);
      return error(res, 'Failed to retrieve application.', 500);
    }
  },
};

module.exports = applicationController;
