const pool = require('../config/db');

/**
 * Category Model — Database queries for categories table
 */
const categoryModel = {
  /** Resolve a category UUID from its slug. Returns null if not found. */
  async findIdBySlug(slug, db = pool) {
    const result = await db.query('SELECT id FROM categories WHERE slug = $1', [slug]);
    return result.rows[0] ? result.rows[0].id : null;
  },
};

module.exports = categoryModel;
