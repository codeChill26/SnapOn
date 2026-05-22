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

const app = express();

// Security & CORS
app.use(helmet());
app.use(cors());

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

// ==========================================
// START SERVER
// ==========================================
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api-docs`);
});

module.exports = app;