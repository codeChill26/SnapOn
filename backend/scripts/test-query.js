const pool = require('../config/db');
const taskModel = require('../models/taskModel');

async function test() {
  try {
    const res = await pool.query('SELECT id, title FROM tasks');
    console.log(`Found ${res.rows.length} tasks:`);
    for (const row of res.rows) {
      const task = await taskModel.findById(row.id);
      console.log(`- Title: "${task.title}"`);
      console.log(`  Subcategory:`, task.subcategory);
      console.log(`  Required Skills:`, task.required_skills);
    }
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await pool.end();
  }
}

test();
