const pool = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Adding chat message feature columns...');
    await client.query(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS user1_last_read_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS user2_last_read_at TIMESTAMP
    `);

    await client.query(`
      ALTER TABLE messages
      ALTER COLUMN text DROP NOT NULL,
      ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'SENT',
      ADD COLUMN IF NOT EXISTS read_at TIMESTAMP
    `);

    await client.query(`
      UPDATE messages
      SET type = 'TEXT'
      WHERE type IS NULL
    `);

    await client.query(`
      UPDATE messages
      SET status = 'SENT'
      WHERE status IS NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        platform VARCHAR(20) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
      ON messages(conversation_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_sender_id
      ON messages(sender_id)
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_token_key
      ON push_tokens(token)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id
      ON push_tokens(user_id)
    `);

    await client.query('COMMIT');
    console.log('Chat message feature migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
