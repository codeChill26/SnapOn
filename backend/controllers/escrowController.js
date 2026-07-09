const escrowModel = require('../models/escrowModel');
const escrowService = require('../services/escrowService');
const assignmentExpiryService = require('../services/assignmentExpiryService');
const withDbTx = require('../utils/withDbTx');
const payos = require('../config/payos');
const { success, error } = require('../utils/responseHandler');

function renderResultPage({ ok, title, message }) {
  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px 20px; background: #f5f5f5; }
          .card { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
          h1 { color: ${ok ? '#10B981' : '#EF4444'}; margin-top: 0; }
          p { color: #6B7280; font-size: 16px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${ok ? '✓' : '✕'} ${title}</h1>
          <p>${message}</p>
        </div>
      </body>
      </html>
    `;
}

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

      // Chỉ cho xóa escrow chưa có tiền thật bên trong
      // (HOLDING/RELEASED/DISPUTED tuyệt đối không xóa — là chứng từ tiền)
      const deletableStatuses = ['PENDING_PAYMENT', 'EXPIRED', 'REFUNDED'];
      if (!deletableStatuses.includes(escrow.status)) {
        return error(res, 'Chỉ có thể xóa escrow chưa thanh toán hoặc đã hoàn/hết hạn.', 400);
      }

      const deleted = await escrowModel.deleteByTaskId(taskId);
      return success(res, { taskId: deleted.task_id }, 'Escrow deleted successfully.');
    } catch (err) {
      console.error('Delete escrow error:', err);
      return error(res, 'Failed to delete escrow.', 500);
    }
  },

  /**
   * POST /api/escrows/payos/confirm
   * Body: { orderCode }
   * Poster xác nhận đã thanh toán (polling sau khi quay lại từ PayOS).
   * Idempotent — webhook có thể đã xử lý trước.
   */
  async confirmPayment(req, res) {
    try {
      const userId = req.user.id;
      const orderCode = Number(req.body.orderCode);
      if (!Number.isFinite(orderCode)) {
        return error(res, 'Order code không hợp lệ.', 400);
      }

      const escrow = await escrowModel.findByOrderCode(orderCode);
      if (!escrow) {
        return error(res, 'Không tìm thấy giao dịch cho order code này.', 404);
      }
      if (escrow.poster_id !== userId && escrow.tasker_id !== userId) {
        return error(res, 'Bạn không có quyền xác nhận giao dịch này.', 403);
      }

      if (escrow.status !== 'PENDING_PAYMENT') {
        return success(
          res,
          { success: true, alreadyProcessed: true, status: escrow.status, escrow },
          'Giao dịch đã được xử lý trước đó.'
        );
      }

      // Verify with PayOS
      let paymentInfo;
      try {
        paymentInfo = await payos.paymentRequests.get(orderCode);
      } catch (err) {
        console.error('PayOS verify error:', err);
        return error(res, 'Không thể xác minh thanh toán với PayOS.', 500);
      }

      if (paymentInfo.status !== 'PAID') {
        return success(
          res,
          { success: false, status: paymentInfo.status },
          'Thanh toán chưa hoàn tất. Vui lòng hoàn tất thanh toán trước khi kiểm tra.'
        );
      }

      const result = await withDbTx((db) => escrowService.fundEscrowByOrderCode(orderCode, db));

      if (!result) {
        return error(res, 'Không tìm thấy giao dịch ký quỹ.', 404);
      }
      if (result.conflict) {
        return success(
          res,
          { success: false, conflict: result.conflict, escrow: result.escrow },
          'Thanh toán đã nhận nhưng công việc không còn khả dụng. Hệ thống sẽ hoàn tiền cho bạn.'
        );
      }

      // Post-commit side effects
      const io = req.app.get('io');
      if (!result.alreadyProcessed && result.assignedTask) {
        if (io) {
          io.to(result.taskerId).emit('task_assigned', {
            taskId: result.taskId,
            taskTitle: result.taskTitle,
          });
        }
        // Flow ACCEPT: worker phải bấm nhận việc trong 15'
        if (result.flow === 'ACCEPT') {
          assignmentExpiryService.setupExpiryTimer(result.assignedTask.id, io);
        }
      }

      return success(
        res,
        {
          success: true,
          alreadyProcessed: !!result.alreadyProcessed,
          escrow: result.escrow,
          assignedTask: result.assignedTask || null,
        },
        'Thanh toán thành công! Đã chốt ghép việc.'
      );
    } catch (err) {
      console.error('Confirm escrow payment error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Xác nhận thanh toán thất bại.', status);
    }
  },

  /**
   * POST /api/escrows/:taskId/dispute
   * Body: { tasker_id?, reason }
   * Poster khiếu nại kết quả công việc → escrow DISPUTED (đóng băng chờ admin).
   */
  async disputeEscrow(req, res) {
    try {
      const userId = req.user.id;
      const { taskId } = req.params;
      const { tasker_id, reason } = req.body;

      if (!reason || !String(reason).trim()) {
        return error(res, 'Vui lòng nhập lý do khiếu nại.', 400);
      }

      const result = await withDbTx(async (db) => {
        let taskerId = tasker_id;
        if (!taskerId) {
          const holdingTaskerIds = await escrowModel.findHoldingTaskerIds(taskId, db);
          if (holdingTaskerIds.length !== 1) {
            const e = new Error('Vui lòng chỉ định người làm cần khiếu nại (tasker_id).');
            e.statusCode = 400;
            throw e;
          }
          taskerId = holdingTaskerIds[0];
        }
        return escrowService.disputeForTasker(
          { taskId, taskerId, posterId: userId, reason },
          db
        );
      });

      const io = req.app.get('io');
      if (io) {
        io.to(result.tasker_id).emit('escrow_disputed', {
          taskId,
          message: 'Chủ công việc đã khiếu nại kết quả. Quản trị viên sẽ xem xét và phân xử.',
        });
      }

      return success(res, result, 'Đã gửi khiếu nại. Quản trị viên sẽ xem xét và phân xử.');
    } catch (err) {
      console.error('Dispute escrow error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Gửi khiếu nại thất bại.', status);
    }
  },

  /** GET /api/escrows/payos/success — trang redirect sau thanh toán */
  async payosSuccess(req, res) {
    res.send(renderResultPage({
      ok: true,
      title: 'Thanh toán thành công',
      message: 'Cảm ơn bạn! Vui lòng quay lại ứng dụng SnapOn và bấm "Kiểm tra kết quả" để hoàn tất ghép việc.',
    }));
  },

  /** GET /api/escrows/payos/cancel — trang redirect khi hủy thanh toán */
  async payosCancel(req, res) {
    res.send(renderResultPage({
      ok: false,
      title: 'Đã hủy thanh toán',
      message: 'Giao dịch thanh toán công việc đã bị hủy. Bạn có thể đóng trình duyệt này và thử lại trong ứng dụng.',
    }));
  },
};

module.exports = escrowController;
