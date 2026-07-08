const pool = require('../config/db');
const cacheService = require('../services/cacheService');
const withDbTx = require('../utils/withDbTx');
const { success, error, paginated } = require('../utils/responseHandler');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * User Controller
 * Standardized API handlers for profile management, public reviews, image uploads, and verification
 */

// GET /api/users/profile
exports.getProfile = async (req, res, next) => {
  try {
    return success(res, { user: req.user }, 'User authenticated successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/users/search
exports.searchUser = async (req, res, next) => {
  const { phone } = req.query;
  if (!phone) {
    return error(res, 'Phone number is required', 400);
  }

  try {
    const trimmedPhone = phone.trim();
    // Query users by phone, excluding current user
    const result = await pool.query(
      `SELECT id, full_name, email, phone, avatar_url, role 
       FROM users 
       WHERE phone = $1 AND id != $2`,
      [trimmedPhone, req.user.id]
    );

    if (result.rows.length === 0) {
      return success(res, { user: null }, 'No user found with this phone number.');
    }

    const foundUser = result.rows[0];
    const mappedUser = {
      id: foundUser.id,
      fullName: foundUser.full_name,
      email: foundUser.email,
      phone: foundUser.phone,
      avatarUrl: foundUser.avatar_url,
      role: foundUser.role,
    };

    return success(res, { user: mappedUser }, 'User retrieved successfully.');
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/profile
exports.updateProfile = async (req, res, next) => {
  const { fullName, phone, avatarUrl, bio, headline, skills, coverUrl } = req.body;
  console.log('Profile update request:', { body: req.body, userId: req.user.id });
  try {
    const skillsJson = skills !== undefined ? (Array.isArray(skills) ? JSON.stringify(skills) : skills) : null;
    const params = [
      fullName !== undefined ? fullName : null,
      phone !== undefined ? phone : null,
      avatarUrl !== undefined ? avatarUrl : null,
      bio !== undefined ? bio : null,
      headline !== undefined ? headline : null,
      skillsJson,
      coverUrl !== undefined ? coverUrl : null,
      req.user.id
    ];
    console.log('Profile update SQL params:', params);
    const result = await pool.query(
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
      params
    );
    console.log('Profile update SQL result:', result.rows[0]);

    if (result.rows.length === 0) {
      return error(res, 'User not found', 404);
    }

    const updatedUser = result.rows[0];
    let skillsArray = [];
    if (updatedUser.skills) {
      skillsArray = typeof updatedUser.skills === 'string' ? JSON.parse(updatedUser.skills) : updatedUser.skills;
      if (!Array.isArray(skillsArray)) {
        skillsArray = [];
      }
    }

    // Clear public cache profile
    const userKey = `users:profile:${req.user.id}`;
    await cacheService.del(userKey).catch(() => {});

    const userObj = {
      id: updatedUser.id,
      firebaseUid: updatedUser.firebase_uid,
      fullName: updatedUser.full_name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      avatarUrl: updatedUser.avatar_url,
      coverUrl: updatedUser.cover_url || '',
      role: updatedUser.role,
      status: updatedUser.status,
      isVerified: updatedUser.is_verified,
      isIdVerified: updatedUser.is_id_verified,
      bio: updatedUser.bio || '',
      headline: updatedUser.headline || '',
      skills: skillsArray,
      createdAt: updatedUser.created_at,
    };

    return success(res, { user: userObj }, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:userId/profile
exports.getPublicProfile = async (req, res, next) => {
  const { userId } = req.params;
  try {
    const userKey = `users:profile:${userId}`;

    // Cache-Aside with 5 mins TTL
    const profileData = await cacheService.getOrFetch(userKey, 300, async () => {
      const userResult = await pool.query(
        `SELECT id, full_name, avatar_url, cover_url, bio, headline, skills, is_verified, is_id_verified, created_at
         FROM users
         WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
      }

      const dbUser = userResult.rows[0];

      const ratingPromise = pool.query(
        `SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as review_count
         FROM reviews
         WHERE reviewee_id = $1`,
        [userId]
      ).catch(ratingErr => {
        console.warn('Reviews table unavailable, defaulting rating stats to 0:', ratingErr.message);
        return { rows: [{ avg_rating: 0, review_count: 0 }] };
      });

      const completedPromise = pool.query(
        `SELECT COUNT(*) as completed_count
         FROM assigned_tasks
         WHERE tasker_id = $1 AND status = 'COMPLETED'`,
        [userId]
      );

      const postedPromise = pool.query(
        `SELECT COUNT(*) as posted_count
         FROM tasks
         WHERE poster_id = $1 AND (post_type = 'RECRUITMENT' OR post_type IS NULL) AND status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED')`,
        [userId]
      );

      const servicesPromise = pool.query(
        `SELECT COUNT(*) as services_count
         FROM tasks
         WHERE poster_id = $1 AND post_type = 'SERVICE_OFFER' AND status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED')`,
        [userId]
      );

      const activePromise = pool.query(
        `SELECT COUNT(*) as active_count
         FROM tasks
         WHERE poster_id = $1 AND status = 'OPEN' AND (post_type = 'RECRUITMENT' OR post_type IS NULL)`,
        [userId]
      );

      const [ratingResult, completedResult, postedResult, servicesResult, activeResult] = await Promise.all([
        ratingPromise,
        completedPromise,
        postedPromise,
        servicesPromise,
        activePromise
      ]);

      const avgRating = parseFloat(ratingResult.rows[0].avg_rating || 0);
      const reviewCount = parseInt(ratingResult.rows[0].review_count || 0);
      const completedJobsCount = parseInt(completedResult.rows[0].completed_count || 0);
      const postedJobsCount = parseInt(postedResult.rows[0].posted_count || 0);
      const serviceOffersCount = parseInt(servicesResult.rows[0].services_count || 0);
      const activePostsCount = parseInt(activeResult.rows[0].active_count || 0);

      let skillsArray = [];
      if (dbUser.skills) {
        skillsArray = typeof dbUser.skills === 'string' ? JSON.parse(dbUser.skills) : dbUser.skills;
        if (!Array.isArray(skillsArray)) {
          skillsArray = [];
        }
      }

      return {
        id: dbUser.id,
        fullName: dbUser.full_name,
        avatarUrl: dbUser.avatar_url,
        coverUrl: dbUser.cover_url || '',
        bio: dbUser.bio || '',
        headline: dbUser.headline || '',
        skills: skillsArray,
        isVerified: dbUser.is_verified,
        isIdVerified: dbUser.is_id_verified,
        joinedAt: dbUser.created_at,
        ratingAverage: parseFloat(avgRating.toFixed(1)),
        reviewCount: reviewCount,
        completedJobsCount: completedJobsCount,
        postedJobsCount: postedJobsCount,
        serviceOffersCount: serviceOffersCount,
        activePostsCount: activePostsCount,
        publicStats: {
          posted: postedJobsCount,
          services: serviceOffersCount,
          completed: completedJobsCount,
          rating: parseFloat(avgRating.toFixed(1))
        }
      };
    });

    return success(res, profileData, 'Profile retrieved successfully');
  } catch (err) {
    if (err.message === 'User not found' || err.statusCode === 404) {
      return error(res, 'User not found', 404);
    }
    next(err);
  }
};

// GET /api/users/:userId/profile/posts
exports.getPublicPosts = async (req, res, next) => {
  const { userId } = req.params;
  const { type = 'RECRUITMENT', page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const [result, countResult] = await Promise.all([
      pool.query(
        `SELECT t.id, t.title, t.description, t.status, t.budget_min, t.budget_max, 
                t.final_price, t.created_at, t.post_type, t.salary_unit, t.images,
                c.name as category_name,
                (SELECT COUNT(*) FROM task_applications WHERE task_id = t.id) as applicant_count
         FROM tasks t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.poster_id = $1 AND t.status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED') AND t.post_type = $2
         ORDER BY t.created_at DESC
         LIMIT $3 OFFSET $4`,
        [userId, type, parseInt(limit), offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM tasks 
         WHERE poster_id = $1 AND status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED') AND post_type = $2`,
        [userId, type]
      )
    ]);
    const total = parseInt(countResult.rows[0].count);

    const data = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status.toUpperCase(),
      budgetMin: parseFloat(row.budget_min || 0),
      budgetMax: parseFloat(row.budget_max || 0),
      finalPrice: row.final_price ? parseFloat(row.final_price) : null,
      createdAt: row.created_at,
      postType: row.post_type,
      salaryUnit: row.salary_unit,
      categoryName: row.category_name,
      applicantCount: parseInt(row.applicant_count || 0),
      images: row.images
    }));

    return paginated(res, data, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }, 'Profile posts retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:userId/profile/reviews
exports.getPublicReviews = async (req, res, next) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    const [result, countResult] = await Promise.all([
      pool.query(
        `SELECT r.id, r.rating, r.comment, r.created_at,
                u.full_name as reviewer_name, u.avatar_url as reviewer_avatar,
                t.title as task_name
         FROM reviews r
         LEFT JOIN users u ON r.reviewer_id = u.id
         LEFT JOIN tasks t ON r.task_id = t.id
         WHERE r.reviewee_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]
      ),
      pool.query(
        `SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1`,
        [userId]
      )
    ]);
    const total = parseInt(countResult.rows[0].count);

    const data = result.rows.map(row => ({
      id: row.id,
      rating: parseFloat(row.rating),
      comment: row.comment,
      createdAt: row.created_at,
      reviewerName: row.reviewer_name,
      reviewerAvatar: row.reviewer_avatar,
      taskName: row.task_name
    }));

    return paginated(res, data, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }, 'Profile reviews retrieved successfully');
  } catch (err) {
    console.warn('Get profile reviews unavailable:', err.message);
    return paginated(res, [], {
      page: parseInt(page),
      limit: parseInt(limit),
      total: 0,
      totalPages: 0
    }, 'Profile reviews retrieved successfully');
  }
};

// PUT /api/users/role
exports.updateRole = async (req, res, next) => {
  // Deprecated. Always returns USER role.
  console.log('PUT /api/users/role is deprecated. Bypassing and returning USER.');
  try {
    const result = await pool.query(
      `UPDATE users
       SET role = 'USER'
       WHERE id = $1
       RETURNING id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, created_at`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return error(res, 'User not found', 404);
    }

    const updatedUser = result.rows[0];

    // Ensure tasker profile exists
    await pool.query(
      `INSERT INTO tasker_profiles (id, user_id, bio, experience, portfolio_url, location_text, latitude, longitude, average_rating)
       VALUES (gen_random_uuid(), $1, 'Thành viên mới', '', '', '', 10.7769, 106.7009, 5.0)
       ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id]
    );

    const userObj = {
      id: updatedUser.id,
      firebaseUid: updatedUser.firebase_uid,
      fullName: updatedUser.full_name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      avatarUrl: updatedUser.avatar_url,
      role: updatedUser.role,
      status: updatedUser.status,
      isVerified: updatedUser.is_verified,
      createdAt: updatedUser.created_at,
    };

    return success(res, { user: userObj }, 'Role updated successfully (deprecated - always set to USER)');
  } catch (err) {
    next(err);
  }
};

// POST /api/users/upload-avatar
exports.uploadAvatar = async (req, res, next) => {
  const { base64Image } = req.body;
  if (!base64Image) {
    return error(res, 'No image data provided', 400);
  }

  try {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Clean base64 prefix
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Unique filename
    const filename = `${crypto.randomUUID()}.jpg`;
    const uploadPath = path.join(uploadDir, filename);

    fs.writeFileSync(uploadPath, buffer);

    const host = req.get('host');
    const protocol = req.protocol;
    const avatarUrl = `${protocol}://${host}/uploads/${filename}`;

    return success(res, { avatarUrl }, 'Avatar uploaded successfully', 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/users/upload-cover
exports.uploadCover = async (req, res, next) => {
  const { base64Image } = req.body;
  if (!base64Image) {
    return error(res, 'No image data provided', 400);
  }

  try {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const filename = `cover_${crypto.randomUUID()}.jpg`;
    const uploadPath = path.join(uploadDir, filename);

    fs.writeFileSync(uploadPath, buffer);

    const host = req.get('host');
    const protocol = req.protocol;
    const coverUrl = `${protocol}://${host}/uploads/${filename}`;

    return success(res, { coverUrl }, 'Cover uploaded successfully', 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/users/verify
exports.verifyAccount = async (req, res, next) => {
  const { frontImage, backImage, selfieImage } = req.body;
 
  if (!frontImage || !backImage || !selfieImage) {
    return error(res, 'All 3 verification images (front, back, selfie) are required.', 400);
  }
 
  try {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
 
    const host = req.get('host');
    const protocol = req.protocol;
 
    const saveImage = (base64Str, typeName) => {
      const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `${crypto.randomUUID()}_${typeName}.jpg`;
      const uploadPath = path.join(uploadDir, filename);
      fs.writeFileSync(uploadPath, buffer);
      return `${protocol}://${host}/uploads/${filename}`;
    };
 
    const frontImageUrl = saveImage(frontImage, 'front');
    const backImageUrl = saveImage(backImage, 'back');
    const selfieImageUrl = saveImage(selfieImage, 'selfie');
 
    const updatedUser = await withDbTx(async (client) => {
      const verificationResult = await client.query(
        `INSERT INTO user_verifications (user_id, type, status)
         VALUES ($1, 'cccd', 'pending')
         RETURNING id`,
        [req.user.id]
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
        [req.user.id]
      );
      return userResult.rows[0];
    });
 
    const userObj = {
      id: updatedUser.id,
      firebaseUid: updatedUser.firebase_uid,
      fullName: updatedUser.full_name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      avatarUrl: updatedUser.avatar_url,
      role: updatedUser.role,
      status: updatedUser.status,
      isVerified: updatedUser.is_verified,
      isIdVerified: updatedUser.is_id_verified,
      createdAt: updatedUser.created_at,
    };
 
    return success(res, { user: userObj }, 'Account verified successfully', 201);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/profile
exports.deleteAccount = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE users
       SET status = 'BANNED', full_name = concat(full_name, '_deleted_', gen_random_uuid())
       WHERE id = $1 AND status != 'BANNED'
       RETURNING id, email, status`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return error(res, 'User not found or already deleted.', 404);
    }

    const deletedUser = result.rows[0];

    return success(res, { user: deletedUser }, 'Account deleted successfully.');
  } catch (err) {
    next(err);
  }
};
