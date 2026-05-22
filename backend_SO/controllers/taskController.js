const taskModel = require('../models/taskModel');
const { success, error, paginated } = require('../utils/responseHandler');
const { TASK_STATUS } = require('../utils/constants');

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

      // 1. Create the task
      const task = await taskModel.create({
        posterId,
        categoryId: category_id,
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

      // Find the task
      const task = await taskModel.findById(id);
      if (!task) {
        return error(res, 'Task not found.', 404);
      }

      // Check ownership
      if (task.poster_id !== userId) {
        return error(res, 'You can only update your own tasks.', 403);
      }

      // Validate status transition
      const validTransitions = {
        [TASK_STATUS.OPEN]: [TASK_STATUS.CANCELLED],
        [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED],
        [TASK_STATUS.COMPLETED]: [],
        [TASK_STATUS.CANCELLED]: [],
      };

      const allowedStatuses = validTransitions[task.status] || [];
      if (!allowedStatuses.includes(status)) {
        return error(
          res,
          `Cannot transition from ${task.status} to ${status}.`,
          400
        );
      }

      const updatedTask = await taskModel.updateStatus(id, status);

      return success(res, updatedTask, `Task status updated to ${status}.`);
    } catch (err) {
      console.error('Update task status error:', err);
      return error(res, 'Failed to update task status.', 500);
    }
  },
};

module.exports = taskController;
