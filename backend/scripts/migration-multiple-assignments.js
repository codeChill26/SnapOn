const pool = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Drop unique index on task_id
    console.log('Dropping unique index assigned_tasks_task_id_key...');
    await client.query('DROP INDEX IF EXISTS assigned_tasks_task_id_key');
    
    // 2. Add unique constraint on (task_id, tasker_id) to prevent duplicate assignments for same worker
    console.log('Creating unique index on (task_id, tasker_id)...');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_assigned_tasks_task_tasker ON assigned_tasks(task_id, tasker_id)');
    
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
