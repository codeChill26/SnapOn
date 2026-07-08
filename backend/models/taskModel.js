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
    images = [],
    postType = 'RECRUITMENT',
    workMode = 'ONSITE',
    salaryUnit = 'PER_JOB',
    employmentType = 'ONE_TIME',
    peopleNeeded = 1,
    contactPhone,
    startDate,
    experienceLevel = 'NO_REQUIREMENT',
    educationLevel = 'NO_REQUIREMENT',
    genderRequirement = 'NO_REQUIREMENT',
    minAge,
    maxAge,
    minHeightCm,
    maxHeightCm,
    hashtags = [],
    applicationDeadline,
  }) {
    const dbTaskType = toDbTaskType(taskType);
    const result = await pool.query(
      `INSERT INTO tasks (
        id, poster_id, category_id, title, description, task_type,
        status, budget_min, budget_max, deadline_start, deadline_end, allow_insurance, images,
        post_type, work_mode, salary_unit, employment_type, people_needed, contact_phone,
        start_date, experience_level, education_level, gender_requirement, min_age, max_age,
        min_height_cm, max_height_cm, hashtags, application_deadline
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, 'OPEN', $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      )
      RETURNING *`,
      [
        posterId, categoryId, title, description, dbTaskType,
        budgetMin, budgetMax, deadlineStart, deadlineEnd, allowInsurance, images,
        postType, workMode, salaryUnit, employmentType, peopleNeeded, contactPhone,
        startDate, experienceLevel, educationLevel, genderRequirement, minAge, maxAge,
        minHeightCm, maxHeightCm, hashtags, applicationDeadline,
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
  async findById(id, currentUserId = null) {
    const result = await pool.query(
      `SELECT t.*, 
              c.name AS category_name, c.slug AS category_slug,
              CASE WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ELSE NULL END AS field,
              sub.subcategory,
              u.full_name AS poster_name, u.avatar_url AS poster_avatar,
              EXISTS (
                SELECT 1 FROM saved_tasks st
                WHERE st.task_id = t.id AND st.user_id = $2
              ) AS is_saved
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN users u ON t.poster_id = u.id
       LEFT JOIN LATERAL (
         SELECT json_build_object('id', s.id, 'name', s.name, 'slug', s.slug) AS subcategory
         FROM task_required_skills trs
         JOIN skills s ON trs.skill_id = s.id
         WHERE trs.task_id = t.id
         LIMIT 1
       ) sub ON true
       WHERE t.id = $1`,
      [id, currentUserId]
    );
    if (result.rows.length === 0) return null;

    const task = result.rows[0];

    // Map enums from DB -> API
    task.status = fromDbTaskStatus(task.status);
    task.task_type = fromDbTaskType(task.task_type);

    // Chạy song song các truy vấn phụ thuộc để lấy thông tin chi tiết task
    const [skillsResult, locationsResult, appCountResult, assignmentResult] = await Promise.all([
      pool.query(
        `SELECT s.id, s.name, s.slug
         FROM task_required_skills trs
         JOIN skills s ON trs.skill_id = s.id
         WHERE trs.task_id = $1`,
        [id]
      ),
      pool.query(
        `SELECT id, location_type, address, latitude, longitude
         FROM task_locations
         WHERE task_id = $1`,
        [id]
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM task_applications WHERE task_id = $1`,
        [id]
      ),
      pool.query(
        `SELECT at.id AS assignment_id, at.status AS assignment_status,
                u.id AS worker_id, u.full_name AS worker_name, u.avatar_url AS worker_avatar, u.phone AS worker_phone,
                ta.bid_price AS final_bid_price, ta.estimated_time AS final_estimated_time, ta.message AS final_message
         FROM assigned_tasks at
         JOIN users u ON at.tasker_id = u.id
         LEFT JOIN task_applications ta ON at.application_id = ta.id
         WHERE at.task_id = $1`,
        [id]
      )
    ]);

    task.required_skills = skillsResult.rows;
    task.locations = locationsResult.rows;
    task.application_count = parseInt(appCountResult.rows[0].count);

    if (assignmentResult.rows.length > 0) {
      task.assigned_worker = {
        id: assignmentResult.rows[0].worker_id,
        name: assignmentResult.rows[0].worker_name,
        avatar_url: assignmentResult.rows[0].worker_avatar,
        phone: assignmentResult.rows[0].worker_phone,
        assignment_id: assignmentResult.rows[0].assignment_id,
        status: assignmentResult.rows[0].assignment_status,
        bid_price: assignmentResult.rows[0].final_bid_price ? parseFloat(assignmentResult.rows[0].final_bid_price) : null,
        estimated_time: assignmentResult.rows[0].final_estimated_time,
        message: assignmentResult.rows[0].final_message,
      };
    } else {
      task.assigned_worker = null;
    }

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
  async findAll({ status, categoryId, fieldId, taskType, search, page, limit, postType, workMode, salaryUnit, currentUserId } = {}) {
    const currentPage = page || PAGINATION.DEFAULT_PAGE;
    const currentLimit = Math.min(limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const offset = (currentPage - 1) * currentLimit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      if (status === 'OPEN') {
        whereClause += ` AND t.status = 'OPEN' AND (t.application_deadline IS NULL OR t.application_deadline > CURRENT_TIMESTAMP)`;
      } else {
        whereClause += ` AND t.status = $${paramIndex++}`;
        params.push(toDbTaskStatus(status));
      }
    }
    if (fieldId) {
      whereClause += ` AND t.category_id = $${paramIndex++}`;
      params.push(fieldId);
    }
    if (categoryId) {
      whereClause += ` AND EXISTS (SELECT 1 FROM task_required_skills trs WHERE trs.task_id = t.id AND trs.skill_id = $${paramIndex++})`;
      params.push(categoryId);
    }
    if (taskType) {
      whereClause += ` AND t.task_type = $${paramIndex++}`;
      params.push(toDbTaskType(taskType));
    }
    if (postType) {
      whereClause += ` AND t.post_type = $${paramIndex++}`;
      params.push(postType);
    }
    if (workMode) {
      whereClause += ` AND t.work_mode = $${paramIndex++}`;
      params.push(workMode);
    }
    if (salaryUnit) {
      whereClause += ` AND t.salary_unit = $${paramIndex++}`;
      params.push(salaryUnit);
    }
    if (search) {
      whereClause += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Chạy song song truy vấn đếm tổng số lượng và truy vấn lấy dữ liệu tasks để giảm độ trễ
    const [countResult, result] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as total FROM tasks t ${whereClause}`,
        params
      ),
      pool.query(
        `SELECT t.*, 
                c.name AS category_name, c.slug AS category_slug,
                CASE WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ELSE NULL END AS field,
                sub.subcategory,
                u.full_name AS poster_name, u.avatar_url AS poster_avatar,
                (SELECT COUNT(*) FROM task_applications ta WHERE ta.task_id = t.id) AS application_count,
                EXISTS (
                  SELECT 1 FROM saved_tasks st
                  WHERE st.task_id = t.id AND st.user_id = $${paramIndex}
                ) AS is_saved
         FROM tasks t
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN users u ON t.poster_id = u.id
         LEFT JOIN LATERAL (
           SELECT json_build_object('id', s.id, 'name', s.name, 'slug', s.slug) AS subcategory
           FROM task_required_skills trs
           JOIN skills s ON trs.skill_id = s.id
           WHERE trs.task_id = t.id
           LIMIT 1
         ) sub ON true
         ${whereClause}
         ORDER BY t.id DESC
         LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`,
        [...params, currentUserId || null, currentLimit, offset]
      )
    ]);
    const total = parseInt(countResult.rows[0].total);

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
   * Save a task for a user.
   */
  async saveForUser(userId, taskId) {
    const result = await pool.query(
      `INSERT INTO saved_tasks (id, user_id, task_id)
       VALUES (gen_random_uuid(), $1, $2)
       ON CONFLICT (user_id, task_id) DO NOTHING
       RETURNING *`,
      [userId, taskId]
    );

    return result.rows[0] || null;
  },

  /**
   * Remove a saved task for a user.
   */
  async unsaveForUser(userId, taskId) {
    await pool.query(
      'DELETE FROM saved_tasks WHERE user_id = $1 AND task_id = $2',
      [userId, taskId]
    );
  },

  /**
   * Find saved tasks for a user.
   */
  async findSavedByUser(userId, { page, limit } = {}) {
    const currentPage = page || PAGINATION.DEFAULT_PAGE;
    const currentLimit = Math.min(limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const offset = (currentPage - 1) * currentLimit;

    // Chạy song song truy vấn đếm tổng số lượng và truy vấn lấy dữ liệu saved tasks
    const [countResult, result] = await Promise.all([
      pool.query(
        'SELECT COUNT(*) as total FROM saved_tasks WHERE user_id = $1',
        [userId]
      ),
      pool.query(
        `SELECT t.*,
                c.name AS category_name, c.slug AS category_slug,
                CASE WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ELSE NULL END AS field,
                sub.subcategory,
                u.full_name AS poster_name, u.avatar_url AS poster_avatar,
                (SELECT COUNT(*) FROM task_applications ta WHERE ta.task_id = t.id) AS application_count,
                TRUE AS is_saved,
                st.created_at AS saved_at
         FROM saved_tasks st
         JOIN tasks t ON st.task_id = t.id
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN users u ON t.poster_id = u.id
         LEFT JOIN LATERAL (
           SELECT json_build_object('id', s.id, 'name', s.name, 'slug', s.slug) AS subcategory
           FROM task_required_skills trs
           JOIN skills s ON trs.skill_id = s.id
           WHERE trs.task_id = t.id
           LIMIT 1
         ) sub ON true
         WHERE st.user_id = $1
         ORDER BY st.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, currentLimit, offset]
      )
    ]);
    const total = parseInt(countResult.rows[0].total);

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

    // Chạy song song truy vấn đếm tổng số lượng và truy vấn lấy danh sách tasks của poster
    const [countResult, result] = await Promise.all([
      pool.query(
        'SELECT COUNT(*) as total FROM tasks WHERE poster_id = $1',
        [posterId]
      ),
      pool.query(
        `SELECT t.*, 
                c.name AS category_name, c.slug AS category_slug,
                CASE WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ELSE NULL END AS field,
                sub.subcategory,
                (SELECT COUNT(*) FROM task_applications ta WHERE ta.task_id = t.id) AS application_count
         FROM tasks t
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN LATERAL (
           SELECT json_build_object('id', s.id, 'name', s.name, 'slug', s.slug) AS subcategory
           FROM task_required_skills trs
           JOIN skills s ON trs.skill_id = s.id
           WHERE trs.task_id = t.id
           LIMIT 1
         ) sub ON true
         WHERE t.poster_id = $1
         ORDER BY t.id DESC
         LIMIT $2 OFFSET $3`,
        [posterId, currentLimit, offset]
      )
    ]);
    const total = parseInt(countResult.rows[0].total);

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
   * Close recruitment for a task
   */
  async closeRecruitment(id, closedById, closedReason, db = pool) {
    const result = await db.query(
      `UPDATE tasks 
       SET status = 'CLOSED', 
           closed_at = CURRENT_TIMESTAMP, 
           closed_by_id = $2, 
           closed_reason = $3 
       WHERE id = $1 
       RETURNING *`,
      [id, closedById, closedReason]
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
      .map((_, i) => `(gen_random_uuid(), $1, $${i + 2})`)
      .join(', ');

    const result = await pool.query(
      `INSERT INTO task_required_skills (id, task_id, skill_id)
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
      `INSERT INTO task_locations (id, task_id, location_type, address, latitude, longitude)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING *`,
      [taskId, locationType, address, latitude, longitude]
    );
    return result.rows[0];
  },

  /**
   * Update task details
   */
  async update(id, fields, db = pool) {
    const ALLOWED_COLUMNS = [
      'category_id',
      'title',
      'description',
      'task_type',
      'budget_min',
      'budget_max',
      'deadline_start',
      'deadline_end',
      'allow_insurance',
      'images',
      'post_type',
      'work_mode',
      'salary_unit',
      'employment_type',
      'people_needed',
      'contact_phone',
      'start_date',
      'experience_level',
      'education_level',
      'gender_requirement',
      'min_age',
      'max_age',
      'min_height_cm',
      'max_height_cm',
      'hashtags',
      'application_deadline',
    ];

    const CAMEL_TO_SNAKE = {
      categoryId: 'category_id',
      title: 'title',
      description: 'description',
      taskType: 'task_type',
      budgetMin: 'budget_min',
      budgetMax: 'budget_max',
      deadlineStart: 'deadline_start',
      deadlineEnd: 'deadline_end',
      allowInsurance: 'allow_insurance',
      images: 'images',
      postType: 'post_type',
      workMode: 'work_mode',
      salaryUnit: 'salary_unit',
      employmentType: 'employment_type',
      peopleNeeded: 'people_needed',
      contactPhone: 'contact_phone',
      startDate: 'start_date',
      experienceLevel: 'experience_level',
      educationLevel: 'education_level',
      genderRequirement: 'gender_requirement',
      minAge: 'min_age',
      maxAge: 'max_age',
      minHeightCm: 'min_height_cm',
      maxHeightCm: 'max_height_cm',
      hashtags: 'hashtags',
      applicationDeadline: 'application_deadline',
    };

    const dbFields = {};
    const keys = Object.keys(fields || {});

    for (const key of keys) {
      if (fields[key] !== undefined) {
        const dbKey = CAMEL_TO_SNAKE[key];
        if (!dbKey) {
          throw new Error(`Field '${key}' is not allowed for update`);
        }
        if (!ALLOWED_COLUMNS.includes(dbKey)) {
          throw new Error(`Field '${dbKey}' is not allowed for update`);
        }

        if (key === 'taskType') {
          dbFields[dbKey] = fields[key] ? toDbTaskType(fields[key]) : null;
        } else {
          dbFields[dbKey] = fields[key];
        }
      }
    }

    const updateKeys = Object.keys(dbFields);
    if (updateKeys.length === 0) {
      const result = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
      const task = result.rows[0] || null;
      if (task) {
        task.status = fromDbTaskStatus(task.status);
        task.task_type = fromDbTaskType(task.task_type);
      }
      return task;
    }

    const values = updateKeys.map(key => dbFields[key]);
    const setClause = updateKeys
      .map((key, i) => `"${key}" = $${i + 2}`)
      .join(', ');

    const result = await db.query(
      `UPDATE tasks
       SET ${setClause},
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, ...values]
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
