const { Pool, types } = require('pg');
require('dotenv').config();

// Force pg to parse TIMESTAMP WITHOUT TIME ZONE (OID 1114) as UTC
types.setTypeParser(1114, function(stringValue) {
  return new Date(stringValue + 'Z');
});

let poolConfig = {};

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (connectionString) {
  try {
    const cleanedUrl = connectionString.trim().replace(/^['"]+|['"]+$/g, '');
    const url = new URL(cleanedUrl);
    
    const sslMode = String(process.env.PGSSLMODE || '').toLowerCase();
    const hasSslDisable = cleanedUrl.includes('sslmode=disable') || sslMode === 'disable';
    const ssl = hasSslDisable ? false : { rejectUnauthorized: false };

    poolConfig = {
      host: url.hostname,
      port: url.port ? parseInt(url.port) : 5432,
      database: url.pathname.replace(/^\//, ''),
      user: url.username,
      password: url.password ? decodeURIComponent(url.password.replace(/\+/g, '%2B')) : '',
      ssl: ssl,
    };
  } catch (err) {
    console.error('⚠️ Failed to parse DATABASE_URL, falling back to individual env variables:', err.message);
  }
}

if (!poolConfig.host) {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'snapon',
  };
}

poolConfig.max = 20;
poolConfig.idleTimeoutMillis = 30000;
poolConfig.connectionTimeoutMillis = 10000;

const pool = new Pool(poolConfig);

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

// Tự động kiểm tra và bổ sung cột created_at vào bảng assigned_tasks (nếu chưa có) để phục vụ tính năng đếm ngược 15 phút
pool.query('ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP')
  .then(() => {
    console.log('✅ Checked/Added created_at column in assigned_tasks table');
  })
  .catch((err) => {
    console.error('⚠️ Failed to ensure created_at column in assigned_tasks:', err.message);
  });

// Tự động kiểm tra và bổ sung cột is_id_verified vào bảng users (nếu chưa có) để phục vụ xác thực CCCD
pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_id_verified BOOLEAN DEFAULT false')
  .then(() => {
    console.log('✅ Checked/Added is_id_verified column in users table');
  })
  .catch((err) => {
    console.error('⚠️ Failed to ensure is_id_verified column in users:', err.message);
  });

pool.on('error', (err) => {
  console.error('⚠️ Unexpected error on idle PostgreSQL client:', err.message);
});

module.exports = pool;
