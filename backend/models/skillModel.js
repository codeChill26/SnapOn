const pool = require('../config/db');

/**
 * Skill Model — Database queries for skills table
 */
const skillModel = {
  /** Resolve a skill UUID from its slug. Returns null if not found. */
  async findIdBySlug(slug, db = pool) {
    const result = await db.query('SELECT id FROM skills WHERE slug = $1', [slug]);
    return result.rows[0] ? result.rows[0].id : null;
  },

  /** Category ids of the given skills (for field/subcategory validation). */
  async findCategoryIds(ids, db = pool) {
    if (!ids || ids.length === 0) return [];
    const result = await db.query(
      'SELECT category_id FROM skills WHERE id = ANY($1::uuid[])',
      [ids]
    );
    return result.rows.map(r => r.category_id);
  },

  /**
   * Find skills by array of IDs
   */
  async findByIds(ids) {
    if (!ids || ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(
      `SELECT * FROM skills WHERE id IN (${placeholders})`,
      ids
    );
    return result.rows;
  },

  /**
   * Find all skills (optional: by category)
   */
  async findAll(categoryId = null) {
    if (categoryId) {
      const result = await pool.query(
        `SELECT s.*, c.name AS category_name
         FROM skills s
         LEFT JOIN categories c ON s.category_id = c.id
         WHERE s.category_id = $1
         ORDER BY s.name`,
        [categoryId]
      );
      return result.rows;
    }

    const result = await pool.query(
      `SELECT s.*, c.name AS category_name
       FROM skills s
       LEFT JOIN categories c ON s.category_id = c.id
       ORDER BY s.name`
    );
    return result.rows;
  },

  /**
   * Find skill by ID
   */
  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM skills WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = skillModel;
