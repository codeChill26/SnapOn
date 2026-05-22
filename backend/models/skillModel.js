const pool = require('../config/db');

/**
 * Skill Model — Database queries for skills table
 */
const skillModel = {
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
