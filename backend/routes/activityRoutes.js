const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const activityController = require('../controllers/activityController');

// GET /api/activities/me — Get user activities list
router.get(
  '/me',
  authenticate,
  activityController.getActivities
);

// GET /api/activities/me/summary — Get user activities counts summary
router.get(
  '/me/summary',
  authenticate,
  activityController.getActivitySummary
);

module.exports = router;
