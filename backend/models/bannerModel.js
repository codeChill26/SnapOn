'use strict';

const pool = require('../config/db');

/**
 * Banner Model — Database queries for banners table
 */
const bannerModel = {
  /**
   * Create a new banner
   */
  async create({
    code,
    title,
    subtitle,
    imageUrl,
    categoryId,
    placement,
    actionType,
    actionValue,
    displayOrder,
    isActive = true,
    startAt = null,
    endAt = null,
  }, db = pool) {
    const result = await db.query(
      `INSERT INTO banners (
        id, code, title, subtitle, image_url, category_id, placement,
        action_type, action_value, display_order, is_active, start_at, end_at
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        code, title, subtitle, imageUrl, categoryId, placement,
        actionType, actionValue, displayOrder, isActive, startAt, endAt
      ]
    );
    return result.rows[0];
  },

  /**
   * Find a banner by ID with category info
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT b.*, 
              c.name AS category_name, c.slug AS category_slug
       FROM banners b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Find a banner by Code
   */
  async findByCode(code) {
    const result = await pool.query(
      `SELECT * FROM banners WHERE code = $1`,
      [code]
    );
    return result.rows[0] || null;
  },

  /**
   * Get all active banners for a specific placement within valid timeframe
   */
  async findActiveBanners(placement, now = new Date()) {
    const result = await pool.query(
      `SELECT b.*, 
              c.name AS category_name, c.slug AS category_slug
       FROM banners b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.placement = $1
         AND b.is_active = true
         AND (b.start_at IS NULL OR b.start_at <= $2)
         AND (b.end_at IS NULL OR b.end_at >= $2)
       ORDER BY b.display_order ASC`,
      [placement, now]
    );
    return result.rows;
  },

  /**
   * Find all banners with simple filters for Admin
   */
  async findAll({ placement, isActive } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (placement) {
      whereClause += ` AND b.placement = $${paramIndex++}`;
      params.push(placement);
    }
    if (isActive !== undefined) {
      whereClause += ` AND b.is_active = $${paramIndex++}`;
      params.push(isActive);
    }

    const result = await pool.query(
      `SELECT b.*, 
              c.name AS category_name, c.slug AS category_slug
       FROM banners b
       LEFT JOIN categories c ON b.category_id = c.id
       ${whereClause}
       ORDER BY b.placement ASC, b.display_order ASC`,
      params
    );
    return result.rows;
  },

  /**
   * Update banner details
   */
  async update(id, {
    code,
    title,
    subtitle,
    imageUrl,
    categoryId,
    placement,
    actionType,
    actionValue,
    displayOrder,
    isActive,
    startAt,
    endAt,
  }, db = pool) {
    const result = await db.query(
      `UPDATE banners
       SET code = COALESCE($2, code),
           title = COALESCE($3, title),
           subtitle = COALESCE($4, subtitle),
           image_url = COALESCE($5, image_url),
           category_id = COALESCE($6, category_id),
           placement = COALESCE($7, placement),
           action_type = COALESCE($8, action_type),
           action_value = COALESCE($9, action_value),
           display_order = COALESCE($10, display_order),
           is_active = COALESCE($11, is_active),
           start_at = COALESCE($12, start_at),
           end_at = COALESCE($13, end_at),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        id, code, title, subtitle, imageUrl, categoryId, placement,
        actionType, actionValue, displayOrder, isActive, startAt, endAt
      ]
    );
    return result.rows[0] || null;
  },

  /**
   * Update banner status (is_active)
   */
  async updateStatus(id, isActive, db = pool) {
    const result = await db.query(
      `UPDATE banners
       SET is_active = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, isActive]
    );
    return result.rows[0] || null;
  },

  /**
   * Delete a banner
   */
  async delete(id, db = pool) {
    const result = await db.query(
      'DELETE FROM banners WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = bannerModel;
