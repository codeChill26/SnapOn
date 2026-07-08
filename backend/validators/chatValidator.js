const { body, param, query } = require('express-validator');

/**
 * Chat Validators — Input validation rules for chat endpoints
 */
const chatValidator = {
  startConversation: [
    body('userId')
      .notEmpty().withMessage('User ID is required.')
      .isUUID().withMessage('User ID must be a valid UUID.')
  ],

  getMessages: [
    param('id')
      .isUUID().withMessage('Conversation ID must be a valid UUID.'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be an integer between 1 and 100.')
  ],

  sendMessage: [
    param('id')
      .isUUID().withMessage('Conversation ID must be a valid UUID.'),
    body('type')
      .optional()
      .isIn(['TEXT', 'IMAGE', 'MIXED']).withMessage('Invalid message type.'),
    body('text')
      .optional()
      .trim()
      .isLength({ max: 5000 }).withMessage('Message text must not exceed 5000 characters.'),
    body('imageUrl')
      .optional()
      .trim()
      .isURL().withMessage('Invalid Image URL format.')
  ],

  markAsRead: [
    param('id')
      .isUUID().withMessage('Conversation ID must be a valid UUID.')
  ]
};

module.exports = chatValidator;
