const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const assignmentController = require('../controllers/assignmentController');
const generalValidator = require('../validators/generalValidator');
const validate = require('../middleware/validate');

/**
 * Assignment Management Routes
 * Base path: /api/assignments
 */

// PATCH /api/assignments/:id/accept - Worker accepts assignment
router.patch(
  '/:id/accept',
  authenticate,
  generalValidator.idParam,
  validate,
  assignmentController.acceptAssignment
);

// PATCH /api/assignments/:id/decline - Worker declines assignment
router.patch(
  '/:id/decline',
  authenticate,
  generalValidator.idParam,
  validate,
  assignmentController.declineAssignment
);

// PATCH /api/assignments/:id/submit - Worker báo "Đã hoàn thành" (bật auto-release 72h)
router.patch(
  '/:id/submit',
  authenticate,
  assignmentController.submitAssignment
);

// PATCH /api/assignments/:id/complete - Poster nghiệm thu (nhả tiền)
router.patch(
  '/:id/complete',
  authenticate,
  generalValidator.idParam,
  validate,
  assignmentController.completeAssignment
);

// PATCH /api/assignments/:id/cancel - Poster cancels assignment
router.patch(
  '/:id/cancel',
  authenticate,
  generalValidator.idParam,
  validate,
  assignmentController.cancelAssignment
);

module.exports = router;
