const pool = require('../config/db');

/**
 * Voucher Service — MVP rule: discount never exceeds the platform fee,
 * so the platform never has to top up the escrow with its own cash.
 *
 * Redemption lifecycle (bám theo escrow):
 *   RESERVED  (khi tạo pending escrow)
 *   CONSUMED  (khi escrow được thanh toán / FUNDED)
 *   RELEASED  (khi pending escrow hết hạn / không thanh toán)
 */
const voucherService = {
  /**
   * Validate voucher and reserve a redemption inside the caller's transaction.
   * Returns { voucherId, redemptionId, discount } or throws (statusCode 400).
   */
  async validateAndReserve({ code, userId, taskId, amount, feeAmount }, db) {
    if (!db) throw new Error('validateAndReserve requires a db client');

    const normalized = String(code || '').trim().toUpperCase();
    if (!normalized) {
      const err = new Error('Mã voucher không hợp lệ.');
      err.statusCode = 400;
      throw err;
    }

    // Lock voucher row to avoid over-redemption under concurrency
    const vRes = await db.query(
      'SELECT * FROM vouchers WHERE UPPER(code) = $1 FOR UPDATE',
      [normalized]
    );
    const voucher = vRes.rows[0];
    if (!voucher) {
      const err = new Error('Mã voucher không tồn tại.');
      err.statusCode = 400;
      throw err;
    }

    const now = new Date();
    if (voucher.status !== 'ACTIVE') {
      const err = new Error('Voucher không còn hiệu lực.');
      err.statusCode = 400;
      throw err;
    }
    if (voucher.valid_from && new Date(voucher.valid_from) > now) {
      const err = new Error('Voucher chưa đến thời gian sử dụng.');
      err.statusCode = 400;
      throw err;
    }
    if (voucher.valid_to && new Date(voucher.valid_to) < now) {
      const err = new Error('Voucher đã hết hạn.');
      err.statusCode = 400;
      throw err;
    }
    if (parseInt(voucher.used_count, 10) >= parseInt(voucher.max_uses, 10)) {
      const err = new Error('Voucher đã hết lượt sử dụng.');
      err.statusCode = 400;
      throw err;
    }
    if (parseFloat(voucher.min_order_amount) > Number(amount)) {
      const err = new Error(
        `Voucher chỉ áp dụng cho đơn từ ${parseFloat(voucher.min_order_amount).toLocaleString('vi-VN')}đ.`
      );
      err.statusCode = 400;
      throw err;
    }

    // Per-user limit: count RESERVED + CONSUMED redemptions of this user
    const usedRes = await db.query(
      `SELECT COUNT(*) AS cnt FROM voucher_redemptions
       WHERE voucher_id = $1 AND user_id = $2 AND status IN ('RESERVED', 'CONSUMED')`,
      [voucher.id, userId]
    );
    if (parseInt(usedRes.rows[0].cnt, 10) >= parseInt(voucher.per_user_limit, 10)) {
      const err = new Error('Bạn đã dùng hết lượt của voucher này.');
      err.statusCode = 400;
      throw err;
    }

    // Compute discount
    let discount;
    if (voucher.discount_type === 'PERCENT') {
      discount = Math.round((Number(amount) * parseFloat(voucher.discount_value)) / 100);
      if (voucher.max_discount != null) {
        discount = Math.min(discount, parseFloat(voucher.max_discount));
      }
    } else {
      discount = parseFloat(voucher.discount_value);
    }

    // MVP rule: cap discount at platform fee → sàn không phải bơm tiền mặt
    discount = Math.min(discount, Number(feeAmount));
    discount = Math.max(0, Math.round(discount * 100) / 100);

    const redemption = await db.query(
      `INSERT INTO voucher_redemptions (id, voucher_id, user_id, task_id, discount_amount, status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'RESERVED')
       RETURNING *`,
      [voucher.id, userId, taskId, discount]
    );

    return {
      voucherId: voucher.id,
      redemptionId: redemption.rows[0].id,
      discount,
    };
  },

  /** Link a reserved redemption to its escrow row (same tx as escrow creation). */
  async attachEscrow(redemptionId, escrowId, db) {
    await db.query(
      'UPDATE voucher_redemptions SET escrow_id = $2 WHERE id = $1',
      [redemptionId, escrowId]
    );
  },

  /** Consume the reservation when the escrow is funded (payment confirmed). */
  async consumeForEscrow(escrowId, db) {
    const res = await db.query(
      `UPDATE voucher_redemptions SET status = 'CONSUMED'
       WHERE escrow_id = $1 AND status = 'RESERVED'
       RETURNING voucher_id`,
      [escrowId]
    );
    if (res.rows[0]) {
      await db.query(
        'UPDATE vouchers SET used_count = used_count + 1 WHERE id = $1',
        [res.rows[0].voucher_id]
      );
    }
  },

  /** Release the reservation when the pending escrow expires or is replaced. */
  async releaseForEscrow(escrowId, db = pool) {
    await db.query(
      `UPDATE voucher_redemptions SET status = 'RELEASED'
       WHERE escrow_id = $1 AND status = 'RESERVED'`,
      [escrowId]
    );
  },
};

module.exports = voucherService;
