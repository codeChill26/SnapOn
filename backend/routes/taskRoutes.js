const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const taskValidator = require('../validators/taskValidator');
const taskController = require('../controllers/taskController');

/**
 * Task Routes
 * Base path: /api/tasks
 */

// GET /api/tasks — List all tasks (with filters & pagination)
router.get(
  '/',
  authenticate,
  taskValidator.listTasks,
  validate,
  taskController.getTasks
);

// GET /api/tasks/my-tasks — Get current user's tasks
// Note: This must be defined BEFORE /:id to avoid conflict
router.get(
  '/my-tasks',
  authenticate,
  taskController.getMyTasks
);

// GET /api/tasks/:id — Get task details
router.get(
  '/:id',
  authenticate,
  taskValidator.taskIdParam,
  validate,
  taskController.getTaskById
);

// POST /api/tasks — Create a new task
router.post(
  '/',
  authenticate,
  taskValidator.createTask,
  validate,
  taskController.createTask
);

// PATCH /api/tasks/:id/status — Update task status
router.patch(
  '/:id/status',
  authenticate,
  taskValidator.updateStatus,
  validate,
  taskController.updateTaskStatus
);

// PATCH /api/tasks/:id — Update task details
router.patch(
  '/:id',
  authenticate,
  taskValidator.updateTask,
  validate,
  taskController.updateTask
);

// DELETE /api/tasks/:id — Delete a task
router.delete(
  '/:id',
  authenticate,
  taskValidator.taskIdParam,
  validate,
  taskController.deleteTask
);

module.exports = router;
