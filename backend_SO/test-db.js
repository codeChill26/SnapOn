const pool = require('./config/db');

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('PostgreSQL connected:', result.rows[0]);
  } catch (error) {
    console.error('PostgreSQL connection error:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();