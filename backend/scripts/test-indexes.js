const pool = require('../config/db');

async function test() {
  try {
    const res = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'assigned_tasks'
    `);
    console.log('assigned_tasks indexes:');
    for (const row of res.rows) {
      console.log(`- Index: ${row.indexname}`);
      console.log(`  Definition: ${row.indexdef}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

test();
