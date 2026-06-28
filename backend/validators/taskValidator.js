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
      .notEmpty().withMessage('Category (category_id) is required.')
      .custom(value => {
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
        const isSlug = [
          'content', 'design', 'video-media', 'marketing', 'tech', 'admin', 
          'research', 'ecommerce', 'translation', 'study', 'customer-service', 
          'ai-automation', 'others'
        ].includes(value);
        if (!isUUID && !isSlug) {
          throw new Error('Category must be a valid UUID or category slug.');
        }
        return true;
      }),

    body('task_type')
      .optional()
      .isIn(['ONLINE', 'OFFLINE', 'HYBRID']).withMessage('Invalid task_type.'),

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
      .notEmpty().withMessage('Subcategories (skill_ids) are required.')
      .isArray().withMessage('Skill IDs must be an array.'),

    body('skill_ids.*')
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

    body('images')
      .optional()
      .isArray().withMessage('Images must be an array.'),

    body('images.*')
      .optional()
      .isString().withMessage('Each image must be a valid URL.'),

    body('post_type')
      .optional()
      .isIn(['RECRUITMENT', 'SERVICE_OFFER']).withMessage('Invalid post_type.'),

    body('work_mode')
      .optional()
      .isIn(['ONSITE', 'REMOTE', 'NEGOTIABLE']).withMessage('Invalid work_mode.'),

    body('salary_unit')
      .optional()
      .isIn(['PER_JOB', 'PER_HOUR', 'PER_DAY', 'PER_MONTH']).withMessage('Invalid salary_unit.'),

    body('employment_type')
      .optional()
      .isIn(['ONE_TIME', 'PART_TIME', 'FULL_TIME', 'CONTRACT', 'FREELANCE', 'SHIFT', 'INTERNSHIP', 'NEGOTIABLE']).withMessage('Invalid employment_type.'),

    body('application_deadline')
      .optional({ nullable: true })
      .isISO8601().withMessage('Application deadline must be a valid ISO8601 date.')
      .custom((value) => {
        if (value && new Date(value) <= new Date()) {
          throw new Error('Application deadline must be in the future.');
        }
        return true;
      }),
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
      .isIn(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'CLOSED', 'EXPIRED'])
      .withMessage('Status must be one of: OPEN, IN_PROGRESS, COMPLETED, CANCELLED, CLOSED, EXPIRED.'),
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
      .isIn(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'CLOSED', 'EXPIRED'])
      .withMessage('Invalid status filter.'),

    query('category_id')
      .optional()
      .custom(value => {
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
        const isSlug = [
          'content', 'design', 'video-media', 'marketing', 'tech', 'admin', 
          'research', 'ecommerce', 'translation', 'study', 'customer-service', 
          'ai-automation', 'others'
        ].includes(value);
        if (!isUUID && !isSlug) {
          throw new Error('Category ID must be a valid UUID or category slug.');
        }
        return true;
      }),

    query('field_id')
      .optional()
      .custom(value => {
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
        const isSlug = [
          'content', 'design', 'video-media', 'marketing', 'tech', 'admin', 
          'research', 'ecommerce', 'translation', 'study', 'customer-service', 
          'ai-automation', 'others'
        ].includes(value);
        if (!isUUID && !isSlug) {
          throw new Error('Field ID must be a valid UUID or category slug.');
        }
        return true;
      }),

    query('task_type')
      .optional()
      .isIn(['ONLINE', 'OFFLINE', 'HYBRID']).withMessage('Invalid task type filter.'),

    query('post_type')
      .optional()
      .isIn(['RECRUITMENT', 'SERVICE_OFFER']).withMessage('Invalid post_type filter.'),

    query('work_mode')
      .optional()
      .isIn(['ONSITE', 'REMOTE', 'NEGOTIABLE']).withMessage('Invalid work_mode filter.'),

    query('salary_unit')
      .optional()
      .isIn(['PER_JOB', 'PER_HOUR', 'PER_DAY', 'PER_MONTH']).withMessage('Invalid salary_unit filter.'),

    query('search')
      .optional()
      .trim()
      .isLength({ max: 255 }).withMessage('Search query must not exceed 255 characters.'),
  ],

  /**
   * Validation rules for updating a task
   */
  updateTask: [
    param('id')
      .isUUID().withMessage('Task ID must be a valid UUID.'),

    body('title')
      .optional()
      .trim()
      .isLength({ min: 5, max: 255 }).withMessage('Title must be between 5 and 255 characters.'),

    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters.'),

    body('category_id')
      .optional()
      .custom(value => {
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
        const isSlug = [
          'content', 'design', 'video-media', 'marketing', 'tech', 'admin', 
          'research', 'ecommerce', 'translation', 'study', 'customer-service', 
          'ai-automation', 'others'
        ].includes(value);
        if (!isUUID && !isSlug) {
          throw new Error('Category must be a valid UUID or category slug.');
        }
        return true;
      }),

    body('task_type')
      .optional()
      .isIn(['ONLINE', 'OFFLINE', 'HYBRID']).withMessage('Invalid task_type.'),

    body('budget_min')
      .optional()
      .isFloat({ min: 0 }).withMessage('Minimum budget must be a positive number.'),

    body('budget_max')
      .optional()
      .isFloat({ min: 0 }).withMessage('Maximum budget must be a positive number.')
      .custom((value, { req }) => {
        if (req.body.budget_min && parseFloat(value) < parseFloat(req.body.budget_min)) {
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

    body('images')
      .optional()
      .isArray().withMessage('Images must be an array.'),

    body('images.*')
      .optional()
      .isString().withMessage('Each image must be a valid URL.'),

    body('post_type')
      .optional()
      .isIn(['RECRUITMENT', 'SERVICE_OFFER']).withMessage('Invalid post_type.'),

    body('work_mode')
      .optional()
      .isIn(['ONSITE', 'REMOTE', 'NEGOTIABLE']).withMessage('Invalid work_mode.'),

    body('salary_unit')
      .optional()
      .isIn(['PER_JOB', 'PER_HOUR', 'PER_DAY', 'PER_MONTH']).withMessage('Invalid salary_unit.'),

    body('employment_type')
      .optional()
      .isIn(['ONE_TIME', 'PART_TIME', 'FULL_TIME', 'CONTRACT', 'FREELANCE', 'SHIFT', 'INTERNSHIP', 'NEGOTIABLE']).withMessage('Invalid employment_type.'),

    body('application_deadline')
      .optional({ nullable: true })
      .isISO8601().withMessage('Application deadline must be a valid ISO8601 date.')
      .custom((value) => {
        if (value && new Date(value) <= new Date()) {
          throw new Error('Application deadline must be in the future.');
        }
        return true;
      }),
  ],
  /**
   * Validation rules for uploading images
   */
  uploadImages: [
    body('images')
      .isArray().withMessage('Images must be an array of base64 strings.')
      .notEmpty().withMessage('At least one image is required.'),
    body('images.*')
      .isString().withMessage('Each image must be a base64 encoded string.'),
  ],
};

module.exports = taskValidator;
