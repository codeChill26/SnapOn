require('dotenv').config();
const pool = require('../config/db');

async function checkSchema() {
  try {
    const res = await pool.query(
      `SELECT column_name, data_type, character_maximum_length, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'refresh_tokens';`
    );
    console.log('Columns of refresh_tokens:');
    console.log(res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error querying schema:', err);
    process.exit(1);
  }
}

checkSchema();
