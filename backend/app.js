require('dotenv').config();

var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var helmet = require('helmet');
var swaggerUi = require('swagger-ui-express');
var swaggerSpec = require('./config/swagger');

// Import routes
var taskRoutes = require('./routes/taskRoutes');
var applicationRoutes = require('./routes/applicationRoutes');
var matchingRoutes = require('./routes/matchingRoutes');
var usersRouter = require("./routes/users");
var authRouter = require('./routes/auth');
var walletRoutes = require('./routes/walletRoutes');
var escrowRoutes = require('./routes/escrowRoutes');

const app = express();

// Security & CORS
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));

// Request parsing
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ==========================================
// SWAGGER UI
// ==========================================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SnapOn API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

// Root → redirect to Swagger
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// ==========================================
// ROUTES
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SnapOn API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes — Flow A: Posting → Bidding → Matching
app.use('/api/tasks', taskRoutes);
app.use('/api', applicationRoutes);
app.use('/api', matchingRoutes);

// Wallet routes
app.use('/api/wallet', walletRoutes);

// Escrow routes
app.use('/api/escrows', escrowRoutes);

// User & Auth routes
app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);

// ==========================================
// ERROR HANDLING
// ==========================================

// error handler — returns JSON for API requests
app.use(function(err, req, res, next) {
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (req.app.get('env') === 'development') {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(req.app.get('env') === 'development' && { stack: err.stack }),
  });
});

module.exports = app;

// ==========================================
// START SERVER (only when running app.js directly)
// ==========================================
if (require.main === module) {
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`🚀 Server is running at http://localhost:${port}`);
    console.log(`📚 Swagger docs at http://localhost:${port}/api-docs`);
  });
}