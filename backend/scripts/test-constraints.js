const pool = require('../config/db');

async function test() {
  try {
    const res = await pool.query(`
      SELECT conname, pg_get_constraintdef(con.oid)
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'assigned_tasks'
    `);
    console.log('assigned_tasks constraints:');
    for (const row of res.rows) {
      console.log(`- Constraint: ${row.conname}`);
      console.log(`  Definition: ${row.pg_get_constraintdef}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

test();
