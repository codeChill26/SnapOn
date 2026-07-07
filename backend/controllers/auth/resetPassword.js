'use strict';

const prisma = require('../../db/prisma');
const response = require('../../utils/responseHandler');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { AUTH_CONFIG } = require('../../utils/constants');
const admin = require('firebase-admin');

async function resetPassword(req, res) {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return response.error(res, 'Reset token and new password are required.', 400);
    }

    if (newPassword.length < 8) {
      return response.error(res, 'Password must be at least 8 characters long.', 400);
    }

    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, used: false }
    });

    if (!tokenRecord) {
      return response.error(res, 'Invalid reset token.', 400);
    }

    if (new Date() > new Date(tokenRecord.expiresAt)) {
      return response.error(res, 'Invalid reset token.', 400);
    }

    console.log(`[FORGOT PASSWORD] Resetting password for email: ${tokenRecord.email}`);

    const hashedPassword = await bcrypt.hash(newPassword, AUTH_CONFIG.BCRYPT_SALT_ROUNDS);

    const updatedUser = await prisma.user.update({
      where: { email: tokenRecord.email },
      data: { password: hashedPassword }
    });

    if (admin.apps.length > 0 && updatedUser.firebaseUid) {
      const hasServiceAccount = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;
      if (!hasServiceAccount) {
        console.warn('⚠️ [FORGOT PASSWORD] Firebase Service Account credentials missing. Cannot sync password update to Firebase Auth.');
        return response.error(res, 'Không thể reset mật khẩu: Backend của bạn thiếu cấu hình biến môi trường FIREBASE_CLIENT_EMAIL hoặc FIREBASE_PRIVATE_KEY (Service Account) để đồng bộ mật khẩu lên Firebase.', 500);
      }

      try {
        console.log(`[FORGOT PASSWORD] Syncing new password to Firebase Auth for uid: ${updatedUser.firebaseUid}`);
        await admin.auth().updateUser(updatedUser.firebaseUid, {
          password: newPassword
        });
      } catch (fbError) {
        console.error('❌ Failed to update password in Firebase Auth:', fbError);
        return response.error(res, 'Failed to sync password reset with Firebase Authentication: ' + fbError.message, 500);
      }
    }

    await prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { used: true }
    });

    await prisma.forgotPasswordOTP.deleteMany({
      where: { email: tokenRecord.email }
    });

    console.log(`[FORGOT PASSWORD] Password reset completed successfully for ${tokenRecord.email}`);

    return response.success(res, null, 'Password has been reset successfully.');
  } catch (error) {
    console.error('❌ Reset password error:', error);
    return response.error(res, 'Internal server error.', 500);
  }
}

module.exports = resetPassword;
