const pool = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add verification token columns to users table
    console.log('Adding verification token columns to users table...');
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ
    `);

    // Create refresh_tokens table
    console.log('Creating refresh_tokens table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        token         TEXT        NOT NULL UNIQUE,
        user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_info   TEXT,
        ip_address    VARCHAR(45),
        expires_at    TIMESTAMPTZ NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
      ON refresh_tokens(user_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
      ON refresh_tokens(expires_at)
    `);

    await client.query('COMMIT');
    console.log('✅ Auth tokens migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Auth tokens migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
