const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authenticateOptional } = require('../middleware/auth');
const validate = require('../middleware/validate');
const taskValidator = require('../validators/taskValidator');
const rateLimiter = require('../middleware/rateLimiter');

// Import split controllers by domain
const TaskQueryController = require('../controllers/task/TaskQueryController');
const TaskPublishController = require('../controllers/task/TaskPublishController');
const TaskActionController = require('../controllers/task/TaskActionController');

/**
 * Task Routes
 * Base path: /api/tasks
 */

// GET /api/tasks — List all tasks (with filters & pagination)
router.get(
  '/',
  authenticateOptional,
  taskValidator.listTasks,
  validate,
  TaskQueryController.getTasks
);

// GET /api/tasks/my-tasks — Get current user's tasks
// Note: This must be defined BEFORE /:id to avoid conflict
router.get(
  '/my-tasks',
  authenticate,
  TaskQueryController.getMyTasks
);

// POST /api/tasks/upload-images — Upload images to Cloudinary (Base64)
// Note: This must be defined BEFORE /:id to avoid conflict
router.post(
  '/upload-images',
  authenticate,
  rateLimiter('image-upload', 10, 60),
  taskValidator.uploadImages,
  validate,
  TaskPublishController.uploadTaskImages
);

// GET /api/tasks/saved — Get current user's saved tasks
router.get(
  '/saved',
  authenticate,
  TaskQueryController.getSavedTasks
);

// POST /api/tasks/:id/save — Save a task
router.post(
  '/:id/save',
  authenticate,
  taskValidator.taskIdParam,
  validate,
  TaskActionController.saveTask
);

// DELETE /api/tasks/:id/save — Remove a saved task
router.delete(
  '/:id/save',
  authenticate,
  taskValidator.taskIdParam,
  validate,
  TaskActionController.unsaveTask
);

// GET /api/tasks/:id — Get task details
router.get(
  '/:id',
  authenticateOptional,
  taskValidator.taskIdParam,
  validate,
  TaskQueryController.getTaskById
);

// POST /api/tasks — Create a new task
router.post(
  '/',
  authenticate,
  taskValidator.createTask,
  validate,
  TaskPublishController.createTask
);

// PATCH /api/tasks/:id/status — Update task status
router.patch(
  '/:id/status',
  authenticate,
  taskValidator.updateStatus,
  validate,
  TaskActionController.updateTaskStatus
);

// PATCH /api/tasks/:id — Update task details
router.patch(
  '/:id',
  authenticate,
  taskValidator.updateTask,
  validate,
  TaskPublishController.updateTask
);

// PATCH /api/tasks/:id/close-recruitment — Close recruitment early
router.patch(
  '/:id/close-recruitment',
  authenticate,
  taskValidator.taskIdParam,
  validate,
  TaskActionController.closeRecruitment
);

// DELETE /api/tasks/:id — Delete a task
router.delete(
  '/:id',
  authenticate,
  taskValidator.taskIdParam,
  validate,
  TaskPublishController.deleteTask
);

module.exports = router;
