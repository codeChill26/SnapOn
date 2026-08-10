const express = require('express');
const router = express.Router();

// Import routes
const taskRoutes = require('./taskRoutes');
const activityRoutes = require('./activityRoutes');
const applicationRoutes = require('./applicationRoutes');
const matchingRoutes = require('./matchingRoutes');
const usersRouter = require("./users");
const authRouter = require('./auth');
const walletRoutes = require('./walletRoutes');
const escrowRoutes = require('./escrowRoutes');
const chatRoutes = require('./chatRoutes');
const bannerRoutes = require('./bannerRoutes');
const categoryRoutes = require('./categoryRoutes');
const assignmentRoutes = require('./assignmentRoutes');
const adminRoutes = require('./adminRoutes');

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SnapOn API v1 is running',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use('/tasks', taskRoutes);
router.use('/activities', activityRoutes);
router.use('/', applicationRoutes);
router.use('/', matchingRoutes);
router.use('/wallet', walletRoutes);
router.use('/escrows', escrowRoutes);
router.use('/chat', chatRoutes);
router.use('/', bannerRoutes);
router.use('/', categoryRoutes);
router.use("/users", usersRouter);
router.use("/auth", authRouter);
router.use('/assignments', assignmentRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
