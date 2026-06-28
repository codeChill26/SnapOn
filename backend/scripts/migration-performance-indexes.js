const pool = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🚀 Starting performance indexes migration...');

    // 1. Enable pg_trgm extension for fast text search
    console.log('Enabling pg_trgm extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    // 2. Indexes for user profile stats queries
    console.log('Creating indexes for profile stats...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_assigned_tasks_tasker_status 
      ON assigned_tasks(tasker_id, status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_poster_post_type_status 
      ON tasks(poster_id, post_type, status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_reviewee 
      ON reviews(reviewee_id)
    `);

    // 3. Indexes for task search & filtering
    console.log('Creating indexes for task search & filtering...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status 
      ON tasks(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm 
      ON tasks USING gin(title gin_trgm_ops)
    `);

    // 4. Indexes for chat unread count optimization
    console.log('Creating index for chat unread count...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_conv_sender_created 
      ON messages(conversation_id, sender_id, created_at)
    `);

    // 5. Indexes for task applications count
    console.log('Creating index for task applications count...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_task_applications_task 
      ON task_applications(task_id)
    `);

    await client.query('COMMIT');
    console.log('🎉 Performance indexes migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Performance indexes migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
