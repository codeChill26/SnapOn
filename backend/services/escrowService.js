const crypto = require('crypto');
const pool = require('../config/db');
const withDbTx = require('../utils/withDbTx');
const walletModel = require('../models/walletModel');
const walletTransactionModel = require('../models/walletTransactionModel');
const escrowModel = require('../models/escrowModel');
const assignedTaskModel = require('../models/assignedTaskModel');
const taskModel = require('../models/taskModel');
const taskApplicationModel = require('../models/taskApplicationModel');
const voucherService = require('./voucherService');
const payos = require('../config/payos');
const {
  toDbTaskStatus,
  toDbApplicationStatus,
  toDbAssignedTaskStatus,
} = require('../utils/dbEnum');

function getPlatformFeeRate() {
  const raw = process.env.PLATFORM_FEE_RATE;
  if (raw == null || raw === '') return 0.1; // default 10%
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return 0.1;
  return n;
}

function generateNumericOrderCode() {
  const uuid = crypto.randomUUID();
  return parseInt(uuid.replace(/-/g, '').slice(0, 12), 16);
}

function getBackendBase() {
  return (
    process.env.BACKEND_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${process.env.PORT || 3000}`
  );
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

const PENDING_PAYMENT_TTL_MS = 15 * 60 * 1000; // 15 phút chờ poster thanh toán
const AUTO_RELEASE_MS = 72 * 60 * 60 * 1000;   // 72h poster nghiệm thu trước khi tự nhả

/**
 * Escrow Service — escrow-per-job (2-phase payment).
 *
 * Flow mới:
 *   createPendingEscrow  → escrow PENDING_PAYMENT + PayOS link (KHÔNG đụng ví)
 *   fundEscrowByOrderCode → (webhook/confirm PAID) escrow HOLDING + CHỐT match
 *   release/refund        → dual-path:
 *       - escrow.order_code IS NULL  → legacy (ví poster: locked_balance)
 *       - escrow.order_code NOT NULL → per-job (poster không có ví;
 *         release chỉ cộng thu nhập tasker; refund cần hoàn PayOS thủ công)
 */
const escrowService = {
  /**
   * Phase 1: create a PENDING_PAYMENT escrow + PayOS payment link.
   * Manages its own transaction. No wallet interaction.
   *
   * @param {object} p
   * @param {string} p.taskId
   * @param {string} p.posterId
   * @param {string} p.taskerId
   * @param {number} p.amount        - full job amount (final price)
   * @param {string} p.applicationId - application being accepted
   * @param {'MATCH'|'ACCEPT'} p.flow - MATCH: task→IN_PROGRESS + reject others on fund;
   *                                    ACCEPT: task stays OPEN, worker must accept
   * @param {string} p.assignedBy    - 'AUTO_MATCH' | 'MANUAL'
   * @param {string} [p.voucherCode]
   */
  async createPendingEscrow({ taskId, posterId, taskerId, amount, applicationId, flow, assignedBy, voucherCode }) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      const err = new Error('Số tiền ký quỹ không hợp lệ.');
      err.statusCode = 400;
      throw err;
    }

    const feeRate = getPlatformFeeRate();
    const feeAmount = round2(amt * feeRate);

    return withDbTx(async (db) => {
      // Lock existing escrow row for this task + tasker
      const existingRes = await db.query(
        'SELECT * FROM escrows WHERE task_id = $1 AND tasker_id = $2 FOR UPDATE',
        [taskId, taskerId]
      );
      const prev = existingRes.rows[0] || null;

      if (prev) {
        if (prev.status === 'HOLDING') {
          const err = new Error('Công việc này đã được thanh toán và đang ký quỹ cho người làm này.');
          err.statusCode = 400;
          throw err;
        }
        if (prev.status === 'RELEASED') {
          const err = new Error('Giao dịch ký quỹ của bạn với người làm này đã hoàn thành và thanh toán.');
          err.statusCode = 400;
          throw err;
        }
        if (prev.status === 'DISPUTED') {
          const err = new Error('Giao dịch ký quỹ này đang tranh chấp, không thể tạo thanh toán mới.');
          err.statusCode = 400;
          throw err;
        }
        // Reuse an active pending payment (same tasker, chưa hết hạn)
        if (
          prev.status === 'PENDING_PAYMENT' &&
          prev.expires_at && new Date(prev.expires_at) > new Date() &&
          prev.checkout_url
        ) {
          return {
            escrow: prev,
            checkoutUrl: prev.checkout_url,
            orderCode: Number(prev.order_code),
            payAmount: round2(parseFloat(prev.amount) - parseFloat(prev.discount_amount || 0)),
            discount: parseFloat(prev.discount_amount || 0),
            expiresAt: prev.expires_at,
            reused: true,
          };
        }
        // PENDING_PAYMENT hết hạn / REFUNDED / EXPIRED → nhả voucher cũ rồi ghi đè
        await voucherService.releaseForEscrow(prev.id, db);
      }

      // Voucher (optional) — reserve trong cùng transaction
      let voucherId = null;
      let redemptionId = null;
      let discount = 0;
      if (voucherCode) {
        const reserved = await voucherService.validateAndReserve(
          { code: voucherCode, userId: posterId, taskId, amount: amt, feeAmount },
          db
        );
        voucherId = reserved.voucherId;
        redemptionId = reserved.redemptionId;
        discount = reserved.discount;
      }

      const payAmount = round2(amt - discount);
      if (payAmount < 1000) {
        const err = new Error('Số tiền thanh toán tối thiểu là 1.000đ.');
        err.statusCode = 400;
        throw err;
      }

      const orderCode = generateNumericOrderCode();
      const expiresAt = new Date(Date.now() + PENDING_PAYMENT_TTL_MS);
      const backendBase = getBackendBase();

      // Create PayOS payment link (mock mode in dev)
      const paymentLinkRes = await payos.paymentRequests.create({
        orderCode,
        amount: Math.round(payAmount),
        description: 'Thanh toan SnapOn job', // PayOS limit 25 chars
        cancelUrl: `${backendBase}/api/escrows/payos/cancel`,
        returnUrl: `${backendBase}/api/escrows/payos/success`,
      });
      const checkoutUrl = paymentLinkRes.checkoutUrl;

      let escrow;
      if (prev) {
        const updated = await db.query(
          `UPDATE escrows SET
             amount = $2,
             platform_fee_amount = $3,
             discount_amount = $4,
             voucher_id = $5,
             status = 'PENDING_PAYMENT',
             order_code = $6,
             checkout_url = $7,
             expires_at = $8,
             auto_release_at = NULL,
             dispute_reason = NULL,
             application_id = $9,
             flow = $10,
             assigned_by = $11
           WHERE id = $1
           RETURNING *`,
          [prev.id, amt, feeAmount, discount, voucherId, orderCode, checkoutUrl, expiresAt, applicationId, flow, assignedBy]
        );
        escrow = updated.rows[0];
      } else {
        const inserted = await db.query(
          `INSERT INTO escrows (
             id, task_id, poster_id, tasker_id,
             amount, platform_fee_amount, insurance_fee_amount,
             discount_amount, voucher_id,
             status, order_code, checkout_url, expires_at,
             application_id, flow, assigned_by
           ) VALUES (
             gen_random_uuid(), $1, $2, $3,
             $4, $5, 0,
             $6, $7,
             'PENDING_PAYMENT', $8, $9, $10,
             $11, $12, $13
           )
           RETURNING *`,
          [taskId, posterId, taskerId, amt, feeAmount, discount, voucherId, orderCode, checkoutUrl, expiresAt, applicationId, flow, assignedBy]
        );
        escrow = inserted.rows[0];
      }

      if (redemptionId) {
        await voucherService.attachEscrow(redemptionId, escrow.id, db);
      }

      return {
        escrow,
        checkoutUrl,
        orderCode,
        payAmount,
        discount,
        expiresAt,
        reused: false,
      };
    });
  },

  /**
   * Phase 2: fund the escrow after PayOS confirms payment, then COMMIT the match.
   * Must run inside an existing transaction (db client). Idempotent.
   *
   * Returns:
   *   null                          → orderCode không thuộc escrow nào (caller thử ví topup legacy)
   *   { escrow, alreadyProcessed }  → webhook/confirm gọi lặp
   *   { escrow, conflict }          → task/application không còn hợp lệ → đánh dấu cần hoàn tiền
   *   { escrow, assignedTask, ... } → fund + chốt match thành công
   */
  async fundEscrowByOrderCode(orderCode, db) {
    if (!db) throw new Error('fundEscrowByOrderCode requires a db client');

    const escrow = await escrowModel.lockByOrderCode(orderCode, db);
    if (!escrow) return null;

    if (escrow.status !== 'PENDING_PAYMENT') {
      return { escrow, alreadyProcessed: true };
    }

    const markConflict = async (reason) => {
      await db.query(
        `UPDATE escrows SET status = 'REFUNDED', expires_at = NULL WHERE id = $1`,
        [escrow.id]
      );
      await voucherService.releaseForEscrow(escrow.id, db);
      console.warn(
        `⚠️ [Escrow] Funding conflict (${reason}) — escrow ${escrow.id}, orderCode ${orderCode}. ` +
        'Đã thanh toán nhưng không thể chốt match → cần hoàn tiền PayOS thủ công (admin).'
      );
      return { escrow: { ...escrow, status: 'REFUNDED' }, conflict: reason };
    };

    // Lock task — must still be OPEN
    const taskRes = await db.query('SELECT * FROM tasks WHERE id = $1 FOR UPDATE', [escrow.task_id]);
    const task = taskRes.rows[0];
    if (!task || task.status !== toDbTaskStatus('OPEN')) {
      return markConflict('TASK_NOT_OPEN');
    }

    // Lock application — must still be PENDING
    const appRes = await db.query(
      'SELECT * FROM task_applications WHERE id = $1 FOR UPDATE',
      [escrow.application_id]
    );
    const application = appRes.rows[0];
    if (!application || application.status !== toDbApplicationStatus('PENDING')) {
      return markConflict('APPLICATION_NOT_PENDING');
    }

    if (escrow.flow === 'MATCH') {
      // Matching flow: task chỉ có 1 assignment
      const existingAssignment = await db.query(
        'SELECT id FROM assigned_tasks WHERE task_id = $1 LIMIT 1 FOR UPDATE',
        [escrow.task_id]
      );
      if (existingAssignment.rows.length > 0) {
        return markConflict('TASK_ALREADY_ASSIGNED');
      }
    } else {
      // Accept flow: cùng worker không được gán 2 lần (multi-worker task)
      const dup = await db.query(
        'SELECT id FROM assigned_tasks WHERE task_id = $1 AND tasker_id = $2 AND status != $3 FOR UPDATE',
        [escrow.task_id, escrow.tasker_id, toDbAssignedTaskStatus('CANCELLED')]
      );
      if (dup.rows.length > 0) {
        return markConflict('WORKER_ALREADY_ASSIGNED');
      }
    }

    // FUND: PENDING_PAYMENT → HOLDING
    const fundedRes = await db.query(
      `UPDATE escrows SET status = 'HOLDING', expires_at = NULL WHERE id = $1 RETURNING *`,
      [escrow.id]
    );
    const funded = fundedRes.rows[0];

    // Voucher: RESERVED → CONSUMED
    await voucherService.consumeForEscrow(escrow.id, db);

    // Các pending escrow khác của task này → EXPIRED (first-paid wins)
    const others = await db.query(
      `UPDATE escrows SET status = 'EXPIRED', expires_at = NULL
       WHERE task_id = $1 AND status = 'PENDING_PAYMENT' AND id != $2
       RETURNING id`,
      [escrow.task_id, escrow.id]
    );
    for (const row of others.rows) {
      await voucherService.releaseForEscrow(row.id, db);
    }

    // CHỐT MATCH
    const assignedTask = await assignedTaskModel.create(
      {
        taskId: escrow.task_id,
        taskerId: escrow.tasker_id,
        applicationId: escrow.application_id,
        assignedBy: escrow.assigned_by || 'MANUAL',
      },
      db
    );

    await taskModel.updateFinalPrice(escrow.task_id, parseFloat(escrow.amount), db);
    await taskApplicationModel.updateStatus(escrow.application_id, 'ACCEPTED', db);

    if (escrow.flow === 'MATCH') {
      await taskModel.updateStatus(escrow.task_id, 'IN_PROGRESS', db);
      await taskApplicationModel.rejectAllExcept(escrow.task_id, escrow.application_id, db);
    }
    // flow ACCEPT: task giữ OPEN — worker phải bấm nhận việc trong 15' (sweeper xử lý quá hạn)

    return {
      escrow: funded,
      assignedTask,
      flow: escrow.flow,
      taskId: escrow.task_id,
      posterId: escrow.poster_id,
      taskerId: escrow.tasker_id,
      taskTitle: task.title,
    };
  },

  /**
   * Worker báo "Đã hoàn thành" → bật đồng hồ auto-release 72h.
   * Must run inside an existing transaction.
   */
  async startAutoReleaseForTasker(taskId, taskerId, db) {
    if (!db) throw new Error('startAutoReleaseForTasker requires a db client');
    const autoAt = new Date(Date.now() + AUTO_RELEASE_MS);
    const res = await db.query(
      `UPDATE escrows SET auto_release_at = $3
       WHERE task_id = $1 AND tasker_id = $2 AND status = 'HOLDING'
       RETURNING *`,
      [taskId, taskerId, autoAt]
    );
    return res.rows[0] || null;
  },

  /**
   * Poster khiếu nại → escrow DISPUTED (đóng băng, chờ admin).
   * Must run inside an existing transaction.
   */
  async disputeForTasker({ taskId, taskerId, posterId, reason }, db) {
    if (!db) throw new Error('disputeForTasker requires a db client');
    const res = await db.query(
      `SELECT * FROM escrows WHERE task_id = $1 AND tasker_id = $2 FOR UPDATE`,
      [taskId, taskerId]
    );
    const escrow = res.rows[0];
    if (!escrow) {
      const err = new Error('Không tìm thấy giao dịch ký quỹ.');
      err.statusCode = 404;
      throw err;
    }
    if (escrow.poster_id !== posterId) {
      const err = new Error('Bạn không có quyền khiếu nại giao dịch này.');
      err.statusCode = 403;
      throw err;
    }
    if (escrow.status !== 'HOLDING') {
      const err = new Error(`Không thể khiếu nại giao dịch ở trạng thái ${escrow.status}.`);
      err.statusCode = 400;
      throw err;
    }
    const updated = await db.query(
      `UPDATE escrows SET status = 'DISPUTED', dispute_reason = $2, auto_release_at = NULL
       WHERE id = $1 RETURNING *`,
      [escrow.id, String(reason || '').trim() || null]
    );
    return updated.rows[0];
  },

  /**
   * RELEASE escrow on task completion (for all escrows holding for this task).
   * Must run inside an existing transaction (db client).
   */
  async releaseForTask(taskId, db) {
    if (!db) throw new Error('releaseForTask requires a db client');

    const escrows = await db.query(
      "SELECT * FROM escrows WHERE task_id = $1 AND status = 'HOLDING' FOR UPDATE",
      [taskId]
    );

    for (const escrow of escrows.rows) {
      await this.releaseEscrowRecord(escrow, db);
    }
  },

  /**
   * RELEASE escrow for a specific tasker/worker.
   */
  async releaseForTasker(taskId, taskerId, db) {
    if (!db) throw new Error('releaseForTasker requires a db client');

    const escrows = await db.query(
      "SELECT * FROM escrows WHERE task_id = $1 AND tasker_id = $2 AND status = 'HOLDING' FOR UPDATE",
      [taskId, taskerId]
    );

    if (escrows.rows[0]) {
      await this.releaseEscrowRecord(escrows.rows[0], db);
    }
  },

  /**
   * Release a single escrow record. Dual-path:
   *  - legacy (order_code NULL): trừ ví poster (locked) + cộng ví tasker
   *  - per-job (order_code):     poster đã trả PayOS → chỉ cộng thu nhập tasker
   */
  async releaseEscrowRecord(escrow, db) {
    const amount = parseFloat(escrow.amount);
    const platformFee = parseFloat(escrow.platform_fee_amount);
    const taskerEarning = round2(amount - platformFee);

    // Update escrow status
    await db.query(
      `UPDATE escrows SET status = 'RELEASED', auto_release_at = NULL WHERE id = $1`,
      [escrow.id]
    );

    if (!escrow.order_code) {
      // Legacy wallet-funded escrow: settle poster wallet
      const posterWallet = await walletModel.lockByUserId(escrow.poster_id, db);
      const lockedBalance = parseFloat(posterWallet.locked_balance);
      if (lockedBalance < amount) {
        throw new Error(`Insufficient locked balance to release escrow. Wallet locked balance: ${lockedBalance}, required: ${amount}`);
      }
      await db.query(
        `UPDATE wallets
         SET locked_balance = locked_balance - $2,
             balance        = balance        - $2
         WHERE id = $1`,
        [posterWallet.id, amount]
      );
      await walletTransactionModel.create(
        {
          walletId: posterWallet.id,
          type: 'ESCROW_RELEASE',
          amount: amount,
          status: 'SUCCESS',
          referenceId: escrow.id,
        },
        db
      );
    }
    // per-job escrow: poster không có ví — escrow row chính là chứng từ

    // Credit tasker earnings (sổ thu nhập chờ rút)
    if (taskerEarning > 0) {
      const taskerWallet = await walletModel.lockByUserId(escrow.tasker_id, db);
      await db.query(
        `UPDATE wallets
         SET available_balance = available_balance + $2,
             balance           = balance           + $2
         WHERE id = $1`,
        [taskerWallet.id, taskerEarning]
      );

      await walletTransactionModel.create(
        {
          walletId: taskerWallet.id,
          type: 'ESCROW_RELEASE',
          amount: taskerEarning,
          status: 'SUCCESS',
          referenceId: escrow.id,
        },
        db
      );
    }
  },

  /**
   * REFUND escrow on task cancellation or worker decline (for all escrows holding for this task).
   * Must run inside an existing transaction (db client).
   */
  async refundForTask(taskId, db) {
    if (!db) throw new Error('refundForTask requires a db client');

    const escrows = await db.query(
      "SELECT * FROM escrows WHERE task_id = $1 AND status = 'HOLDING' FOR UPDATE",
      [taskId]
    );

    for (const escrow of escrows.rows) {
      await this.refundEscrowRecord(escrow, db);
    }
  },

  /**
   * REFUND escrow for a specific tasker/worker.
   */
  async refundForTasker(taskId, taskerId, db) {
    if (!db) throw new Error('refundForTasker requires a db client');

    const escrows = await db.query(
      "SELECT * FROM escrows WHERE task_id = $1 AND tasker_id = $2 AND status = 'HOLDING' FOR UPDATE",
      [taskId, taskerId]
    );

    if (escrows.rows[0]) {
      await this.refundEscrowRecord(escrows.rows[0], db);
    }
  },

  /**
   * Refund a single escrow record. Dual-path:
   *  - legacy: locked → available trên ví poster
   *  - per-job: đánh dấu REFUNDED — tiền đã qua PayOS, admin hoàn thủ công
   */
  async refundEscrowRecord(escrow, db) {
    const amount = parseFloat(escrow.amount);

    await db.query(
      `UPDATE escrows SET status = 'REFUNDED', auto_release_at = NULL WHERE id = $1`,
      [escrow.id]
    );

    if (!escrow.order_code) {
      // Legacy wallet-funded: move locked → available
      const posterWallet = await walletModel.lockByUserId(escrow.poster_id, db);
      const lockedBalance = parseFloat(posterWallet.locked_balance);
      if (lockedBalance < amount) {
        throw new Error(`Insufficient locked balance to refund escrow. Wallet locked balance: ${lockedBalance}, required: ${amount}`);
      }
      await db.query(
        `UPDATE wallets
         SET locked_balance    = locked_balance    - $2,
             available_balance = available_balance + $2
         WHERE id = $1`,
        [posterWallet.id, amount]
      );
      await walletTransactionModel.create(
        {
          walletId: posterWallet.id,
          type: 'REFUND',
          amount: amount,
          status: 'SUCCESS',
          referenceId: escrow.id,
        },
        db
      );
    } else {
      console.warn(
        `⚠️ [Escrow] REFUNDED per-job escrow ${escrow.id} (orderCode ${escrow.order_code}, ` +
        `amount ${amount}) — cần hoàn tiền PayOS thủ công cho poster ${escrow.poster_id}.`
      );
    }
  },

  /**
   * Sweeper: PENDING_PAYMENT quá hạn 15' → EXPIRED, nhả voucher, nhả chỗ.
   */
  async expirePendingEscrows() {
    const due = await pool.query(
      `SELECT id FROM escrows WHERE status = 'PENDING_PAYMENT' AND expires_at < NOW()`
    );
    let expired = 0;
    for (const row of due.rows) {
      try {
        await withDbTx(async (db) => {
          const locked = await db.query('SELECT * FROM escrows WHERE id = $1 FOR UPDATE', [row.id]);
          const esc = locked.rows[0];
          if (!esc || esc.status !== 'PENDING_PAYMENT' || !esc.expires_at || new Date(esc.expires_at) > new Date()) {
            return;
          }
          await db.query(`UPDATE escrows SET status = 'EXPIRED' WHERE id = $1`, [esc.id]);
          await voucherService.releaseForEscrow(esc.id, db);
          expired++;
        });
      } catch (err) {
        console.error(`[Escrow] expirePendingEscrows failed for ${row.id}:`, err.message);
      }
    }
    if (expired > 0) console.log(`[Escrow] ⏳ Expired ${expired} pending-payment escrow(s).`);
    return expired;
  },

  /**
   * Sweeper: HOLDING quá auto_release_at (72h sau khi worker submit,
   * poster im lặng) → TỰ NHẢ tiền cho worker + hoàn tất assignment/task.
   */
  async autoReleaseDueEscrows(io) {
    const due = await pool.query(
      `SELECT id FROM escrows
       WHERE status = 'HOLDING' AND auto_release_at IS NOT NULL AND auto_release_at < NOW()`
    );
    let released = 0;
    for (const row of due.rows) {
      try {
        const result = await withDbTx(async (db) => {
          const locked = await db.query('SELECT * FROM escrows WHERE id = $1 FOR UPDATE', [row.id]);
          const esc = locked.rows[0];
          if (
            !esc || esc.status !== 'HOLDING' ||
            !esc.auto_release_at || new Date(esc.auto_release_at) > new Date()
          ) {
            return null;
          }

          // Assignment phải đang SUBMITTED (worker đã báo xong)
          const dbSubmitted = toDbAssignedTaskStatus('SUBMITTED');
          const asgRes = await db.query(
            `SELECT * FROM assigned_tasks
             WHERE task_id = $1 AND tasker_id = $2 AND status = $3
             FOR UPDATE`,
            [esc.task_id, esc.tasker_id, dbSubmitted]
          );
          const assignment = asgRes.rows[0];
          if (!assignment) {
            // Không còn ở trạng thái submit — tắt đồng hồ để tránh quét lặp
            await db.query('UPDATE escrows SET auto_release_at = NULL WHERE id = $1', [esc.id]);
            return null;
          }

          await this.releaseEscrowRecord(esc, db);
          await db.query(
            `UPDATE assigned_tasks SET status = $2 WHERE id = $1`,
            [assignment.id, toDbAssignedTaskStatus('COMPLETED')]
          );

          // Nếu không còn assignment nào đang hoạt động → task COMPLETED
          const activeRes = await db.query(
            `SELECT COUNT(*) AS cnt FROM assigned_tasks
             WHERE task_id = $1 AND status = ANY($2::"AssignedTaskStatus"[])`,
            [esc.task_id, ['ASSIGNED', 'IN_PROGRESS', 'ACTIVE', 'SUBMITTED']]
          );
          if (parseInt(activeRes.rows[0].cnt, 10) === 0) {
            await taskModel.updateStatus(esc.task_id, 'COMPLETED', db);
          }

          return { escrow: esc, assignment };
        });

        if (result) {
          released++;
          console.log(`[Escrow] ✅ Auto-released escrow ${result.escrow.id} (72h không nghiệm thu).`);
          if (io) {
            const task = await taskModel.findById(result.escrow.task_id);
            if (task) {
              io.to(result.escrow.tasker_id).emit('escrow_auto_released', {
                taskId: task.id,
                taskTitle: task.title,
                message: `Tiền công cho công việc "${task.title}" đã được tự động giải ngân sau 72 giờ.`,
              });
              io.to(result.escrow.poster_id).emit('escrow_auto_released', {
                taskId: task.id,
                taskTitle: task.title,
                message: `Công việc "${task.title}" đã tự động nghiệm thu sau 72 giờ do bạn không xác nhận.`,
              });
            }
          }
        }
      } catch (err) {
        console.error(`[Escrow] autoReleaseDueEscrows failed for ${row.id}:`, err.message);
      }
    }
    return released;
  },
};

module.exports = escrowService;
