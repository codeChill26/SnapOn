const taskApplicationModel = require('../models/taskApplicationModel');
const taskModel = require('../models/taskModel');
const walletService = require('../services/walletService');
const taskerProfileModel = require('../models/taskerProfileModel');
const assignedTaskModel = require('../models/assignedTaskModel');
const escrowService = require('../services/escrowService');
const pool = require('../config/db');
const { success, error, paginated } = require('../utils/responseHandler');
const { TASK_STATUS, APPLICATION_STATUS, ASSIGNED_BY } = require('../utils/constants');
const { toDbTaskStatus, toDbApplicationStatus, toDbAssignedTaskStatus } = require('../utils/dbEnum');

/**
 * Application Controller — Handles bidding operations
 */
const applicationController = {
  /**
   * POST /api/tasks/:taskId/applications
   * Tasker creates a bid on a task
   */
  async createApplication(req, res) {
    const client = await pool.connect();
    try {
      const { taskId } = req.params;
      const taskerId = req.user.id;
      const { bid_price, estimated_time, message } = req.body;

      await client.query('BEGIN');

      // 1. Lock task row
      const lockedTaskRes = await client.query(
        'SELECT * FROM tasks WHERE id = $1 FOR UPDATE',
        [taskId]
      );
      const dbTask = lockedTaskRes.rows[0];
      if (!dbTask) {
        await client.query('ROLLBACK');
        return error(res, 'Task not found.', 404);
      }
      
      const { fromDbTaskStatus } = require('../utils/dbEnum');
      const task = {
        ...dbTask,
        status: fromDbTaskStatus(dbTask.status),
      };

      if (task.status !== TASK_STATUS.OPEN) {
        await client.query('ROLLBACK');
        return error(res, 'This task is no longer accepting applications.', 400);
      }

      // 2. Lock and check assignments
      const assignments = await assignedTaskModel.findListByTaskId(taskId, client);
      const hasActiveAssignment = assignments.some(a => ['ASSIGNED', 'IN_PROGRESS'].includes(a.status));
      if (hasActiveAssignment) {
        await client.query('ROLLBACK');
        return error(res, 'Công việc này đã chọn được người làm và không nhận thêm ứng tuyển mới.', 400);
      }

      // 3. Check tasker is not the poster
      if (task.poster_id === taskerId) {
        await client.query('ROLLBACK');
        return error(res, 'You cannot bid on your own task.', 400);
      }

      // 4. Check tasker hasn't already applied
      const existingApplication = await taskApplicationModel.findByTaskerAndTask(taskerId, taskId, client);
      if (existingApplication) {
        await client.query('ROLLBACK');
        return error(res, 'You have already applied to this task.', 409);
      }

      // Check active jobs count limit (max 3 concurrent IN_PROGRESS)
      const activeJobsCount = await assignedTaskModel.countActiveByTaskerId(taskerId, client);
      if (activeJobsCount >= 3) {
        await client.query('ROLLBACK');
        return error(res, 'Bạn không thể ứng tuyển thêm công việc mới vì hiện tại bạn đang có 3 hoặc nhiều hơn công việc ở trạng thái đang làm.', 400);
      }

      // 5. Check bid_price boundaries only if provided
      if (bid_price !== undefined && bid_price !== null) {
        if (task.budget_max !== null && task.budget_max !== undefined && parseFloat(bid_price) > parseFloat(task.budget_max)) {
          await client.query('ROLLBACK');
          return error(
            res,
            `Bid price cannot exceed the maximum budget of ${task.budget_max}.`,
            400
          );
        }

        if (task.budget_min !== null && task.budget_min !== undefined && parseFloat(bid_price) < parseFloat(task.budget_min)) {
          await client.query('ROLLBACK');
          return error(
            res,
            `Bid price cannot be less than the minimum budget of ${task.budget_min}.`,
            400
          );
        }
      }

      // 6. Auto-create a minimal tasker profile if the worker doesn't have one yet.
      await taskerProfileModel.createIfNotExists(taskerId, client);

      // 7. Create the application
      const application = await taskApplicationModel.create({
        taskId,
        taskerId,
        bidPrice: bid_price !== undefined ? bid_price : null,
        estimatedTime: estimated_time || null,
        message: message || null,
      }, client);

      await client.query('COMMIT');

      // Broadcast new application via Socket.io to the task poster (outside transaction)
      const io = req.app.get('io');
      if (io) {
        io.to(task.poster_id).emit('application_joined', {
          taskId,
          taskTitle: task.title,
          taskerId,
          taskerName: req.user.fullName,
        });
      }

      return success(res, application, 'Application submitted successfully.', 201);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Create application error:', err);
      return error(res, 'Failed to submit application.', 500);
    } finally {
      client.release();
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
                u.full_name AS tasker_name, u.avatar_url AS tasker_avatar,
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

      // Count total
      const countRes = await pool.query(
        'SELECT COUNT(*) as total FROM task_applications WHERE tasker_id = $1',
        [taskerId]
      );
      const total = parseInt(countRes.rows[0].total);

      // Paginated query
      const result = await pool.query(
        `SELECT ta.*,
                t.title        AS task_title,
                t.status       AS task_status,
                t.post_type    AS task_post_type,
                t.salary_unit  AS task_salary_unit,
                t.budget_min,
                t.budget_max,
                t.deadline_end,
                u.full_name    AS tasker_name,
                u.avatar_url   AS tasker_avatar,
                at.id          AS assignment_id,
                at.status      AS assignment_status
         FROM task_applications ta
         JOIN tasks             t  ON ta.task_id  = t.id
         JOIN users             u  ON ta.tasker_id = u.id
         LEFT JOIN assigned_tasks at ON at.application_id = ta.id
         WHERE ta.tasker_id = $1
         ORDER BY t.created_at DESC
         LIMIT $2 OFFSET $3`,
        [taskerId, currentLimit, offset]
      );

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

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Lock task row
        const lockedTaskRes = await client.query(
          'SELECT * FROM tasks WHERE id = $1 FOR UPDATE',
          [task.id]
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

        // Lock application row
        const appRes = await client.query(
          'SELECT * FROM task_applications WHERE id = $1 FOR UPDATE',
          [id]
        );
        const lockedApp = appRes.rows[0];
        if (!lockedApp) {
          const e = new Error('Application not found.');
          e.statusCode = 404;
          throw e;
        }
        if (lockedApp.status !== toDbApplicationStatus(APPLICATION_STATUS.PENDING)) {
          const e = new Error('Application is no longer pending.');
          e.statusCode = 409;
          throw e;
        }

        // Check if the same worker is already assigned to this task (not cancelled status)
        const dbCancelledStatus = toDbAssignedTaskStatus('CANCELLED');
        const existingAssignmentRes = await client.query(
          'SELECT id FROM assigned_tasks WHERE task_id = $1 AND tasker_id = $2 AND status != $3 FOR UPDATE',
          [task.id, lockedApp.tasker_id, dbCancelledStatus]
        );
        if (existingAssignmentRes.rows.length > 0) {
          const e = new Error('Người dùng này đã được giao công việc này.');
          e.statusCode = 409;
          throw e;
        }

        // Escrow price selection: bid_price or budget_max
        const escrowAmount = lockedApp.bid_price !== null && lockedApp.bid_price !== undefined
          ? parseFloat(lockedApp.bid_price)
          : parseFloat(lockedTask.budget_max);

        if (isNaN(escrowAmount) || escrowAmount <= 0) {
          const e = new Error('Invalid match amount / task budget.');
          e.statusCode = 400;
          throw e;
        }

        const { escrow } = await escrowService.holdForMatch(
          {
            taskId: task.id,
            posterId: lockedTask.poster_id,
            taskerId: lockedApp.tasker_id,
            amount: escrowAmount,
          },
          client
        );

        const assignedTask = await assignedTaskModel.create(
          {
            taskId: task.id,
            taskerId: lockedApp.tasker_id,
            applicationId: id,
            assignedBy: ASSIGNED_BY.MANUAL,
          },
          client
        );

        // Keep task status as OPEN (do not transition to IN_PROGRESS yet)
        await taskModel.updateFinalPrice(task.id, escrowAmount, client);

        await taskApplicationModel.updateStatus(id, APPLICATION_STATUS.ACCEPTED, client);
        // Do NOT reject other applicants yet, keeping them pending.

        await client.query('COMMIT');

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
        try { await client.query('ROLLBACK'); } catch {}
        throw txErr;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Update application status error:', err);
      const status = err.statusCode || 500;
      const message = err.message || 'Failed to update application status.';
      return error(res, message, status);
    }
  },
};

module.exports = applicationController;
