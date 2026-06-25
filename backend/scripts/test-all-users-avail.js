const pool = require('../config/db');
const taskApplicationModel = require('../models/taskApplicationModel');

async function test() {
  try {
    const usersRes = await pool.query('SELECT id, full_name, email FROM users');
    console.log(`Found ${usersRes.rows.length} users. Testing findByTaskerId for each...`);
    for (const user of usersRes.rows) {
      try {
        const apps = await taskApplicationModel.findByTaskerId(user.id);
        console.log(`✅ User ${user.full_name} (${user.email}): ${apps.length} applications`);
      } catch (err) {
        console.error(`❌ User ${user.full_name} (${user.email}) FAILED:`, err.message);
      }
    }
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await pool.end();
  }
}

test();
