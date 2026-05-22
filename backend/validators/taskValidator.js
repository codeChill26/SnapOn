const { body, param, query } = require('express-validator');

/**
 * Task Validators — Input validation rules for task endpoints
 */
const taskValidator = {
  /**
   * Validation rules for creating a task
   */
  createTask: [
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required.')
      .isLength({ min: 5, max: 255 }).withMessage('Title must be between 5 and 255 characters.'),

    body('description')
      .trim()
      .notEmpty().withMessage('Description is required.')
      .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters.'),

    body('category_id')
      .notEmpty().withMessage('Category is required.')
      .isUUID().withMessage('Category ID must be a valid UUID.'),

    body('task_type')
      .notEmpty().withMessage('Task type is required.')
      .isIn(['ONLINE', 'OFFLINE']).withMessage('Task type must be ONLINE or OFFLINE.'),

    body('budget_min')
      .notEmpty().withMessage('Minimum budget is required.')
      .isFloat({ min: 0 }).withMessage('Minimum budget must be a positive number.'),

    body('budget_max')
      .notEmpty().withMessage('Maximum budget is required.')
      .isFloat({ min: 0 }).withMessage('Maximum budget must be a positive number.')
      .custom((value, { req }) => {
        if (parseFloat(value) < parseFloat(req.body.budget_min)) {
          throw new Error('Maximum budget must be greater than or equal to minimum budget.');
        }
        return true;
      }),

    body('deadline_start')
      .optional()
      .isISO8601().withMessage('Deadline start must be a valid date.'),

    body('deadline_end')
      .optional()
      .isISO8601().withMessage('Deadline end must be a valid date.')
      .custom((value, { req }) => {
        if (req.body.deadline_start && new Date(value) <= new Date(req.body.deadline_start)) {
          throw new Error('Deadline end must be after deadline start.');
        }
        return true;
      }),

    body('allow_insurance')
      .optional()
      .isBoolean().withMessage('Allow insurance must be true or false.'),

    body('skill_ids')
      .optional()
      .isArray().withMessage('Skill IDs must be an array.'),

    body('skill_ids.*')
      .optional()
      .isUUID().withMessage('Each skill ID must be a valid UUID.'),

    body('location')
      .optional()
      .isObject().withMessage('Location must be an object.'),

    body('location.location_type')
      .optional()
      .isIn(['TASK_LOCATION', 'MEETING_POINT']).withMessage('Location type must be TASK_LOCATION or MEETING_POINT.'),

    body('location.address')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters.'),

    body('location.latitude')
      .optional()
      .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90.'),

    body('location.longitude')
      .optional()
      .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180.'),
  ],

  /**
   * Validation rules for task ID param
   */
  taskIdParam: [
    param('id')
      .isUUID().withMessage('Task ID must be a valid UUID.'),
  ],

  /**
   * Validation rules for updating task status
   */
  updateStatus: [
    param('id')
      .isUUID().withMessage('Task ID must be a valid UUID.'),

    body('status')
      .notEmpty().withMessage('Status is required.')
      .isIn(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
      .withMessage('Status must be one of: OPEN, IN_PROGRESS, COMPLETED, CANCELLED.'),
  ],

  /**
   * Validation for query params (list tasks)
   */
  listTasks: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer.'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),

    query('status')
      .optional()
      .isIn(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
      .withMessage('Invalid status filter.'),

    query('category_id')
      .optional()
      .isUUID().withMessage('Category ID must be a valid UUID.'),

    query('task_type')
      .optional()
      .isIn(['ONLINE', 'OFFLINE']).withMessage('Task type must be ONLINE or OFFLINE.'),

    query('search')
      .optional()
      .trim()
      .isLength({ max: 255 }).withMessage('Search query must not exceed 255 characters.'),
  ],
};

module.exports = taskValidator;
