const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const applicationValidator = require('../validators/applicationValidator');
const applicationController = require('../controllers/applicationController');

/**
 * Application (Bidding) Routes
 * Base path: /api
 */

// POST /api/tasks/:taskId/applications — Tasker submits a bid
router.post(
  '/tasks/:taskId/applications',
  authenticate,
  applicationValidator.createApplication,
  validate,
  applicationController.createApplication
);

// GET /api/tasks/:taskId/applications — Get all bids for a task
router.get(
  '/tasks/:taskId/applications',
  authenticate,
  applicationController.getApplicationsByTask
);

// PATCH /api/applications/:id/withdraw — Tasker withdraws bid
router.patch(
  '/applications/:id/withdraw',
  authenticate,
  applicationValidator.applicationIdParam,
  validate,
  applicationController.withdrawApplication
);

module.exports = router;
