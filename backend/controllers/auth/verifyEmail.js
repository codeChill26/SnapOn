'use strict';

const prisma = require('../../db/prisma');
const response = require('../../utils/responseHandler');
const { generateAccessToken, generateRefreshToken } = require('../../utils/jwtHelper');
const { saveRefreshToken } = require('./authHelper');

async function verifyEmail(req, res) {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return response.error(res, 'Email và mã xác thực là bắt buộc', 400);
    }

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.trim() },
      include: { wallet: true }
    });

    if (!user) {
      return response.error(res, 'Không tìm thấy người dùng', 404);
    }

    if (user.isVerified) {
      return response.error(res, 'Tài khoản đã được xác thực trước đó', 400);
    }

    // 2. Check token mismatch or expiration
    if (!user.verificationToken || user.verificationToken !== token) {
      return response.error(res, 'Mã xác thực không hợp lệ', 400);
    }

    if (new Date() > new Date(user.verificationTokenExpires)) {
      return response.error(res, 'Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại mã mới', 400);
    }

    // 3. Update user to verified and clear the token fields
    const updatedUser = await prisma.user.update({
      where: { email: email.trim() },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpires: null
      }
    });

    // 4. Generate access & refresh tokens
    const accessToken = generateAccessToken(updatedUser);
    const refreshToken = generateRefreshToken(updatedUser);
    await saveRefreshToken(updatedUser, refreshToken, req);

    // Standardize user object keys to camelCase for the frontend
    const userResponse = {
      id: updatedUser.id,
      firebaseUid: updatedUser.firebaseUid || updatedUser.firebase_uid,
      fullName: updatedUser.fullName || updatedUser.full_name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      avatarUrl: updatedUser.avatarUrl || updatedUser.avatar_url,
      role: updatedUser.role || 'USER',
      status: updatedUser.status,
      isVerified: updatedUser.isVerified,
      isIdVerified: updatedUser.isIdVerified,
      createdAt: updatedUser.createdAt,
    };

    return response.success(res, {
      user: userResponse,
      accessToken,
      refreshToken,
      wallet: user.wallet
    }, 'Xác thực email thành công');
  } catch (error) {
    console.error('❌ Verify email error:', error);
    return response.error(res, 'Xác thực email thất bại: ' + error.message, 500);
  }
}

module.exports = verifyEmail;
