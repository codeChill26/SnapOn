const pool = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Creating saved_tasks table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        UNIQUE(user_id, task_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_tasks_task_id
      ON saved_tasks(task_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_tasks_user_created_at
      ON saved_tasks(user_id, created_at DESC)
    `);

    await client.query('COMMIT');
    console.log('Saved tasks migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Saved tasks migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
