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
  try {
    const result = await pool.query(
      `UPDATE users
       SET role = $1
       WHERE id = $2
       RETURNING id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, created_at`,
      [role, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updatedUser = result.rows[0];
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

module.exports = router;