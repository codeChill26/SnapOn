const pool = require('../config/db');
const assignedTaskModel = require('../models/assignedTaskModel');
const taskApplicationModel = require('../models/taskApplicationModel');
const taskModel = require('../models/taskModel');
const escrowService = require('../services/escrowService');
const { toDbAssignedTaskStatus, toDbApplicationStatus } = require('../utils/dbEnum');
const withDbTx = require('../utils/withDbTx');

/**
 * Assignment Expiry Service
 * Tự động hủy giao việc sau 15 phút không xác nhận
 */
const assignmentExpiryService = {
  /**
   * Thực hiện hủy một giao việc đã quá hạn 15 phút
   * Cập nhật trạng thái sang CANCELLED, hoàn trả tiền ký quỹ (escrow) và gửi socket thông báo
   */
  async expireAssignment(assignmentId, io) {
    try {
      const assignment = await withDbTx(async (client) => {
        // 1. Khóa và kiểm tra trạng thái hiện tại của giao việc
        const assignmentRes = await client.query(
          'SELECT * FROM assigned_tasks WHERE id = $1 FOR UPDATE',
          [assignmentId]
        );
        const assignmentVal = assignmentRes.rows[0];
        
        // Nếu không tìm thấy hoặc đã được accept, decline, hay đã bị hủy trước đó
        if (!assignmentVal) {
          return null;
        }
        
        // Chuyển đổi trạng thái từ DB enum (nếu cần)
        const dbAssignedStatus = toDbAssignedTaskStatus('ASSIGNED');
        if (assignmentVal.status !== dbAssignedStatus) {
          return null;
        }

        // 2. Cập nhật trạng thái giao việc thành CANCELLED
        const dbCancelledStatus = toDbAssignedTaskStatus('CANCELLED');
        await client.query(
          'UPDATE assigned_tasks SET status = $2 WHERE id = $1',
          [assignmentId, dbCancelledStatus]
        );

        // 3. Cập nhật trạng thái đơn ứng tuyển tương ứng thành REJECTED (từ chối/hủy)
        if (assignmentVal.application_id) {
          const dbRejectedStatus = toDbApplicationStatus('REJECTED');
          await client.query(
            'UPDATE task_applications SET status = $2 WHERE id = $1',
            [assignmentVal.application_id, dbRejectedStatus]
          );
        }

        // 4. Hoàn trả tiền ký quỹ (escrow refund) cho chủ bài đăng
        await escrowService.refundForTask(assignmentVal.task_id, client);

        return assignmentVal;
      });

      if (!assignment) {
        return false;
      }

      console.log(`[ExpiryService] ⏳ Tự động hủy giao việc quá hạn 15 phút (ID: ${assignmentId}) thành công.`);

      // 5. Gửi thông báo socket thời gian thực đến cả 2 bên
      if (io) {
        const task = await taskModel.findById(assignment.task_id);
        if (task) {
          // Gửi thông báo cho người làm (tasker/worker)
          io.to(assignment.tasker_id).emit('assignment_expired_tasker', {
            taskId: task.id,
            taskTitle: task.title,
            message: `Yêu cầu nhận việc cho công việc "${task.title}" đã hết hạn 15 phút do bạn không xác nhận.`
          });

          // Gửi thông báo cho người đăng (poster)
          io.to(task.poster_id).emit('assignment_expired_poster', {
            taskId: task.id,
            taskTitle: task.title,
            message: `Ứng viên đã không xác nhận công việc "${task.title}" trong vòng 15 phút. Hệ thống đã tự động hủy giao việc và mở lại bài đăng.`
          });
          
          // Phát tín hiệu cập nhật danh sách bài đăng đến toàn bộ client
          io.emit('task_status_changed', {
            taskId: task.id,
            status: 'OPEN',
          });
        }
      }
      return true;
    } catch (error) {
      console.error(`[ExpiryService] Lỗi khi hủy giao việc quá hạn ${assignmentId}:`, error);
      return false;
    }
  },

  /**
   * Sweeper chạy định kỳ quét các assigned_tasks bị quá hạn 15 phút trong DB
   * (Chốt chặn an toàn phòng trường hợp server bị khởi động lại làm mất bộ nhớ timer)
   */
  startSweeper(io) {
    console.log('⏳ assignmentExpiryService Sweeper started (running every 1 minute)...');

    setInterval(async () => {
      try {
        const dbAssignedStatus = toDbAssignedTaskStatus('ASSIGNED');
        // Tìm các bản ghi ASSIGNED đã được tạo quá 15 phút
        const expiredRes = await pool.query(
          `SELECT id FROM assigned_tasks
           WHERE status = $1
           AND created_at < NOW() - INTERVAL '15 minutes'`,
          [dbAssignedStatus]
        );

        for (const row of expiredRes.rows) {
          await this.expireAssignment(row.id, io);
        }
      } catch (error) {
        console.error('[ExpiryService] Lỗi sweeper định kỳ:', error);
      }

      // Escrow per-job sweeps
      try {
        // 1) PENDING_PAYMENT quá 15' chưa thanh toán → EXPIRED (nhả chỗ)
        await escrowService.expirePendingEscrows();
      } catch (error) {
        console.error('[ExpiryService] Lỗi expirePendingEscrows:', error);
      }
      try {
        // 2) Worker đã submit, poster im lặng quá 72h → TỰ NHẢ tiền
        await escrowService.autoReleaseDueEscrows(io);
      } catch (error) {
        console.error('[ExpiryService] Lỗi autoReleaseDueEscrows:', error);
      }
    }, 60000); // Chạy mỗi 1 phút
  },

  /**
   * Thiết lập hẹn giờ hủy lập tức sau 15 phút cho một assignment mới tạo (In-memory timer)
   */
  setupExpiryTimer(assignmentId, io) {
    setTimeout(async () => {
      try {
        await this.expireAssignment(assignmentId, io);
      } catch (error) {
        console.error(`[ExpiryService] Lỗi khi chạy timer hết hạn cho assignment ${assignmentId}:`, error);
      }
    }, 15 * 60 * 1000); // Đúng 15 phút (900,000 ms)
  }
};

module.exports = assignmentExpiryService;
