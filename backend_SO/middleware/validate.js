const { validationResult } = require('express-validator');
const { error } = require('../utils/responseHandler');

/**
 * Validation Middleware
 * Wraps express-validator results and returns formatted errors
 * Usage: router.post('/tasks', [...validationRules], validate, controller)
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    return error(res, 'Validation failed.', 400, formattedErrors);
  }

  next();
};

module.exports = validate;
