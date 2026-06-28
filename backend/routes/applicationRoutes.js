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

// GET /api/applications/my-applications — Worker: get all own applications
// ⚠️  Must be declared BEFORE  /applications/:id  so Express does not
//     mistake the literal "my-applications" for an :id param value.
router.get(
  '/applications/my-applications',
  authenticate,
  applicationController.getMyApplications
);

// PATCH /api/applications/:id/withdraw — Tasker withdraws bid
router.patch(
  '/applications/:id/withdraw',
  authenticate,
  applicationValidator.applicationIdParam,
  validate,
  applicationController.withdrawApplication
);


// PATCH /api/applications/:id — Update application details
router.patch(
  '/applications/:id',
  authenticate,
  applicationValidator.updateApplication,
  validate,
  applicationController.updateApplication
);

// PATCH /api/applications/:id/status — Accept or reject application (Poster only)
router.patch(
  '/applications/:id/status',
  authenticate,
  applicationValidator.applicationIdParam,
  validate,
  applicationController.updateApplicationStatus
);

// DELETE /api/applications/:id — Delete application
router.delete(
  '/applications/:id',
  authenticate,
  applicationValidator.applicationIdParam,
  validate,
  applicationController.deleteApplication
);

// GET /api/tasks/:taskId/my-application — Get current worker's application for a task
router.get(
  '/tasks/:taskId/my-application',
  authenticate,
  applicationController.getMyApplicationForTask
);

module.exports = router;
