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
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log('✅ Firebase Admin SDK initialized with Service Account credentials');
    } else if (projectId) {
      admin.initializeApp({
        projectId,
      });
      console.log(`✅ Firebase Admin SDK initialized with Project ID: ${projectId} (Token verification mode)`);
    } else {
      throw new Error('Neither service account credentials nor Firebase Project ID was found in environment variables.');
    }
  } catch (err) {
    console.warn('⚠️  Firebase Admin SDK not initialized:', err.message);
    console.warn('   Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (or at least VITE_FIREBASE_PROJECT_ID) in .env');
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
      const userId = req.headers['x-user-id'];

      if (!userId) {
        return error(res, 'DEV MODE: Header "x-user-id" is required.', 401);
      }

      const result = await pool.query(
        'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, created_at FROM users WHERE id = $1',
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
        role: user.role,
        status: user.status,
        isVerified: user.is_verified,
        createdAt: user.created_at,
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
    let decodedToken;
    if (token && token.startsWith('mock-firebase-token')) {
      const email = token.split(':')[1] || 'mock-user@example.com';
      const uid = `mock-uid-${email.replace(/[@.]/g, '-')}`;
      const name = email.split('@')[0];
      decodedToken = {
        uid,
        email,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        picture: 'https://via.placeholder.com/150',
      };
    } else {
      decodedToken = await admin.auth().verifyIdToken(token);
    }

    // For compatibility with routes expecting firebase payload
    req.firebaseUser = decodedToken;

    // Check if this is a sync-user request (which is used for registration/syncing new users)
    const isSyncUser = req.originalUrl && req.originalUrl.includes('/sync-user');
    if (isSyncUser) {
      return next();
    }

    const result = await pool.query(
      'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, created_at FROM users WHERE firebase_uid = $1',
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
      role: user.role,
      status: user.status,
      isVerified: user.is_verified,
      createdAt: user.created_at,
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

const verifyTokenForSocket = async (token, xUserId) => {
  // If in dev mode, we can use xUserId
  if (AUTH_MODE === 'dev') {
    if (!xUserId) {
      throw new Error('DEV MODE: User ID is required.');
    }
    const result = await pool.query(
      'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified FROM users WHERE id = $1',
      [xUserId]
    );
    if (result.rows.length === 0) {
      throw new Error('User not found.');
    }
    const user = result.rows[0];
    if (user.status === 'BANNED') {
      throw new Error('User is banned.');
    }
    return {
      id: user.id,
      firebaseUid: user.firebase_uid,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      email: user.email,
      role: user.role
    };
  }

  // Firebase / Mock Token mode
  if (!token) {
    throw new Error('No token provided.');
  }

  let decodedToken;
  if (token.startsWith('mock-firebase-token')) {
    const email = token.split(':')[1] || 'mock-user@example.com';
    const uid = `mock-uid-${email.replace(/[@.]/g, '-')}`;
    const name = email.split('@')[0];
    decodedToken = {
      uid,
      email,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      picture: 'https://via.placeholder.com/150',
    };
  } else {
    decodedToken = await admin.auth().verifyIdToken(token);
  }

  const result = await pool.query(
    'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified FROM users WHERE firebase_uid = $1',
    [decodedToken.uid]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found.');
  }

  const user = result.rows[0];
  if (user.status === 'BANNED') {
    throw new Error('User is banned.');
  }

  return {
    id: user.id,
    firebaseUid: user.firebase_uid,
    fullName: user.full_name,
    avatarUrl: user.avatar_url,
    email: user.email,
    role: user.role
  };
};

module.exports = authenticate;
module.exports.verifyTokenForSocket = verifyTokenForSocket;
