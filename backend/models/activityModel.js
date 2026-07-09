const pool = require('../config/db');

/**
 * Activity Model — read-only activity feed & summary queries
 */
const activityModel = {
  /** Poster view: tasks the user posted (+applicant stats), filter + search + paginate. */
  async listPosted(userId, { status, search, limit, offset }, db = pool) {
    let whereClause = 'WHERE t.poster_id = $1';
    const queryParams = [userId];
    let paramIndex = 2;

    if (status && status !== 'all') {
      whereClause += ` AND t.status = $${paramIndex++}`;
      queryParams.push(status);
    }

    if (search) {
      whereClause += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const countRes = await db.query(
      `SELECT COUNT(*) as total
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       ${whereClause}`,
      queryParams
    );

    const tasksRes = await db.query(
      `SELECT t.id,
              'POSTED'::text AS activity_type,
              json_build_object(
                'id', t.id,
                'title', t.title,
                'description', t.description,
                'postType', t.post_type,
                'status', t.status,
                'images', t.images,
                'field', CASE WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ELSE NULL END,
                'subcategory', (SELECT json_build_object('id', s.id, 'name', s.name, 'slug', s.slug)
                                 FROM task_required_skills trs
                                 JOIN skills s ON trs.skill_id = s.id
                                 WHERE trs.task_id = t.id
                                 LIMIT 1),
                'budgetMin', t.budget_min,
                'budgetMax', t.budget_max,
                'salaryUnit', t.salary_unit,
                'createdAt', t.created_at,
                'updatedAt', t.updated_at
              ) AS post,
              NULL::json AS participation,
              json_build_object(
                'applicantCount', (SELECT COUNT(*) FROM task_applications WHERE task_id = t.id),
                'hireRequestCount', 0
              ) AS stats
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       ${whereClause}
       ORDER BY t.updated_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...queryParams, limit, offset]
    );

    return { rows: tasksRes.rows, total: parseInt(countRes.rows[0].total) };
  },

  /** Worker view: applications of the user (+task/poster info), filter + search + paginate. */
  async listParticipating(userId, { status, search, limit, offset }, db = pool) {
    let whereClause = 'WHERE ta.tasker_id = $1';
    const queryParams = [userId];
    let paramIndex = 2;

    if (status && status !== 'all') {
      if (status === 'PENDING') {
        whereClause += ` AND ta.status = 'PENDING'`;
      } else if (status === 'ACCEPTED') {
        whereClause += ` AND ta.status = 'ACCEPTED' AND t.status = 'OPEN'`;
      } else if (status === 'IN_PROGRESS') {
        whereClause += ` AND ta.status = 'ACCEPTED' AND t.status = 'IN_PROGRESS'`;
      } else if (status === 'COMPLETED') {
        whereClause += ` AND ta.status = 'ACCEPTED' AND t.status = 'COMPLETED'`;
      } else if (status === 'ENDED') {
        whereClause += ` AND (ta.status IN ('REJECTED', 'CANCELLED') OR t.status = 'CANCELLED')`;
      }
    }

    if (search) {
      whereClause += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const countRes = await db.query(
      `SELECT COUNT(*) as total
       FROM task_applications ta
       JOIN tasks t ON ta.task_id = t.id
       LEFT JOIN categories c ON t.category_id = c.id
       ${whereClause}`,
      queryParams
    );

    const appsRes = await db.query(
      `SELECT ta.id,
              'PARTICIPATING'::text AS activity_type,
              json_build_object(
                'id', t.id,
                'title', t.title,
                'description', t.description,
                'postType', t.post_type,
                'status', t.status,
                'images', t.images,
                'field', CASE WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ELSE NULL END,
                'subcategory', (SELECT json_build_object('id', s.id, 'name', s.name, 'slug', s.slug)
                                 FROM task_required_skills trs
                                 JOIN skills s ON trs.skill_id = s.id
                                 WHERE trs.task_id = t.id
                                 LIMIT 1),
                'budgetMin', t.budget_min,
                'budgetMax', t.budget_max,
                'salaryUnit', t.salary_unit,
                'poster', json_build_object('id', u_owner.id, 'fullName', u_owner.full_name, 'avatarUrl', u_owner.avatar_url, 'phone', u_owner.phone),
                'createdAt', t.created_at,
                'updatedAt', t.updated_at
              ) AS post,
              json_build_object(
                'id', ta.id,
                'type', 'JOB_APPLICATION',
                'status', ta.status,
                'createdAt', t.created_at,
                'updatedAt', t.updated_at
              ) AS participation,
              json_build_object(
                'applicantCount', 0,
                'hireRequestCount', 0
              ) AS stats
       FROM task_applications ta
       JOIN tasks t ON ta.task_id = t.id
       LEFT JOIN categories c ON t.category_id = c.id
       JOIN users u_owner ON t.poster_id = u_owner.id
       ${whereClause}
       ORDER BY t.updated_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...queryParams, limit, offset]
    );

    return { rows: appsRes.rows, total: parseInt(countRes.rows[0].total) };
  },

  /** All posted/participating counters, queried in parallel. */
  async getSummaryCounts(userId, db = pool) {
    const results = await Promise.all([
      db.query(`SELECT COUNT(*) FROM tasks WHERE poster_id = $1`, [userId]),
      db.query(`SELECT COUNT(*) FROM tasks WHERE poster_id = $1 AND status = 'OPEN'`, [userId]),
      db.query(`SELECT COUNT(*) FROM tasks WHERE poster_id = $1 AND status = 'IN_PROGRESS'`, [userId]),
      db.query(`SELECT COUNT(*) FROM tasks WHERE poster_id = $1 AND status = 'COMPLETED'`, [userId]),
      db.query(`SELECT COUNT(*) FROM tasks WHERE poster_id = $1 AND status = 'CANCELLED'`, [userId]),
      db.query(`SELECT COUNT(*) FROM task_applications WHERE tasker_id = $1`, [userId]),
      db.query(`SELECT COUNT(*) FROM task_applications WHERE tasker_id = $1 AND status = 'PENDING'`, [userId]),
      db.query(`SELECT COUNT(*) FROM task_applications ta JOIN tasks t ON ta.task_id = t.id WHERE ta.tasker_id = $1 AND ta.status = 'ACCEPTED' AND t.status = 'OPEN'`, [userId]),
      db.query(`SELECT COUNT(*) FROM task_applications ta JOIN tasks t ON ta.task_id = t.id WHERE ta.tasker_id = $1 AND ta.status = 'ACCEPTED' AND t.status = 'IN_PROGRESS'`, [userId]),
      db.query(`SELECT COUNT(*) FROM task_applications ta JOIN tasks t ON ta.task_id = t.id WHERE ta.tasker_id = $1 AND ta.status = 'ACCEPTED' AND t.status = 'COMPLETED'`, [userId]),
      db.query(`SELECT COUNT(*) FROM task_applications ta JOIN tasks t ON ta.task_id = t.id WHERE ta.tasker_id = $1 AND (ta.status IN ('REJECTED', 'CANCELLED') OR t.status = 'CANCELLED')`, [userId]),
    ]);
    return results.map(r => parseInt(r.rows[0].count));
  },
};

module.exports = activityModel;
