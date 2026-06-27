const pool = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Drop unique index on task_id
    console.log('Dropping unique index escrows_task_id_key...');
    await client.query('DROP INDEX IF EXISTS escrows_task_id_key');
    
    // 2. Add unique constraint on (task_id, tasker_id) to prevent duplicate escrows for same worker on same task
    console.log('Creating unique index on (task_id, tasker_id)...');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_escrows_task_tasker ON escrows(task_id, tasker_id)');
    
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
