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
       RETURNING id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified`,
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
       RETURNING id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified`,
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
      },
    });
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
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