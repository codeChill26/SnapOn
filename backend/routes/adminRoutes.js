const express = require('express');
const router = express.Router();
const verifyFirebaseToken = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const adminController = require('../controllers/adminController');

// GET /api/admin/stats — Aggregated platform statistics
router.get('/stats', verifyFirebaseToken, authorize('ADMIN'), adminController.getStats);

module.exports = router;
