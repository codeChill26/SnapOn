'use strict';
require('dotenv').config();

const crypto = require('crypto');
const prisma = require('../db/prisma');
const pool = require('../config/db');
const passwordController = require('../controllers/auth/passwordController');
const { AUTH_CONFIG } = require('../utils/constants');

async function testPasswordMigration() {
  console.log('🧪 Starting Password Security & Migration Integration Tests...');

  const testEmail = 'migration-test@snapon.vn';
  const testPassword = 'LegacyPassword123!';

  // Generate SHA-256 hash of the test password
  const sha256Hash = crypto.createHash('sha256').update(testPassword).digest('hex');

  try {
    // 1. Ensure clean slate in DB
    await prisma.user.deleteMany({
      where: { email: testEmail }
    });

    // 2. Create a test user with a legacy SHA-256 password hash
    console.log(`💾 Creating test user ${testEmail} with SHA-256 hash...`);
    const testUser = await prisma.user.create({
      data: {
        firebaseUid: 'test-migration-uid-xyz',
        email: testEmail,
        fullName: 'Migration Test User',
        password: sha256Hash,
        status: 'ACTIVE',
        role: 'USER'
      }
    });

    console.log(`✓ Stored Hash in DB initially: ${testUser.password}`);
    if (testUser.password !== sha256Hash) {
      throw new Error('Initial password hash in DB is incorrect');
    }

    // 3. Verify password verification & migration triggers
    console.log('\n--- Step 1: Verifying & Migrating with Fallback Active ---');
    const isVerified1 = await passwordController.verifyPassword(testPassword, testUser.password, testEmail);
    console.log(`✓ Verification Result: ${isVerified1}`);
    if (!isVerified1) {
      throw new Error('Failed to verify password with legacy SHA-256 hash');
    }

    // 4. Retrieve updated user hash from DB
    const updatedUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    console.log(`✓ Stored Hash in DB after migration: ${updatedUser.password}`);
    if (!updatedUser.password.startsWith('$2')) {
      throw new Error('Password hash in DB was not migrated to Bcrypt!');
    }
    console.log('✅ Automatic migration to Bcrypt successfully performed upon successful login/verification.');

    // 5. Verify subsequent login with Bcrypt works
    console.log('\n--- Step 2: Verifying subsequent login with Bcrypt ---');
    const isVerified2 = await passwordController.verifyPassword(testPassword, updatedUser.password, testEmail);
    console.log(`✓ Verification Result with Bcrypt: ${isVerified2}`);
    if (!isVerified2) {
      throw new Error('Failed to verify password with migrated Bcrypt hash');
    }
    console.log('✅ Subsequent logins verify correctly using standard Bcrypt flow.');

    // 6. Test Disabling the SHA-256 Fallback
    console.log('\n--- Step 3: Testing with ALLOW_SHA256_FALLBACK Disabled ---');
    AUTH_CONFIG.ALLOW_SHA256_FALLBACK = false;

    // Reset password to SHA-256 in DB to simulate a legacy user trying to log in
    await prisma.user.update({
      where: { email: testEmail },
      data: { password: sha256Hash }
    });

    const isVerified3 = await passwordController.verifyPassword(testPassword, sha256Hash, testEmail);
    console.log(`✓ Verification Result when disabled: ${isVerified3}`);
    if (isVerified3) {
      throw new Error('SHA-256 hash was verified even though ALLOW_SHA256_FALLBACK is false!');
    }
    console.log('✅ Correctly rejected legacy SHA-256 hash when ALLOW_SHA256_FALLBACK is set to false.');

  } catch (error) {
    console.error('\n❌ Password migration test failed:', error);
    process.exitCode = 1;
  } finally {
    // 7. Cleanup DB
    console.log('\n🧹 Cleaning up test user data...');
    try {
      await prisma.user.deleteMany({
        where: { email: testEmail }
      });
      console.log('✓ Database cleaned.');
    } catch (e) {
      console.error('⚠️ Cleanup database error:', e.message);
    }
    
    await pool.end();
    await prisma.$disconnect();
    console.log('✓ Connections closed.');
  }
}

testPasswordMigration();
