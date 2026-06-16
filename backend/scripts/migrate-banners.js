'use strict';

require('dotenv').config();
const pool = require('../config/db');

(async () => {
  console.log('🚀 Starting Banner table migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('📁 Creating table "banners"...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(255) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        subtitle TEXT,
        image_url TEXT NOT NULL,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        placement VARCHAR(255) NOT NULL,
        action_type VARCHAR(255) NOT NULL,
        action_value TEXT,
        display_order INT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        start_at TIMESTAMP,
        end_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('⚡ Creating indexes for "banners"...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_banners_placement ON banners(placement);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_banners_display_order ON banners(display_order);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_banners_start_at ON banners(start_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_banners_end_at ON banners(end_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_banners_placement_active_order ON banners(placement, is_active, display_order);`);

    await client.query('COMMIT');
    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
