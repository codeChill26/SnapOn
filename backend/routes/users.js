// User routes for profile and role management
const express = require("express");
const router = express.Router();
const verifyFirebaseToken = require("../middleware/auth");
const pool = require("../config/db");

// GET /api/users/profile
router.get("/profile", verifyFirebaseToken, async (req, res) => {
  res.json({
    success: true,
    message: "User authenticated successfully",
    user: req.user,
  });
});

// PUT /api/users/profile
router.put("/profile", verifyFirebaseToken, async (req, res) => {
  const { fullName, phone, avatarUrl } = req.body;
  console.log('Profile update request:', { body: req.body, userId: req.user.id });
  try {
    const params = [fullName !== undefined ? fullName : null, phone !== undefined ? phone : null, avatarUrl !== undefined ? avatarUrl : null, req.user.id];
    console.log('Profile update SQL params:', params);
    const result = await pool.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           avatar_url = COALESCE($3, avatar_url)
       WHERE id = $4
       RETURNING id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, created_at`,
      params
    );
    console.log('Profile update SQL result:', result.rows[0]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updatedUser = result.rows[0];
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
        role: updatedUser.role,
        status: updatedUser.status,
        isVerified: updatedUser.is_verified,
        createdAt: updatedUser.created_at,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// PUT /api/users/role
router.put("/role", verifyFirebaseToken, async (req, res) => {
  const { role } = req.body;
  if (!['hirer', 'tasker'].includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role (must be 'hirer' or 'tasker')" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE users
       SET role = $1
       WHERE id = $2
       RETURNING id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, created_at`,
      [role, req.user.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updatedUser = result.rows[0];

    // Automatically create a tasker profile if role is 'tasker'
    if (role === 'tasker') {
      await client.query(
        `INSERT INTO tasker_profiles (id, user_id, bio, experience, portfolio_url, location_text, latitude, longitude, average_rating)
         VALUES (gen_random_uuid(), $1, 'Thành viên mới', '', '', '', 10.7769, 106.7009, 5.0)
         ON CONFLICT (user_id) DO NOTHING`,
        [req.user.id]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: "Role updated successfully",
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
    await client.query('ROLLBACK');
    console.error("Update role error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  } finally {
    client.release();
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

module.exports = router;