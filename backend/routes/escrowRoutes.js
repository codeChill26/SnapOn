const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { param, query } = require('express-validator');
const escrowController = require('../controllers/escrowController');
const { ESCROW_STATUS } = require('../utils/constants');

const validStatuses = [
  ...Object.values(ESCROW_STATUS),
  ...Object.values(ESCROW_STATUS).map((s) => s.toLowerCase()),
];

/**
 * Escrow Routes
 * Base path: /api/escrows
 */

// List my escrows
// NOTE: must be defined BEFORE /:taskId to avoid conflict
router.get(
  '/me',
  authenticate,
  [
    query('role').optional().isIn(['all', 'poster', 'tasker']),
    query('status').optional().isIn(validStatuses),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('cursor').optional().isUUID(),
  ],
  validate,
  escrowController.getMyEscrows
);

// NOTE: :taskId is task id (not escrow id)
router.get(
  '/:taskId',
  authenticate,
  [param('taskId').isUUID()],
  validate,
  escrowController.getEscrowByTaskId
);

// DELETE /api/escrows/:taskId — Delete escrow
router.delete(
  '/:taskId',
  authenticate,
  [param('taskId').isUUID()],
  validate,
  escrowController.deleteEscrow
);

module.exports = router;
