const pool = require('../config/db');

async function checkTasks() {
  try {
    const res = await pool.query(`
      SELECT t.id, t.title, t.category_id, c.name AS category_name, c.slug AS category_slug
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.created_at DESC
      LIMIT 10;
    `);
    console.log('=== LATEST TASKS IN DB ===');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying tasks:', err);
  } finally {
    await pool.end();
  }
}

checkTasks();
