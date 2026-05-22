const express = require("express");
const router = express.Router();
const verifyFirebaseToken = require("../middleware/auth");

router.get("/profile", verifyFirebaseToken, async (req, res) => {
  res.json({
    success: true,
    message: "User authenticated successfully",
    user: req.user,
  });
});

module.exports = router;