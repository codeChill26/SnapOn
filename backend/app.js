require('dotenv').config();

var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var helmet = require('helmet');
var swaggerUi = require('swagger-ui-express');
var swaggerSpec = require('./config/swagger');
var path = require('path');
var fs = require('fs');

// Import routes
var taskRoutes = require('./routes/taskRoutes');
var activityRoutes = require('./routes/activityRoutes');
var applicationRoutes = require('./routes/applicationRoutes');
var matchingRoutes = require('./routes/matchingRoutes');
var usersRouter = require("./routes/users");
var authRouter = require('./routes/auth');
var walletRoutes = require('./routes/walletRoutes');
var escrowRoutes = require('./routes/escrowRoutes');
var chatRoutes = require('./routes/chatRoutes');
var bannerRoutes = require('./routes/bannerRoutes');
var categoryRoutes = require('./routes/categoryRoutes');
var assignmentRoutes = require('./routes/assignmentRoutes');
var notificationRoutes = require('./routes/notificationRoutes');
var adminRoutes = require('./routes/adminRoutes');


const http = require('http');
const { Server } = require('socket.io');

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(o => o.length > 0);

// Always allow production web domains & Vercel policy web origins to bypass CORS on backend
const complianceOrigins = [
  'https://snaponvn.tech',
  'http://snaponvn.tech',
  'https://www.snaponvn.tech',
  'http://www.snaponvn.tech',
  'https://snapon-policy.vercel.app',
  'https://snapon.vercel.app'
];
complianceOrigins.forEach(origin => {
  if (!allowedOrigins.includes(origin)) {
    allowedOrigins.push(origin);
  }
});

if (allowedOrigins.length === 0) {
  throw new Error('CRITICAL: ALLOWED_ORIGINS environment variable is missing or empty. App cannot start.');
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1 || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.indexOf(origin) !== -1 || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Save io to express app instance
app.set('io', io);

// Socket.io Middleware and Handlers
const socketAuth = require('./middleware/socketAuth');
const socketHandler = require('./services/socketHandler');

io.use(socketAuth);
io.on('connection', (socket) => {
  socketHandler(io, socket);
});

// Khởi động sweeper tự động quét các giao việc quá hạn 15 phút (mỗi 1 phút quét một lần)
const assignmentExpiryService = require('./services/assignmentExpiryService');
assignmentExpiryService.startSweeper(io);

// Security & CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions));

// Response compression
var compression = require('compression');
app.use(compression({ threshold: 1024 }));

// Request parsing
if (process.env.NODE_ENV === 'production') {
  app.use(logger('combined'));
} else {
  app.use(logger('dev'));
}
// Route-specific large body limits (up to 10MB for image/document uploads)
app.use(['/api/tasks/upload-images', '/api/v1/tasks/upload-images'], express.json({ limit: '10mb' }));
app.use(['/api/chat/attachments/image', '/api/v1/chat/attachments/image'], express.json({ limit: '10mb' }));
app.use(['/api/users/upload-avatar', '/api/v1/users/upload-avatar'], express.json({ limit: '10mb' }));
app.use(['/api/users/upload-cover', '/api/v1/users/upload-cover'], express.json({ limit: '10mb' }));
app.use(['/api/users/verify', '/api/v1/users/verify'], express.json({ limit: '10mb' }));

// Global body limit for all other routes to protect against DoS
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ limit: '200kb', extended: false }));
app.use(cookieParser());

// Static uploads folder
var uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadDir));

// ==========================================
// SWAGGER UI
// ==========================================
const isProductionOrStaging = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

if (!isProductionOrStaging) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SnapOn API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
    },
  }));
}

// Root → redirect to Swagger in dev, or return status message in prod/staging
app.get('/', (req, res) => {
  if (isProductionOrStaging) {
    return res.status(200).json({
      success: true,
      message: 'SnapOn API is running',
      timestamp: new Date().toISOString()
    });
  }
  res.redirect('/api-docs');
});

// ==========================================
// ROUTES
// ==========================================

const v1Router = require('./routes/v1');

// API v1 versioned routes
app.use('/api/v1', v1Router);

// Health check (Legacy/Backward Compatibility)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SnapOn API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes (Legacy/Backward Compatibility) — Flow A: Posting → Bidding → Matching
app.use('/api/tasks', taskRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api', applicationRoutes);
app.use('/api', matchingRoutes);

// Wallet routes (Legacy/Backward Compatibility)
app.use('/api/wallet', walletRoutes);

// Escrow routes (Legacy/Backward Compatibility)
app.use('/api/escrows', escrowRoutes);

// Chat routes (Legacy/Backward Compatibility)
app.use('/api/chat', chatRoutes);

// Banner routes (Legacy/Backward Compatibility)
app.use('/api', bannerRoutes);

// Category routes (Legacy/Backward Compatibility)
app.use('/api', categoryRoutes);

// User & Auth routes (Legacy/Backward Compatibility)
app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);


// ==========================================
// ERROR HANDLING
// ==========================================

// error handler — returns JSON for API requests
app.use(function(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  
  // Always log full error details internally for container logs/audits
  console.error('Error handled by global handler:', err);

  const isDev = req.app.get('env') === 'development' || process.env.NODE_ENV === 'development';

  let cleanCode = err.code || 'INTERNAL_SERVER_ERROR';
  if (cleanCode === 'INTERNAL_SERVER_ERROR') {
    if (statusCode === 400) cleanCode = 'BAD_REQUEST';
    else if (statusCode === 401) cleanCode = 'AUTH_REQUIRED';
    else if (statusCode === 403) cleanCode = 'FORBIDDEN';
    else if (statusCode === 404) cleanCode = 'NOT_FOUND';
    else if (statusCode === 429) cleanCode = 'RATE_LIMIT_EXCEEDED';
  }

  const responseBody = {
    success: false,
    code: cleanCode,
    message: 'Internal Server Error'
  };

  const details = err.details || err.errors;
  if (details) {
    responseBody.details = details;
    responseBody.errors = details; // Backwards compatibility
  }

  if (isDev) {
    responseBody.message = err.message || 'Internal Server Error';
    responseBody.stack = err.stack;
    res.status(statusCode).json(responseBody);
  } else {
    // Production/Staging/Safe Mode
    let cleanMessage = 'Internal Server Error';

    // Allow error messages for client-side errors (4xx) ONLY if they don't leak internals
    if (statusCode < 500) {
      const rawMessage = err.message || '';
      
      // Regex check to detect SQL/Database/Prisma terms
      const isDbOrSqlLeak = /prisma|sql|database|query|relation|constraint|table|select|update|insert|delete|foreign key|unique constraint|pg_|postgres/i.test(rawMessage) ||
                            (err.name && err.name.includes('Prisma')) ||
                            (err.code && typeof err.code === 'string' && err.code.startsWith('P'));
      
      // Regex check to detect system paths (slashes, node_modules, drive letters)
      const isPathLeak = /\\|\/|:\/|:\\|node_modules|usr\/src|app\//i.test(rawMessage) || 
                         err.code === 'ENOENT' || err.code === 'EACCES';

      if (!isDbOrSqlLeak && !isPathLeak) {
        cleanMessage = rawMessage;
      }
    }

    responseBody.message = cleanMessage;
    res.status(statusCode).json(responseBody);
  }
});

module.exports = app;

// ==========================================
// START SERVER (only when running app.js directly)
// ==========================================
if (require.main === module) {
  const port = process.env.PORT || 3000;

  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server is running at http://localhost:${port}`);
    console.log(`📚 Swagger docs at http://localhost:${port}/api-docs`);
  });
}
