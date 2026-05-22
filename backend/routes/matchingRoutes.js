const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const applicationValidator = require('../validators/applicationValidator');
const matchingController = require('../controllers/matchingController');

/**
 * Matching Routes
 * Base path: /api
 */

// POST /api/tasks/:taskId/auto-match — Auto-match best tasker
router.post(
  '/tasks/:taskId/auto-match',
  authenticate,
  applicationValidator.autoMatch,
  validate,
  matchingController.autoMatch
);

// POST /api/tasks/:taskId/manual-match — Poster manually selects tasker
router.post(
  '/tasks/:taskId/manual-match',
  authenticate,
  applicationValidator.manualMatch,
  validate,
  matchingController.manualMatch
);

// GET /api/tasks/:taskId/ranked-applications — View ranked bids
router.get(
  '/tasks/:taskId/ranked-applications',
  authenticate,
  matchingController.getRankedApplications
);

module.exports = router;
