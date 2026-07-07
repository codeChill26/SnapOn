'use strict';

const { forgotPassword, verifyForgotPasswordOtp } = require('./forgotPassword');
const resetPassword = require('./resetPassword');
const prisma = require('../../db/prisma');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { AUTH_CONFIG } = require('../../utils/constants');

async function verifyPassword(password, storedHash, email = null) {
  if (!storedHash) return false;

  // 1. If stored hash is Bcrypt, compare immediately
  if (storedHash.startsWith('$2')) {
    return await bcrypt.compare(password, storedHash);
  }

  // 2. Otherwise, check if SHA-256 fallback is allowed
  if (!AUTH_CONFIG.ALLOW_SHA256_FALLBACK) {
    console.warn('[PASSWORD AUTH] Rejected legacy SHA-256 hash because ALLOW_SHA256_FALLBACK is disabled.');
    return false;
  }

  // 3. Verify legacy SHA-256 hash
  const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
  const isMatch = sha256Hash === storedHash;

  if (isMatch && email) {
    try {
      // 4. Perform automatic migration to Bcrypt
      const newBcryptHash = await bcrypt.hash(password, AUTH_CONFIG.BCRYPT_SALT_ROUNDS);
      await prisma.user.update({
        where: { email: email.trim().toLowerCase() },
        data: { password: newBcryptHash }
      });
      console.log(`[PASSWORD MIGRATION] User ${email} password successfully migrated from SHA-256 to Bcrypt.`);
    } catch (dbErr) {
      console.error(`[PASSWORD MIGRATION] Automatic Bcrypt migration failed for user ${email}:`, dbErr.message);
    }
  }

  return isMatch;
}

module.exports = {
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
  verifyPassword,
};
