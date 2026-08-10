const pool = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Checking and adding created_at column in assigned_tasks table...');
    await client.query('ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP');

    console.log('Checking and adding is_id_verified column in users table...');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_id_verified BOOLEAN DEFAULT false');

    await client.query('COMMIT');
    console.log('✅ Columns checked/added successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
