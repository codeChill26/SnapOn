const { body, param } = require('express-validator');

/**
 * Application Validators — Input validation rules for bid/application endpoints
 */
const applicationValidator = {
  /**
   * Validation rules for creating an application (bid)
   */
  createApplication: [
    param('taskId')
      .isUUID().withMessage('Task ID must be a valid UUID.'),

    body('bid_price')
      .optional()
      .isFloat({ min: 0.01 }).withMessage('Bid price must be a positive number greater than 0.'),

    body('estimated_time')
      .optional()
      .trim()
      .isLength({ max: 255 }).withMessage('Estimated time must not exceed 255 characters.'),

    body('message')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Message must not exceed 1000 characters.'),
  ],

  /**
   * Validation for application ID param
   */
  applicationIdParam: [
    param('id')
      .isUUID().withMessage('Application ID must be a valid UUID.'),
  ],

  /**
   * Validation for manual match
   */
  manualMatch: [
    param('taskId')
      .isUUID().withMessage('Task ID must be a valid UUID.'),

    body('application_id')
      .notEmpty().withMessage('Application ID is required.')
      .isUUID().withMessage('Application ID must be a valid UUID.'),
  ],

  /**
   * Validation for auto match
   */
  autoMatch: [
    param('taskId')
      .isUUID().withMessage('Task ID must be a valid UUID.'),
  ],

  /**
   * Validation rules for updating an application
   */
  updateApplication: [
    param('id')
      .isUUID().withMessage('Application ID must be a valid UUID.'),

    body('bid_price')
      .optional()
      .isFloat({ min: 0.01 }).withMessage('Bid price must be a positive number greater than 0.'),

    body('estimated_time')
      .optional()
      .trim()
      .isLength({ max: 255 }).withMessage('Estimated time must not exceed 255 characters.'),

    body('message')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Message must not exceed 1000 characters.'),
  ],
};

module.exports = applicationValidator;
