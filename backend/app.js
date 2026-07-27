require('dotenv').config();

// Install before anything else so startup failures are caught too.
require('./utils/processGuards')();

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
var adminRoutes = require('./routes/adminRoutes');


const http = require('http');
const { Server } = require('socket.io');

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(o => o.length > 0);

if (allowedOrigins.length === 0) {
  throw new Error('CRITICAL: ALLOWED_ORIGINS environment variable is missing or empty. App cannot start.');
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
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
      if (allowedOrigins.indexOf(origin) !== -1) {
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
app.use(helmet());
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: false }));
app.use(cookieParser());

// Static uploads folder
var uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

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
app.use('/api/activities', activityRoutes);
app.use('/api', applicationRoutes);
app.use('/api', matchingRoutes);

// Wallet routes
app.use('/api/wallet', walletRoutes);

// Escrow routes
app.use('/api/escrows', escrowRoutes);

// Chat routes
app.use('/api/chat', chatRoutes);

// Banner routes
app.use('/api', bannerRoutes);

// Category routes
app.use('/api', categoryRoutes);

// User & Auth routes
app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/admin', adminRoutes);


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

  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server is running at http://localhost:${port}`);
    console.log(`📚 Swagger docs at http://localhost:${port}/api-docs`);
  });
}
