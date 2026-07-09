// User routes for profile and role management
// Thin wiring only — logic lives in controllers/userController.js
const express = require("express");
const router = express.Router();
const verifyFirebaseToken = require("../middleware/auth");
const userController = require("../controllers/userController");
const chatController = require("../controllers/chatController");

// GET /api/users/profile
router.get("/profile", verifyFirebaseToken, userController.getProfile);

router.post("/push-token", verifyFirebaseToken, chatController.registerPushToken);
router.delete("/push-token", verifyFirebaseToken, chatController.removePushToken);

// GET /api/users/search
router.get("/search", verifyFirebaseToken, userController.searchByPhone);

// PUT /api/users/profile
router.put("/profile", verifyFirebaseToken, userController.updateProfile);

// GET /api/users/:userId/profile
router.get("/:userId/profile", verifyFirebaseToken, userController.getPublicProfile);

// GET /api/users/:userId/profile/posts
router.get("/:userId/profile/posts", verifyFirebaseToken, userController.getPublicPosts);

// GET /api/users/:userId/profile/reviews
router.get("/:userId/profile/reviews", verifyFirebaseToken, userController.getPublicReviews);

// PUT /api/users/role (deprecated — always resets to USER)
router.put("/role", verifyFirebaseToken, userController.updateRole);

// POST /api/users/upload-avatar
router.post("/upload-avatar", verifyFirebaseToken, userController.uploadAvatar);

// POST /api/users/upload-cover
router.post("/upload-cover", verifyFirebaseToken, userController.uploadCover);

// POST /api/users/verify
router.post("/verify", verifyFirebaseToken, userController.verifyIdentity);

// DELETE /api/users/profile — soft delete account
router.delete("/profile", verifyFirebaseToken, userController.deleteAccount);

module.exports = router;
