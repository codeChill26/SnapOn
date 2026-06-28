const escrowModel = require('../models/escrowModel');
const { success, error } = require('../utils/responseHandler');

const escrowController = {
  /**
   * GET /api/escrows/me
   */
  async getMyEscrows(req, res) {
    try {
      const userId = req.user.id;
      const { role, status, limit, cursor } = req.query;

      const escrows = await escrowModel.listByUserId(userId, { role, status, limit, cursor });

      const normalized = escrows.map((e) => ({
        ...e,
        amount: Number(e.amount),
        platform_fee_amount: Number(e.platform_fee_amount || 0),
        insurance_fee_amount: Number(e.insurance_fee_amount || 0),
      }));

      return success(res, normalized, 'Escrows retrieved successfully.');
    } catch (err) {
      console.error('List escrows error:', err);
      return error(res, 'Failed to retrieve escrows.', 500);
    }
  },

  /**
   * GET /api/escrows/:taskId
   * Note: :taskId refers to the task id (not escrow id).
   */
  async getEscrowByTaskId(req, res) {
    try {
      const userId = req.user.id;
      const { taskId } = req.params;

      const escrow = await escrowModel.findByTaskId(taskId);
      if (!escrow) {
        return error(res, 'Escrow not found for this task.', 404);
      }

      if (escrow.poster_id !== userId && escrow.tasker_id !== userId) {
        return error(res, 'You are not allowed to view this escrow.', 403);
      }

      const normalized = {
        ...escrow,
        amount: Number(escrow.amount),
        platform_fee_amount: Number(escrow.platform_fee_amount || 0),
        insurance_fee_amount: Number(escrow.insurance_fee_amount || 0),
      };

      return success(res, normalized, 'Escrow retrieved successfully.');
    } catch (err) {
      console.error('Get escrow error:', err);
      return error(res, 'Failed to retrieve escrow.', 500);
    }
  },
  /**
   * DELETE /api/escrows/:taskId
   * Delete an escrow by task ID
   */
  async deleteEscrow(req, res) {
    try {
      const userId = req.user.id;
      const { taskId } = req.params;

      const escrow = await escrowModel.findByTaskId(taskId);
      if (!escrow) {
        return error(res, 'Escrow not found for this task.', 404);
      }

      // Only poster or tasker can delete
      if (escrow.poster_id !== userId && escrow.tasker_id !== userId) {
        return error(res, 'You are not allowed to delete this escrow.', 403);
      }

      // Only allow deletion if status is 'holding' (not released/refunded/disputed)
      if (escrow.status !== 'holding') {
        return error(res, 'You can only delete escrows in holding status.', 400);
      }

      const deleted = await escrowModel.deleteByTaskId(taskId);
      return success(res, { taskId: deleted.task_id }, 'Escrow deleted successfully.');
    } catch (err) {
      console.error('Delete escrow error:', err);
      return error(res, 'Failed to delete escrow.', 500);
    }
  },
};

module.exports = escrowController;
