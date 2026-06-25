'use strict';

require('dotenv').config();
const pool = require('../config/db');

(async () => {
  console.log('🚀 Starting Database Migration: Removing Worker/Hirer roles & adding PostType columns...');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Migrate user roles
    console.log('👤 Migrating users.role to VARCHAR and setting new defaults...');
    
    // Drop default first to allow changing the type
    await client.query('ALTER TABLE users ALTER COLUMN role DROP DEFAULT');
    
    // Change column type to VARCHAR(50)
    await client.query('ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text');
    
    // Update existing roles
    console.log('🔄 Converting hirer/tasker roles to USER...');
    await client.query("UPDATE users SET role = 'USER' WHERE role IN ('hirer', 'tasker')");
    await client.query("UPDATE users SET role = 'ADMIN' WHERE role = 'admin'");
    
    // Set default value to 'USER'
    await client.query("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'USER'");
    
    // Drop the old enum type if it exists
    await client.query('DROP TYPE IF EXISTS user_role CASCADE');
    console.log('✅ User roles migrated successfully.');

    // 2. Extend tasks table with new columns
    console.log('📋 Adding new columns to tasks table...');
    
    const addColumnsQueries = [
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS post_type VARCHAR(20) NOT NULL DEFAULT 'RECRUITMENT'",
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS work_mode VARCHAR(20) NOT NULL DEFAULT 'ONSITE'",
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS salary_unit VARCHAR(20) NOT NULL DEFAULT 'PER_JOB'",
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20) NOT NULL DEFAULT 'ONE_TIME'",
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS people_needed INT DEFAULT 1",
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20)",
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP",
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS experience_level VARCHAR(50) DEFAULT 'NO_REQUIREMENT'",
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS education_level VARCHAR(50) DEFAULT 'NO_REQUIREMENT'",
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS gender_requirement VARCHAR(30) DEFAULT 'NO_REQUIREMENT'",
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS min_age INT",
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS max_age INT",
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS min_height_cm INT",
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS max_height_cm INT",
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}'"
    ];

    for (const q of addColumnsQueries) {
      await client.query(q);
    }
    console.log('✅ Tasks table columns added successfully.');

    // 3. Create indexes
    console.log('⚡ Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_post_type ON tasks(post_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_work_mode ON tasks(work_mode)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)');
    console.log('✅ Indexes created successfully.');

    await client.query('COMMIT');
    console.log('🎉 Database migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Database migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
})();
