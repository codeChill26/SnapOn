'use strict';

const { body, param, query } = require('express-validator');
const pool = require('../config/db');

/**
 * Custom validator to check if a category ID exists in the database
 */
const categoryExists = async (value) => {
  if (!value) return true;
  const result = await pool.query('SELECT id FROM categories WHERE id = $1', [value]);
  if (result.rows.length === 0) {
    throw new Error('Category does not exist.');
  }
  return true;
};

/**
 * Banner Validators — Input validation rules for banner endpoints
 */
const bannerValidator = {
  /**
   * Validation rules for creating a banner
   */
  createBanner: [
    body('code')
      .trim()
      .notEmpty().withMessage('Code is required.')
      .isLength({ max: 255 }).withMessage('Code must not exceed 255 characters.'),

    body('title')
      .trim()
      .notEmpty().withMessage('Title is required.')
      .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters.'),

    body('subtitle')
      .optional()
      .trim(),

    body('imageUrl')
      .trim()
      .notEmpty().withMessage('Image URL is required.')
      .isURL().withMessage('Image URL must be a valid URL.'),

    body('categoryId')
      .notEmpty().withMessage('Category ID is required.')
      .isUUID().withMessage('Category ID must be a valid UUID.')
      .custom(categoryExists),

    body('placement')
      .trim()
      .notEmpty().withMessage('Placement is required.')
      .isIn(['HOME_FEATURED', 'HOME_TOP', 'HOME_MIDDLE', 'CATEGORY_TOP', 'PROFILE_PROMOTION'])
      .withMessage('Placement must be one of: HOME_FEATURED, HOME_TOP, HOME_MIDDLE, CATEGORY_TOP, PROFILE_PROMOTION.'),

    body('actionType')
      .trim()
      .notEmpty().withMessage('Action type is required.')
      .isIn(['CATEGORY', 'EXTERNAL_URL', 'NONE'])
      .withMessage('Action type must be one of: CATEGORY, EXTERNAL_URL, NONE.'),

    body('actionValue')
      .optional()
      .trim(),

    body('displayOrder')
      .notEmpty().withMessage('Display order is required.')
      .isInt({ min: 1 }).withMessage('Display order must be an integer greater than 0.'),

    body('isActive')
      .optional()
      .isBoolean().withMessage('isActive must be a boolean.'),

    body('startAt')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601().withMessage('Start at must be a valid ISO8601 date.'),

    body('endAt')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601().withMessage('End at must be a valid ISO8601 date.')
      .custom((value, { req }) => {
        if (req.body.startAt && value && new Date(value) <= new Date(req.body.startAt)) {
          throw new Error('End date must be after start date.');
        }
        return true;
      }),
  ],

  /**
   * Validation rules for updating a banner
   */
  updateBanner: [
    param('id')
      .isUUID().withMessage('Banner ID must be a valid UUID.'),

    body('code')
      .optional()
      .trim()
      .isLength({ max: 255 }).withMessage('Code must not exceed 255 characters.'),

    body('title')
      .optional()
      .trim()
      .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters.'),

    body('subtitle')
      .optional()
      .trim(),

    body('imageUrl')
      .optional()
      .trim()
      .isURL().withMessage('Image URL must be a valid URL.'),

    body('categoryId')
      .optional()
      .isUUID().withMessage('Category ID must be a valid UUID.')
      .custom(categoryExists),

    body('placement')
      .optional()
      .trim()
      .isIn(['HOME_FEATURED', 'HOME_TOP', 'HOME_MIDDLE', 'CATEGORY_TOP', 'PROFILE_PROMOTION'])
      .withMessage('Placement must be one of: HOME_FEATURED, HOME_TOP, HOME_MIDDLE, CATEGORY_TOP, PROFILE_PROMOTION.'),

    body('actionType')
      .optional()
      .trim()
      .isIn(['CATEGORY', 'EXTERNAL_URL', 'NONE'])
      .withMessage('Action type must be one of: CATEGORY, EXTERNAL_URL, NONE.'),

    body('actionValue')
      .optional()
      .trim(),

    body('displayOrder')
      .optional()
      .isInt({ min: 1 }).withMessage('Display order must be an integer greater than 0.'),

    body('isActive')
      .optional()
      .isBoolean().withMessage('isActive must be a boolean.'),

    body('startAt')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601().withMessage('Start at must be a valid ISO8601 date.'),

    body('endAt')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601().withMessage('End at must be a valid ISO8601 date.')
      .custom((value, { req }) => {
        const startAt = req.body.startAt;
        if (startAt && value && new Date(value) <= new Date(startAt)) {
          throw new Error('End date must be after start date.');
        }
        return true;
      }),
  ],

  /**
   * Validation rules for banner ID param
   */
  bannerIdParam: [
    param('id')
      .isUUID().withMessage('Banner ID must be a valid UUID.'),
  ],

  /**
   * Validation rules for updating status (is_active)
   */
  updateStatus: [
    param('id')
      .isUUID().withMessage('Banner ID must be a valid UUID.'),
    body('isActive')
      .notEmpty().withMessage('isActive is required.')
      .isBoolean().withMessage('isActive must be a boolean.'),
  ],
};

module.exports = bannerValidator;
