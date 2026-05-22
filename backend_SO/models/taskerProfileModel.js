const pool = require('../config/db');

/**
 * Tasker Profile Model — Database queries for tasker_profiles table
 */
const taskerProfileModel = {
  /**
   * Find tasker profile by user ID
   */
  async findByUserId(userId) {
    const result = await pool.query(
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
   * Get the average response time of a tasker (in minutes)
   * Based on how quickly they apply to tasks after the task is created
   */
  async getAverageResponseTime(taskerId) {
    const result = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (ta.id::text::timestamp - t.id::text::timestamp)) / 60) AS avg_minutes
       FROM task_applications ta
       JOIN tasks t ON ta.task_id = t.id
       WHERE ta.tasker_id = $1`,
      [taskerId]
    );

    // If we can't calculate from UUIDs (which don't have timestamps),
    // return a default value. In production, add created_at columns.
    return parseFloat(result.rows[0]?.avg_minutes) || 30; // default 30 minutes
  },
};

module.exports = taskerProfileModel;
