const { param, query } = require('express-validator');

/**
 * General/Shared Validators
 */
const generalValidator = {
  idParam: [
    param('id')
      .isUUID().withMessage('ID must be a valid UUID.')
  ],

  activitiesQuery: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.'),
    query('view').optional().isIn(['POSTED', 'PARTICIPATING']).withMessage('View must be POSTED or PARTICIPATING.')
  ]
};

module.exports = generalValidator;
