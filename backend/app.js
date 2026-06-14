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
var chatRoutes = require('./routes/chatRoutes');

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
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

// Security & CORS
app.use(helmet());
app.use(cors());

// Request parsing
app.use(logger('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: false }));
app.use(cookieParser());

// Static uploads folder
var path = require('path');
var fs = require('fs');
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
app.use('/api', applicationRoutes);
app.use('/api', matchingRoutes);

// Wallet routes
app.use('/api/wallet', walletRoutes);

// Escrow routes
app.use('/api/escrows', escrowRoutes);

// Chat routes
app.use('/api/chat', chatRoutes);

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

  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server is running at http://localhost:${port}`);
    console.log(`📚 Swagger docs at http://localhost:${port}/api-docs`);
  });
}