const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const activityController = require('../controllers/activityController');
const generalValidator = require('../validators/generalValidator');
const validate = require('../middleware/validate');

// GET /api/activities/me — Get user activities list
router.get(
  '/me',
  authenticate,
  generalValidator.activitiesQuery,
  validate,
  activityController.getActivities
);

// GET /api/activities/me/summary — Get user activities counts summary
router.get(
  '/me/summary',
  authenticate,
  activityController.getActivitySummary
);

module.exports = router;
