'use strict';

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// GET /api/categories — Get all categories and subcategories (Public)
router.get(
  '/categories',
  categoryController.getCategories
);

module.exports = router;
