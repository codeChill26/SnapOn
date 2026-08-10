const pool = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Adding bank_name and bank_account_number to users table...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100)
    `);
    
    console.log('Auto-populating bank fields from withdraw_requests...');
    await client.query(`
      UPDATE users u
      SET 
        bank_name = wr.bank_name,
        bank_account_number = wr.bank_account_number
      FROM (
        SELECT DISTINCT ON (user_id) user_id, bank_name, bank_account_number
        FROM withdraw_requests
        ORDER BY user_id, id DESC
      ) wr
      WHERE u.id = wr.user_id
        AND (u.bank_name IS NULL OR u.bank_account_number IS NULL)
    `);

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
