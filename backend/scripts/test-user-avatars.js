const pool = require('../config/db');

async function test() {
  try {
    const res = await pool.query("SELECT id, full_name, email, avatar_url FROM users WHERE full_name ILIKE '%Kiệt%' OR full_name ILIKE '%Huỳnh%'");
    console.log('Users found:');
    for (const row of res.rows) {
      console.log(`- Name: "${row.full_name}"`);
      console.log(`  Email: "${row.email}"`);
      console.log(`  Avatar URL: "${row.avatar_url}"`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

test();
