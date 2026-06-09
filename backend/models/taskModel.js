const pool = require('../config/db');
const { PAGINATION } = require('../utils/constants');
const {
  toDbTaskStatus,
  fromDbTaskStatus,
  toDbTaskType,
  fromDbTaskType,
} = require('../utils/dbEnum');

/**
 * Task Model — Database queries for tasks table
 */
const taskModel = {
  /**
   * Create a new task
   */
  async create({
    posterId,
    categoryId,
    title,
    description,
    taskType,
    budgetMin,
    budgetMax,
    deadlineStart,
    deadlineEnd,
    allowInsurance = false,
  }) {
    const dbTaskType = toDbTaskType(taskType);
    const result = await pool.query(
      `INSERT INTO tasks (
        poster_id, category_id, title, description, task_type,
        status, budget_min, budget_max, deadline_start, deadline_end, allow_insurance
      ) VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        posterId, categoryId, title, description, dbTaskType,
        budgetMin, budgetMax, deadlineStart, deadlineEnd, allowInsurance,
      ]
    );
    const task = result.rows[0];
    if (task) {
      task.status = fromDbTaskStatus(task.status);
      task.task_type = fromDbTaskType(task.task_type);
    }
    return task;
  },

  /**
   * Find task by ID with category info
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT t.*, 
              c.name AS category_name, c.slug AS category_slug,
              u.full_name AS poster_name, u.avatar_url AS poster_avatar
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN users u ON t.poster_id = u.id
       WHERE t.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;

    const task = result.rows[0];

    // Map enums from DB -> API
    task.status = fromDbTaskStatus(task.status);
    task.task_type = fromDbTaskType(task.task_type);

    // Get required skills
    const skills = await pool.query(
      `SELECT s.id, s.name, s.slug
       FROM task_required_skills trs
       JOIN skills s ON trs.skill_id = s.id
       WHERE trs.task_id = $1`,
      [id]
    );
    task.required_skills = skills.rows;

    // Get locations
    const locations = await pool.query(
      `SELECT id, location_type, address, latitude, longitude
       FROM task_locations
       WHERE task_id = $1`,
      [id]
    );
    task.locations = locations.rows;

    // Get application count
    const appCount = await pool.query(
      `SELECT COUNT(*) as count FROM task_applications WHERE task_id = $1`,
      [id]
    );
    task.application_count = parseInt(appCount.rows[0].count);

    return task;
  },

  /**
   * Find base task row (no joins) — optionally inside a transaction.
   */
  async findBaseById(id, db = pool) {
    const result = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    const task = result.rows[0] || null;
    if (!task) return null;
    task.status = fromDbTaskStatus(task.status);
    task.task_type = fromDbTaskType(task.task_type);
    return task;
  },

  /**
   * Find all tasks with filters and pagination
   */
  async findAll({ status, categoryId, taskType, search, page, limit } = {}) {
    const currentPage = page || PAGINATION.DEFAULT_PAGE;
    const currentLimit = Math.min(limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const offset = (currentPage - 1) * currentLimit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND t.status = $${paramIndex++}`;
      params.push(toDbTaskStatus(status));
    }
    if (categoryId) {
      whereClause += ` AND t.category_id = $${paramIndex++}`;
      params.push(categoryId);
    }
    if (taskType) {
      whereClause += ` AND t.task_type = $${paramIndex++}`;
      params.push(toDbTaskType(taskType));
    }
    if (search) {
      whereClause += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM tasks t ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get tasks
    const result = await pool.query(
      `SELECT t.*, 
              c.name AS category_name, c.slug AS category_slug,
              u.full_name AS poster_name, u.avatar_url AS poster_avatar,
              (SELECT COUNT(*) FROM task_applications ta WHERE ta.task_id = t.id) AS application_count
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN users u ON t.poster_id = u.id
       ${whereClause}
       ORDER BY t.id DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, currentLimit, offset]
    );

    // Map enums for API
    for (const t of result.rows) {
      t.status = fromDbTaskStatus(t.status);
      t.task_type = fromDbTaskType(t.task_type);
    }

    return {
      tasks: result.rows,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages: Math.ceil(total / currentLimit),
      },
    };
  },

  /**
   * Find tasks by poster ID
   */
  async findByPosterId(posterId, { page, limit } = {}) {
    const currentPage = page || PAGINATION.DEFAULT_PAGE;
    const currentLimit = Math.min(limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const offset = (currentPage - 1) * currentLimit;

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM tasks WHERE poster_id = $1',
      [posterId]
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await pool.query(
      `SELECT t.*, 
              c.name AS category_name, c.slug AS category_slug,
              (SELECT COUNT(*) FROM task_applications ta WHERE ta.task_id = t.id) AS application_count
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.poster_id = $1
       ORDER BY t.id DESC
       LIMIT $2 OFFSET $3`,
      [posterId, currentLimit, offset]
    );

    for (const t of result.rows) {
      t.status = fromDbTaskStatus(t.status);
      t.task_type = fromDbTaskType(t.task_type);
    }

    return {
      tasks: result.rows,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages: Math.ceil(total / currentLimit),
      },
    };
  },

  /**
   * Update task status
   */
  async updateStatus(id, status, db = pool) {
    const dbStatus = toDbTaskStatus(status);
    const result = await db.query(
      'UPDATE tasks SET status = $2 WHERE id = $1 RETURNING *',
      [id, dbStatus]
    );
    const task = result.rows[0] || null;
    if (task) {
      task.status = fromDbTaskStatus(task.status);
      task.task_type = fromDbTaskType(task.task_type);
    }
    return task;
  },

  /**
   * Update final price
   */
  async updateFinalPrice(id, finalPrice, db = pool) {
    const result = await db.query(
      'UPDATE tasks SET final_price = $2 WHERE id = $1 RETURNING *',
      [id, finalPrice]
    );
    return result.rows[0] || null;
  },

  /**
   * Add required skills to task
   */
  async addRequiredSkills(taskId, skillIds) {
    if (!skillIds || skillIds.length === 0) return [];

    const values = skillIds
      .map((_, i) => `($1, $${i + 2})`)
      .join(', ');

    const result = await pool.query(
      `INSERT INTO task_required_skills (task_id, skill_id)
       VALUES ${values}
       RETURNING *`,
      [taskId, ...skillIds]
    );
    return result.rows;
  },

  /**
   * Add location to task
   */
  async addLocation(taskId, { locationType, address, latitude, longitude }) {
    const result = await pool.query(
      `INSERT INTO task_locations (task_id, location_type, address, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [taskId, locationType, address, latitude, longitude]
    );
    return result.rows[0];
  },

  /**
   * Update task details
   */
  async update(id, {
    categoryId,
    title,
    description,
    taskType,
    budgetMin,
    budgetMax,
    deadlineStart,
    deadlineEnd,
    allowInsurance,
  }, db = pool) {
    const dbTaskType = taskType ? toDbTaskType(taskType) : undefined;
    const result = await db.query(
      `UPDATE tasks
       SET category_id = COALESCE($2, category_id),
           title = COALESCE($3, title),
           description = COALESCE($4, description),
           task_type = COALESCE($5, task_type),
           budget_min = COALESCE($6, budget_min),
           budget_max = COALESCE($7, budget_max),
           deadline_start = COALESCE($8, deadline_start),
           deadline_end = COALESCE($9, deadline_end),
           allow_insurance = COALESCE($10, allow_insurance),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        id, categoryId, title, description, dbTaskType,
        budgetMin, budgetMax, deadlineStart, deadlineEnd, allowInsurance
      ]
    );
    const task = result.rows[0] || null;
    if (task) {
      task.status = fromDbTaskStatus(task.status);
      task.task_type = fromDbTaskType(task.task_type);
    }
    return task;
  },

  /**
   * Delete a task
   */
  async delete(id, db = pool) {
    const result = await db.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING *',
      [id]
    );
    const task = result.rows[0] || null;
    if (task) {
      task.status = fromDbTaskStatus(task.status);
      task.task_type = fromDbTaskType(task.task_type);
    }
    return task;
  },
};

module.exports = taskModel;
