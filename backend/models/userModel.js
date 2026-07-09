const pool = require('../config/db');

/**
 * User Model — Database queries for users table
 */
const userModel = {
  /**
   * Find user by Firebase UID
   */
  async findByFirebaseUid(firebaseUid) {
    const result = await pool.query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    return result.rows[0] || null;
  },

  /**
   * Find user by UUID
   */
  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Create a new user
   */
  async create({ firebaseUid, fullName, email, phone, avatarUrl, status = 'ACTIVE' }) {
    const fallbackName = fullName || (email ? email.split('@')[0] : 'User');
    const result = await pool.query(
      `INSERT INTO users (id, firebase_uid, full_name, email, phone, avatar_url, status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [firebaseUid, fallbackName, email, phone, avatarUrl, status]
    );
    return result.rows[0];
  },

  /**
   * Update user info
   */
  async update(id, fields) {
    const ALLOWED_COLUMNS = ['firebase_uid', 'full_name', 'email', 'phone', 'avatar_url', 'role', 'status', 'is_verified'];
    const keys = Object.keys(fields);
    
    // Check if any keys are not allowed
    for (const key of keys) {
      if (!ALLOWED_COLUMNS.includes(key)) {
        throw new Error(`Field '${key}' is not allowed for update`);
      }
    }

    if (keys.length === 0) return null;

    const values = keys.map(key => fields[key]);

    const setClause = keys
      .map((key, i) => `"${key}" = $${i + 2}`)
      .join(', ');

    const result = await pool.query(
      `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  },

  /** Search a user by exact phone, excluding the requesting user. */
  async searchByPhone(phone, excludeUserId, db = pool) {
    const result = await db.query(
      `SELECT id, full_name, email, phone, avatar_url, role
       FROM users
       WHERE phone = $1 AND id != $2`,
      [phone, excludeUserId]
    );
    return result.rows[0] || null;
  },

  /** Partial profile update (COALESCE keeps existing values for nulls). */
  async updateProfileById(userId, { fullName, phone, avatarUrl, bio, headline, skillsJson, coverUrl }, db = pool) {
    const result = await db.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           avatar_url = COALESCE($3, avatar_url),
           bio = COALESCE($4, bio),
           headline = COALESCE($5, headline),
           skills = COALESCE($6::jsonb, skills),
           cover_url = COALESCE($7, cover_url)
       WHERE id = $8
       RETURNING id, firebase_uid, full_name, email, phone, avatar_url, cover_url, role, status, is_verified, is_id_verified, bio, headline, skills, created_at`,
      [fullName ?? null, phone ?? null, avatarUrl ?? null, bio ?? null, headline ?? null, skillsJson ?? null, coverUrl ?? null, userId]
    );
    return result.rows[0] || null;
  },

  /** Public profile: base user row + all stat counters (queried in parallel). */
  async getPublicProfileBundle(userId, db = pool) {
    const userResult = await db.query(
      `SELECT id, full_name, avatar_url, cover_url, bio, headline, skills, is_verified, is_id_verified, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );
    if (userResult.rows.length === 0) return null;

    const ratingPromise = db.query(
      `SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as review_count
       FROM reviews
       WHERE reviewee_id = $1`,
      [userId]
    ).catch((ratingErr) => {
      console.warn('Reviews table unavailable, defaulting rating stats to 0:', ratingErr.message);
      return { rows: [{ avg_rating: 0, review_count: 0 }] };
    });

    const completedPromise = db.query(
      `SELECT COUNT(*) as completed_count
       FROM assigned_tasks
       WHERE tasker_id = $1 AND status = 'COMPLETED'`,
      [userId]
    );

    const postedPromise = db.query(
      `SELECT COUNT(*) as posted_count
       FROM tasks
       WHERE poster_id = $1 AND (post_type = 'RECRUITMENT' OR post_type IS NULL) AND status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED')`,
      [userId]
    );

    const servicesPromise = db.query(
      `SELECT COUNT(*) as services_count
       FROM tasks
       WHERE poster_id = $1 AND post_type = 'SERVICE_OFFER' AND status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED')`,
      [userId]
    );

    const activePromise = db.query(
      `SELECT COUNT(*) as active_count
       FROM tasks
       WHERE poster_id = $1 AND status = 'OPEN' AND (post_type = 'RECRUITMENT' OR post_type IS NULL)`,
      [userId]
    );

    const [ratingResult, completedResult, postedResult, servicesResult, activeResult] = await Promise.all([
      ratingPromise, completedPromise, postedPromise, servicesPromise, activePromise,
    ]);

    return {
      user: userResult.rows[0],
      avgRating: parseFloat(ratingResult.rows[0].avg_rating || 0),
      reviewCount: parseInt(ratingResult.rows[0].review_count || 0),
      completedJobsCount: parseInt(completedResult.rows[0].completed_count || 0),
      postedJobsCount: parseInt(postedResult.rows[0].posted_count || 0),
      serviceOffersCount: parseInt(servicesResult.rows[0].services_count || 0),
      activePostsCount: parseInt(activeResult.rows[0].active_count || 0),
    };
  },

  /** Paginated public posts of a user (with total count). */
  async getPostsByUser(userId, { type, limit, offset }, db = pool) {
    const [result, countResult] = await Promise.all([
      db.query(
        `SELECT t.id, t.title, t.description, t.status, t.budget_min, t.budget_max,
                t.final_price, t.created_at, t.post_type, t.salary_unit, t.images,
                c.name as category_name,
                (SELECT COUNT(*) FROM task_applications WHERE task_id = t.id) as applicant_count
         FROM tasks t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.poster_id = $1 AND t.status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED') AND t.post_type = $2
         ORDER BY t.created_at DESC
         LIMIT $3 OFFSET $4`,
        [userId, type, limit, offset]
      ),
      db.query(
        `SELECT COUNT(*) FROM tasks
         WHERE poster_id = $1 AND status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED') AND post_type = $2`,
        [userId, type]
      ),
    ]);
    return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
  },

  /** Paginated reviews received by a user (with total count). */
  async getReviewsByUser(userId, { limit, offset }, db = pool) {
    const [result, countResult] = await Promise.all([
      db.query(
        `SELECT r.id, r.rating, r.comment, r.created_at,
                u.full_name as reviewer_name, u.avatar_url as reviewer_avatar,
                t.title as task_name
         FROM reviews r
         LEFT JOIN users u ON r.reviewer_id = u.id
         LEFT JOIN tasks t ON r.task_id = t.id
         WHERE r.reviewee_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1', [userId]),
    ]);
    return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
  },

  /** Deprecated role reset — always sets USER and ensures tasker profile exists. */
  async resetRoleToUser(userId, db = pool) {
    const result = await db.query(
      `UPDATE users
       SET role = 'USER'
       WHERE id = $1
       RETURNING id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, created_at`,
      [userId]
    );
    if (result.rows.length === 0) return null;

    await db.query(
      `INSERT INTO tasker_profiles (id, user_id, bio, experience, portfolio_url, location_text, latitude, longitude, average_rating)
       VALUES (gen_random_uuid(), $1, 'Thành viên mới', '', '', '', 10.7769, 106.7009, 5.0)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
    return result.rows[0];
  },

  /**
   * Create CCCD verification record + documents, auto-approve (testing convenience).
   * Runs its own transaction.
   */
  async createVerification(userId, { frontImageUrl, backImageUrl, selfieImageUrl }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const verificationResult = await client.query(
        `INSERT INTO user_verifications (user_id, type, status)
         VALUES ($1, 'cccd', 'pending')
         RETURNING id`,
        [userId]
      );
      const verificationId = verificationResult.rows[0].id;

      await client.query(
        `INSERT INTO verification_documents (verification_id, front_image_url, back_image_url, selfie_image_url)
         VALUES ($1, $2, $3, $4)`,
        [verificationId, frontImageUrl, backImageUrl, selfieImageUrl]
      );

      const userResult = await client.query(
        `UPDATE users
         SET is_id_verified = true
         WHERE id = $1
         RETURNING id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, is_id_verified, created_at`,
        [userId]
      );

      await client.query('COMMIT');
      return userResult.rows[0];
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      throw e;
    } finally {
      client.release();
    }
  },

  /** Soft-delete: BAN account and scramble the display name. */
  async softDeleteById(userId, db = pool) {
    const result = await db.query(
      `UPDATE users
       SET status = 'BANNED', full_name = concat(full_name, '_deleted_', gen_random_uuid())
       WHERE id = $1 AND status != 'BANNED'
       RETURNING id, email, status`,
      [userId]
    );
    return result.rows[0] || null;
  },
};

module.exports = userModel;
