'use strict';

require('dotenv').config();
const pool = require('../config/db');

(async () => {
  console.log('🚀 Starting Database Migration: Adding recruitment deadline columns & CLOSED/EXPIRED statuses...');
  const client = await pool.connect();
  
  try {
    // 1. Alter enums outside of transaction block (PG requirement)
    console.log('🔄 Adding enum values to TaskStatus...');
    try {
      await client.query('ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS \'CLOSED\'');
      console.log("✅ Added 'CLOSED' to TaskStatus enum");
    } catch (e) {
      console.log("ℹ️ Skipping 'CLOSED' enum addition (might already exist or unsupported):", e.message);
    }
    
    try {
      await client.query('ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS \'EXPIRED\'');
      console.log("✅ Added 'EXPIRED' to TaskStatus enum");
    } catch (e) {
      console.log("ℹ️ Skipping 'EXPIRED' enum addition (might already exist or unsupported):", e.message);
    }

    // 2. Start transaction for schema changes
    await client.query('BEGIN');

    console.log('📋 Adding new columns to tasks table...');
    await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMP');
    await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP');
    await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS closed_by_id UUID REFERENCES users(id) ON DELETE SET NULL');
    await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS closed_reason TEXT');
    console.log('✅ Columns added to tasks table.');

    // 3. Create index for deadline
    console.log('⚡ Creating index for application_deadline...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_application_deadline ON tasks(application_deadline)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_task_applications_task_id ON task_applications(task_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_task_applications_tasker_id ON task_applications(tasker_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_poster_id ON tasks(poster_id)');
    console.log('✅ Indexes created successfully.');

    // 4. Unique constraint to prevent duplicate applications
    console.log('🛡️ Creating unique constraint on task_applications(task_id, tasker_id)...');
    try {
      await client.query('ALTER TABLE task_applications ADD CONSTRAINT unique_task_tasker UNIQUE(task_id, tasker_id)');
      console.log('✅ Unique constraint added successfully.');
    } catch (e) {
      console.log('ℹ️ Unique constraint might already exist, skipping:', e.message);
    }

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
