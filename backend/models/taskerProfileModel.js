const pool = require('../config/db');

/**
 * Tasker Profile Model — Database queries for tasker_profiles table
 */
const taskerProfileModel = {
  /**
   * Find tasker profile by user ID
   */
  async findByUserId(userId, db = pool) {
    const result = await db.query(
      'SELECT * FROM tasker_profiles WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get tasker completion rate
   * Calculated from assigned_tasks: completed / total
   */
  async getCompletionRate(taskerId) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
        COUNT(*) AS total
       FROM assigned_tasks
       WHERE tasker_id = $1`,
      [taskerId]
    );

    const { completed, total } = result.rows[0];
    if (parseInt(total) === 0) return 0;
    return parseInt(completed) / parseInt(total);
  },

  /**
   * Get tasker average rating from reviews
   */
  async getAverageRating(taskerId) {
    const result = await pool.query(
      `SELECT AVG(rating) AS avg_rating, COUNT(*) AS review_count
       FROM reviews
       WHERE reviewee_id = $1`,
      [taskerId]
    );

    return {
      averageRating: parseFloat(result.rows[0].avg_rating) || 0,
      reviewCount: parseInt(result.rows[0].review_count),
    };
  },

  /**
   * Get tasker location (latitude, longitude)
   */
  async getLocation(taskerId) {
    const result = await pool.query(
      'SELECT latitude, longitude, location_text FROM tasker_profiles WHERE user_id = $1',
      [taskerId]
    );
    if (result.rows.length === 0) return null;
    return {
      latitude: parseFloat(result.rows[0].latitude),
      longitude: parseFloat(result.rows[0].longitude),
      locationText: result.rows[0].location_text,
    };
  },

  /**
   * Get the average response time of a tasker (in minutes).
   * NOTE: task_applications and tasks use UUID primary keys with no embedded
   * timestamp, so we cannot calculate a real response time without a
   * created_at column. Return the safe default (30 min) until that column
   * is added in a future migration.
   */
  async getAverageResponseTime(taskerId) {
    // TODO: once task_applications.created_at and tasks.created_at are added,
    // replace this with:
    //   SELECT AVG(EXTRACT(EPOCH FROM (ta.created_at - t.created_at)) / 60)
    //   FROM task_applications ta JOIN tasks t ON ta.task_id = t.id
    //   WHERE ta.tasker_id = $1
    return 30; // default 30 minutes
  },
  /**
   * Create a minimal tasker profile for a user who doesn't have one yet.
   * All optional fields default to NULL / 0 so the worker can apply immediately
   * and fill in their full profile later from the Profile screen.
   */
  async createIfNotExists(userId, db = pool) {
    // ON CONFLICT DO NOTHING prevents duplicate-key errors if called concurrently
    const result = await db.query(
      `INSERT INTO tasker_profiles (id, user_id, average_rating)
       VALUES (gen_random_uuid(), $1, 0)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING *`,
      [userId]
    );
    // If the row already existed, fetch it
    if (result.rows.length === 0) {
      return this.findByUserId(userId, db);
    }
    return result.rows[0];
  },
};

module.exports = taskerProfileModel;
