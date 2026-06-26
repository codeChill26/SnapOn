// User routes for profile and role management
const express = require("express");
const router = express.Router();
const verifyFirebaseToken = require("../middleware/auth");
const pool = require("../config/db");
const chatController = require("../controllers/chatController");
const cacheService = require("../services/cacheService");

// GET /api/users/profile
router.get("/profile", verifyFirebaseToken, async (req, res) => {
  res.json({
    success: true,
    message: "User authenticated successfully",
    user: req.user,
  });
});

router.post("/push-token", verifyFirebaseToken, chatController.registerPushToken);
router.delete("/push-token", verifyFirebaseToken, chatController.removePushToken);

// GET /api/users/search
router.get("/search", verifyFirebaseToken, async (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ success: false, message: "Phone number is required" });
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
      return res.json({ success: true, user: null, message: "No user found with this phone number." });
    }

    const foundUser = result.rows[0];
    res.json({
      success: true,
      user: {
        id: foundUser.id,
        fullName: foundUser.full_name,
        email: foundUser.email,
        phone: foundUser.phone,
        avatarUrl: foundUser.avatar_url,
        role: foundUser.role,
      },
    });
  } catch (error) {
    console.error("Search user by phone error:", error);
    res.status(500).json({ success: false, message: "Server error during phone search", error: error.message });
  }
});

// PUT /api/users/profile
router.put("/profile", verifyFirebaseToken, async (req, res) => {
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
       RETURNING id, firebase_uid, full_name, email, phone, avatar_url, cover_url, role, status, is_verified, bio, headline, skills, created_at`,
      params
    );
    console.log('Profile update SQL result:', result.rows[0]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updatedUser = result.rows[0];
    let skillsArray = [];
    if (updatedUser.skills) {
      skillsArray = typeof updatedUser.skills === 'string' ? JSON.parse(updatedUser.skills) : updatedUser.skills;
      if (!Array.isArray(skillsArray)) {
        skillsArray = [];
      }
    }

    // Xóa cache profile công khai của user để đảm bảo tính nhất quán dữ liệu
    const userKey = `users:profile:${req.user.id}`;
    await cacheService.del(userKey).catch(() => {});

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        firebaseUid: updatedUser.firebase_uid,
        fullName: updatedUser.full_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatarUrl: updatedUser.avatar_url,
        coverUrl: updatedUser.cover_url || "",
        role: updatedUser.role,
        status: updatedUser.status,
        isVerified: updatedUser.is_verified,
        bio: updatedUser.bio || "",
        headline: updatedUser.headline || "",
        skills: skillsArray,
        createdAt: updatedUser.created_at,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// GET /api/users/:userId/profile
router.get("/:userId/profile", verifyFirebaseToken, async (req, res) => {
  const { userId } = req.params;
  try {
    const userKey = `users:profile:${userId}`;

    // Sử dụng cơ chế Cache-Aside với thời gian sống (TTL) 5 phút
    const profileData = await cacheService.getOrFetch(userKey, 300, async () => {
      const userResult = await pool.query(
        `SELECT id, full_name, avatar_url, cover_url, bio, headline, skills, is_verified, created_at
         FROM users
         WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        const err = new Error("User not found");
        err.statusCode = 404;
        throw err;
      }

      const dbUser = userResult.rows[0];

      // Chạy song song các truy vấn lấy chỉ số thống kê
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
        coverUrl: dbUser.cover_url || "",
        bio: dbUser.bio || "",
        headline: dbUser.headline || "",
        skills: skillsArray,
        isVerified: dbUser.is_verified,
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

    res.json({
      success: true,
      data: profileData
    });
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    console.error("Get public profile error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// GET /api/users/:userId/profile/posts
router.get("/:userId/profile/posts", verifyFirebaseToken, async (req, res) => {
  const { userId } = req.params;
  const { type = 'RECRUITMENT', page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    // Chạy song song truy vấn dữ liệu và truy vấn tổng số bài đăng để giảm thời gian phản hồi
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

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Get profile posts error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// GET /api/users/:userId/profile/reviews
router.get("/:userId/profile/reviews", verifyFirebaseToken, async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    // Chạy song song truy vấn đánh giá và truy vấn tổng số đánh giá
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

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.warn("Get profile reviews unavailable:", error.message);
    res.json({
      success: true,
      data: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        totalPages: 0
      }
    });
  }
});


// // PUT /api/users/role
router.put("/role", verifyFirebaseToken, async (req, res) => {
  // Deprecated. Always returns USER role.
  console.log("PUT /api/users/role is deprecated. Bypassing and returning USER.");
  
  try {
    const result = await pool.query(
      `UPDATE users
       SET role = 'USER'
       WHERE id = $1
       RETURNING id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, created_at`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updatedUser = result.rows[0];

    // Ensure tasker profile exists
    await pool.query(
      `INSERT INTO tasker_profiles (id, user_id, bio, experience, portfolio_url, location_text, latitude, longitude, average_rating)
       VALUES (gen_random_uuid(), $1, 'Thành viên mới', '', '', '', 10.7769, 106.7009, 5.0)
       ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id]
    );

    res.json({
      success: true,
      message: "Role updated successfully (deprecated - always set to USER)",
      user: {
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
      },
    });
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// POST /api/users/upload-avatar
router.post("/upload-avatar", verifyFirebaseToken, async (req, res) => {
  const { base64Image } = req.body;
  if (!base64Image) {
    return res.status(400).json({ success: false, message: "No image data provided" });
  }

  try {
    // Ensure uploads directory exists
    const uploadDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Clean base64 prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const filename = `${crypto.randomUUID()}.jpg`;
    const uploadPath = path.join(uploadDir, filename);

    // Save file
    fs.writeFileSync(uploadPath, buffer);

    // Build URL (use host header to dynamically point to the correct IP/port)
    const host = req.get('host');
    const protocol = req.protocol;
    const avatarUrl = `${protocol}://${host}/uploads/${filename}`;

    res.json({
      success: true,
      message: "Avatar uploaded successfully",
      avatarUrl
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    res.status(500).json({ success: false, message: "Server error during upload", error: error.message });
  }
});

// POST /api/users/upload-cover
router.post("/upload-cover", verifyFirebaseToken, async (req, res) => {
  const { base64Image } = req.body;
  if (!base64Image) {
    return res.status(400).json({ success: false, message: "No image data provided" });
  }

  try {
    const uploadDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    const filename = `cover_${crypto.randomUUID()}.jpg`;
    const uploadPath = path.join(uploadDir, filename);

    fs.writeFileSync(uploadPath, buffer);

    const host = req.get('host');
    const protocol = req.protocol;
    const coverUrl = `${protocol}://${host}/uploads/${filename}`;

    res.json({
      success: true,
      message: "Cover uploaded successfully",
      coverUrl
    });
  } catch (error) {
    console.error("Upload cover error:", error);
    res.status(500).json({ success: false, message: "Server error during upload", error: error.message });
  }
});

// POST /api/users/verify
router.post("/verify", verifyFirebaseToken, async (req, res) => {
  const { frontImage, backImage, selfieImage } = req.body;
 
  if (!frontImage || !backImage || !selfieImage) {
    return res.status(400).json({
      success: false,
      message: "All 3 verification images (front, back, selfie) are required."
    });
  }
 
  try {
    // Ensure uploads directory exists
    const uploadDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
 
    const host = req.get('host');
    const protocol = req.protocol;
 
    const saveImage = (base64Str, typeName) => {
      const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `${crypto.randomUUID()}_${typeName}.jpg`;
      const uploadPath = path.join(uploadDir, filename);
      fs.writeFileSync(uploadPath, buffer);
      return `${protocol}://${host}/uploads/${filename}`;
    };
 
    const frontImageUrl = saveImage(frontImage, "front");
    const backImageUrl = saveImage(backImage, "back");
    const selfieImageUrl = saveImage(selfieImage, "selfie");
 
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
 
      // 1. Create a verification log
      const verificationResult = await client.query(
        `INSERT INTO user_verifications (user_id, type, status)
         VALUES ($1, 'cccd', 'pending')
         RETURNING id`,
        [req.user.id]
      );
      const verificationId = verificationResult.rows[0].id;
 
      // 2. Create document records
      await client.query(
        `INSERT INTO verification_documents (verification_id, front_image_url, back_image_url, selfie_image_url)
         VALUES ($1, $2, $3, $4)`,
        [verificationId, frontImageUrl, backImageUrl, selfieImageUrl]
      );
 
      // 3. Auto-approve the user's verification for convenience in testing
      const userResult = await client.query(
        `UPDATE users
         SET is_verified = true
         WHERE id = $1
         RETURNING id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, created_at`,
        [req.user.id]
      );
 
      await client.query('COMMIT');
 
      const updatedUser = userResult.rows[0];
      res.json({
        success: true,
        message: "Account verified successfully",
        user: {
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
        }
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during account verification",
      error: error.message
    });
  }
});

// DELETE /api/users/profile — Delete user account (soft-delete: set status to BANNED)
router.delete("/profile", verifyFirebaseToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users
       SET status = 'BANNED', full_name = concat(full_name, '_deleted_', gen_random_uuid())
       WHERE id = $1 AND status != 'BANNED'
       RETURNING id, email, status`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found or already deleted." });
    }

    return res.json({
      success: true,
      message: "Account deleted successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;

