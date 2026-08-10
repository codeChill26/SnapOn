const pool = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add password column to users table if it does not exist
    console.log('Adding password column to users table...');
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS password VARCHAR(255)
    `);

    // Create forgot_password_otps table
    console.log('Creating forgot_password_otps table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS forgot_password_otps (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        email       VARCHAR(255) NOT NULL,
        otp_hash    VARCHAR(255) NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        verified    BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Create password_reset_tokens table
    console.log('Creating password_reset_tokens table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        email       VARCHAR(255) NOT NULL,
        token_hash  VARCHAR(255) NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        used        BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Create indexes for optimization
    console.log('Creating index for forgot_password_otps on email...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_forgot_password_otps_email
      ON forgot_password_otps(email)
    `);

    console.log('Creating index for password_reset_tokens on email...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email
      ON password_reset_tokens(email)
    `);

    await client.query('COMMIT');
    console.log('✅ Forgot password migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Forgot password migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
