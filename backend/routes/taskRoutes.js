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

// POST /api/tasks/upload-images — Upload images to Cloudinary (Base64)
// Note: This must be defined BEFORE /:id to avoid conflict
router.post(
  '/upload-images',
  authenticate,
  taskValidator.uploadImages,
  validate,
  taskController.uploadTaskImages
);

// GET /api/tasks/saved — Get current user's saved tasks
router.get(
  '/saved',
  authenticate,
  taskController.getSavedTasks
);

// POST /api/tasks/:id/save — Save a task
router.post(
  '/:id/save',
  authenticate,
  taskValidator.taskIdParam,
  validate,
  taskController.saveTask
);

// DELETE /api/tasks/:id/save — Remove a saved task
router.delete(
  '/:id/save',
  authenticate,
  taskValidator.taskIdParam,
  validate,
  taskController.unsaveTask
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

// PATCH /api/tasks/:id/close-recruitment — Close recruitment early
router.patch(
  '/:id/close-recruitment',
  authenticate,
  taskValidator.taskIdParam,
  validate,
  taskController.closeRecruitment
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
