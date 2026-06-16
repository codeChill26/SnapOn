'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const bannerValidator = require('../validators/bannerValidator');
const bannerController = require('../controllers/bannerController');

/**
 * Banner Routes
 */

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// GET /api/banners/home — Get active home featured banners (Public)
router.get(
  '/banners/home',
  bannerController.getHomeBanners
);

// ==========================================
// ADMIN ENDPOINTS (Role: admin)
// ==========================================

// GET /api/admin/banners — List all banners
router.get(
  '/admin/banners',
  authenticate,
  authorize('admin'),
  bannerController.getBanners
);

// GET /api/admin/banners/:id — Get banner details
router.get(
  '/admin/banners/:id',
  authenticate,
  authorize('admin'),
  bannerValidator.bannerIdParam,
  validate,
  bannerController.getBannerById
);

// POST /api/admin/banners — Create a banner
router.post(
  '/admin/banners',
  authenticate,
  authorize('admin'),
  bannerValidator.createBanner,
  validate,
  bannerController.createBanner
);

// PUT /api/admin/banners/:id — Update a banner
router.put(
  '/admin/banners/:id',
  authenticate,
  authorize('admin'),
  bannerValidator.updateBanner,
  validate,
  bannerController.updateBanner
);

// PATCH /api/admin/banners/:id/status — Toggle banner status
router.patch(
  '/admin/banners/:id/status',
  authenticate,
  authorize('admin'),
  bannerValidator.updateStatus,
  validate,
  bannerController.updateStatus
);

// DELETE /api/admin/banners/:id — Delete a banner
router.delete(
  '/admin/banners/:id',
  authenticate,
  authorize('admin'),
  bannerValidator.bannerIdParam,
  validate,
  bannerController.deleteBanner
);

module.exports = router;
