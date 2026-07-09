const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { param, query, body } = require('express-validator');
const escrowController = require('../controllers/escrowController');

/**
 * Escrow Routes
 * Base path: /api/escrows
 */

// ==========================================
// PayOS per-job payment (escrow funding)
// NOTE: must be defined BEFORE /:taskId to avoid route conflict
// ==========================================

// Poster/client polling: xác nhận thanh toán sau khi quay lại từ PayOS
router.post(
  '/payos/confirm',
  authenticate,
  [body('orderCode').notEmpty()],
  validate,
  escrowController.confirmPayment
);

// Redirect pages (mở trong trình duyệt/webview sau thanh toán)
router.get('/payos/success', escrowController.payosSuccess);
router.get('/payos/cancel', escrowController.payosCancel);

// List my escrows
// NOTE: must be defined BEFORE /:taskId to avoid conflict
router.get(
  '/me',
  authenticate,
  [
    query('role').optional().isIn(['all', 'poster', 'tasker']),
    query('status').optional().isIn([
      'holding', 'released', 'refunded', 'disputed',
      'HOLDING', 'RELEASED', 'REFUNDED', 'DISPUTED', 'PENDING_PAYMENT', 'EXPIRED',
    ]),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('cursor').optional().isUUID(),
  ],
  validate,
  escrowController.getMyEscrows
);

// Poster khiếu nại kết quả công việc → DISPUTED
router.post(
  '/:taskId/dispute',
  authenticate,
  [
    param('taskId').isUUID(),
    body('reason').notEmpty().isString(),
    body('tasker_id').optional().isUUID(),
  ],
  validate,
  escrowController.disputeEscrow
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
