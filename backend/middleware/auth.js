const admin = require('firebase-admin');
const pool = require('../config/db');
const { error } = require('../utils/responseHandler');

// ============================================================
// DEV MODE: Khi AUTH_MODE=dev, bỏ qua Firebase verification.
// Chỉ cần truyền header: x-user-id = <UUID của user trong DB>
// 
// PRODUCTION: Khi AUTH_MODE=firebase (hoặc không set),
// sẽ dùng Firebase ID token bình thường.
// ============================================================

const AUTH_MODE = process.env.AUTH_MODE || 'firebase';

// Initialize Firebase Admin SDK (chỉ khi AUTH_MODE = firebase)
if (AUTH_MODE === 'firebase' && !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin SDK initialized');
  } catch (err) {
    console.warn('⚠️  Firebase Admin SDK not initialized:', err.message);
    console.warn('   Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env');
  }
} else if (AUTH_MODE === 'dev') {
  console.log('🔓 Auth running in DEV MODE — Firebase is bypassed');
  console.log('   Use header "x-user-id: <user-uuid>" to authenticate');
}

/**
 * Authentication Middleware
 * 
 * DEV MODE (AUTH_MODE=dev):
 *   - Đọc user ID từ header: x-user-id
 *   - Tìm user trong DB, attach vào req.user
 *   - Không cần Firebase token
 * 
 * PRODUCTION (AUTH_MODE=firebase):
 *   - Verify Firebase ID token từ Authorization: Bearer <token>
 *   - Tìm user trong DB bằng firebase_uid
 *   - Attach user info vào req.user
 */
const authenticate = async (req, res, next) => {
  try {
    // =====================
    // DEV MODE
    // =====================
    if (AUTH_MODE === 'dev') {
      let userId = req.headers['x-user-id'];

      // Fallback: if no x-user-id, try Authorization: Bearer <userId>
      if (!userId) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          userId = authHeader.split('Bearer ')[1];
        }
      }

      if (!userId) {
        return error(res, 'DEV MODE: Header "x-user-id" or "Authorization: Bearer <userId>" is required.', 401);
      }

      const result = await pool.query(
        'SELECT id, firebase_uid, full_name, email, phone, avatar_url, status, is_verified FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return error(res, 'User not found with the provided ID.', 404);
      }

      const user = result.rows[0];

      if (user.status === 'BANNED') {
        return error(res, 'Your account has been banned.', 403);
      }

      req.user = {
        id: user.id,
        firebaseUid: user.firebase_uid,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        status: user.status,
        isVerified: user.is_verified,
      };

      // For compatibility with routes expecting firebase payload
      req.firebaseUser = {
        uid: user.firebase_uid,
        email: user.email,
        name: user.full_name,
        picture: user.avatar_url,
      };

      return next();
    }

    // =====================
    // FIREBASE MODE
    // =====================
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Access denied. No token provided.', 401);
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // For compatibility with routes expecting firebase payload
    req.firebaseUser = decodedToken;

    // Find user in database by firebase_uid
    const result = await pool.query(
      'SELECT id, firebase_uid, full_name, email, phone, avatar_url, status, is_verified FROM users WHERE firebase_uid = $1',
      [decodedToken.uid]
    );

    if (result.rows.length === 0) {
      return error(res, 'User not found. Please register first.', 404);
    }

    const user = result.rows[0];

    if (user.status === 'BANNED') {
      return error(res, 'Your account has been banned.', 403);
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      firebaseUid: user.firebase_uid,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      status: user.status,
      isVerified: user.is_verified,
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);

    if (err.code === 'auth/id-token-expired') {
      return error(res, 'Token expired. Please login again.', 401);
    }
    if (err.code === 'auth/argument-error' || err.code === 'auth/id-token-revoked') {
      return error(res, 'Invalid token.', 401);
    }

    return error(res, 'Authentication failed.', 401);
  }
};

module.exports = authenticate;
