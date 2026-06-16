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
      password: decodeURIComponent(url.password),
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
poolConfig.connectionTimeoutMillis = 5000;

const pool = new Pool(poolConfig);

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('⚠️ Unexpected error on idle PostgreSQL client:', err.message);
});

module.exports = pool;
