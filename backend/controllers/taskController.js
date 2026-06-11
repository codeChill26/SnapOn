const taskModel = require('../models/taskModel');
const escrowService = require('../services/escrowService');
const pool = require('../config/db');
const { success, error, paginated } = require('../utils/responseHandler');
const { TASK_STATUS } = require('../utils/constants');
const { fromDbTaskStatus } = require('../utils/dbEnum');

/**
 * Task Controller — Handles task CRUD operations
 */
const taskController = {
  /**
   * POST /api/tasks
   * Create a new task (Poster only)
   */
  async createTask(req, res) {
    try {
      const posterId = req.user.id;
      const {
        title,
        description,
        category_id,
        task_type,
        budget_min,
        budget_max,
        deadline_start,
        deadline_end,
        allow_insurance,
        skill_ids,
        location,
      } = req.body;

      // Support slug-to-UUID lookup if category_id is a slug
      let finalCategoryId = category_id;
      if (category_id && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(category_id)) {
        const catRes = await pool.query('SELECT id FROM categories WHERE slug = $1', [category_id]);
        if (catRes.rows[0]) {
          finalCategoryId = catRes.rows[0].id;
        }
      }

      // 1. Create the task
      const task = await taskModel.create({
        posterId,
        categoryId: finalCategoryId,
        title,
        description,
        taskType: task_type,
        budgetMin: budget_min,
        budgetMax: budget_max,
        deadlineStart: deadline_start || null,
        deadlineEnd: deadline_end || null,
        allowInsurance: allow_insurance || false,
      });

      // 2. Add required skills (if provided)
      if (skill_ids && skill_ids.length > 0) {
        await taskModel.addRequiredSkills(task.id, skill_ids);
      }

      // 3. Add location (if provided)
      if (location && location.address) {
        await taskModel.addLocation(task.id, {
          locationType: location.location_type || 'TASK_LOCATION',
          address: location.address,
          latitude: location.latitude || null,
          longitude: location.longitude || null,
        });
      }

      // 4. Fetch the complete task with all relations
      const fullTask = await taskModel.findById(task.id);

      return success(res, fullTask, 'Task created successfully.', 201);
    } catch (err) {
      console.error('Create task error:', err);
      return error(res, 'Failed to create task.', 500);
    }
  },

  /**
   * GET /api/tasks
   * List all tasks with filters and pagination
   */
  async getTasks(req, res) {
    try {
      const { status, category_id, task_type, search, page, limit } = req.query;

      const result = await taskModel.findAll({
        status,
        categoryId: category_id,
        taskType: task_type,
        search,
        page: parseInt(page) || undefined,
        limit: parseInt(limit) || undefined,
      });

      return paginated(res, result.tasks, result.pagination, 'Tasks retrieved successfully.');
    } catch (err) {
      console.error('Get tasks error:', err);
      return error(res, 'Failed to retrieve tasks.', 500);
    }
  },

  /**
   * GET /api/tasks/my-tasks
   * Get tasks created by the current user (Poster)
   */
  async getMyTasks(req, res) {
    try {
      const posterId = req.user.id;
      const { page, limit } = req.query;

      const result = await taskModel.findByPosterId(posterId, {
        page: parseInt(page) || undefined,
        limit: parseInt(limit) || undefined,
      });

      return paginated(res, result.tasks, result.pagination, 'My tasks retrieved successfully.');
    } catch (err) {
      console.error('Get my tasks error:', err);
      return error(res, 'Failed to retrieve your tasks.', 500);
    }
  },

  /**
   * GET /api/tasks/:id
   * Get task details by ID
   */
  async getTaskById(req, res) {
    try {
      const { id } = req.params;

      const task = await taskModel.findById(id);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }

      return success(res, task, 'Task retrieved successfully.');
    } catch (err) {
      console.error('Get task by ID error:', err);
      return error(res, 'Failed to retrieve task.', 500);
    }
  },

  /**
   * PATCH /api/tasks/:id/status
   * Update task status (Poster only — owner check)
   */
  async updateTaskStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

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

        await client.query('COMMIT');
      } catch (txErr) {
        try { await client.query('ROLLBACK'); } catch {}
        throw txErr;
      } finally {
        client.release();
      }

      const updatedTask = await taskModel.findById(id);
      return success(res, updatedTask, `Task status updated to ${status}.`);
    } catch (err) {
      console.error('Update task status error:', err);
      const statusCode = err.statusCode || 500;
      return error(res, err.message || 'Failed to update task status.', statusCode);
    }
  },

  /**
   * PATCH /api/tasks/:id
   * Update task details (Poster only — owner check)
   */
  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const {
        title,
        description,
        category_id,
        task_type,
        budget_min,
        budget_max,
        deadline_start,
        deadline_end,
        allow_insurance,
      } = req.body;

      // 1. Check task exists
      const task = await taskModel.findById(id);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }

      // 2. Check ownership
      if (task.poster_id !== userId) {
        return error(res, 'You can only update your own tasks.', 403);
      }

      // 3. Check status is OPEN (cannot update tasks once matched or completed)
      if (task.status !== TASK_STATUS.OPEN) {
        return error(res, 'You can only update open tasks.', 400);
      }

      // Resolve category UUID if slug is sent
      let finalCategoryId = category_id;
      if (category_id && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(category_id)) {
        const catRes = await pool.query('SELECT id FROM categories WHERE slug = $1', [category_id]);
        if (catRes.rows[0]) {
          finalCategoryId = catRes.rows[0].id;
        }
      }

      // 4. Perform update
      const updatedTask = await taskModel.update(id, {
        categoryId: finalCategoryId,
        title,
        description,
        taskType: task_type,
        budgetMin: budget_min,
        budgetMax: budget_max,
        deadlineStart: deadline_start,
        deadlineEnd: deadline_end,
        allowInsurance: allow_insurance,
      });

      return success(res, updatedTask, 'Task updated successfully.');
    } catch (err) {
      console.error('Update task error:', err);
      return error(res, 'Failed to update task.', 500);
    }
  },

  /**
   * DELETE /api/tasks/:id
   * Delete a task (Poster only — owner check)
   */
  async deleteTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // 1. Check task exists
      const task = await taskModel.findById(id);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }

      // 2. Check ownership
      if (task.poster_id !== userId) {
        return error(res, 'You can only delete your own tasks.', 403);
      }

      // 3. Check status is OPEN (cannot delete in-progress/completed tasks)
      if (task.status !== TASK_STATUS.OPEN) {
        return error(res, 'You can only delete open tasks.', 400);
      }

      // 4. Perform delete
      await taskModel.delete(id);

      return success(res, null, 'Task deleted successfully.');
    } catch (err) {
      console.error('Delete task error:', err);
      return error(res, 'Failed to delete task.', 500);
    }
  },
};

module.exports = taskController;
