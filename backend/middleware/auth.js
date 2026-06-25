const admin = require('firebase-admin');
const pool = require('../config/db');
const { error } = require('../utils/responseHandler');
const jwt = require('jsonwebtoken');

/** Look up a user by their database UUID */
async function findUserById(userId) {
  const result = await pool.query(
    'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, created_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

/** Attach user data to request and call next */
function attachUser(req, user, res, next) {
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

  req.firebaseUser = {
    uid: user.firebase_uid,
    email: user.email,
    name: user.full_name,
    picture: user.avatar_url,
  };

  return next();
}

// ============================================================
// DEV MODE: Khi AUTH_MODE=dev, bỏ qua Firebase verification.
// Chỉ cần truyền header: x-user-id = <UUID của user trong DB>
// 
// PRODUCTION: Khi AUTH_MODE=firebase (hoặc không set),
// sẽ dùng Firebase ID token bình thường.
// ============================================================

const FIREBASE_CONFIGURED = !!(process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID);

let AUTH_MODE = process.env.AUTH_MODE || 'firebase';

// Auto-fallback: if Firebase is not configured, use dev mode
if (AUTH_MODE === 'firebase' && !FIREBASE_CONFIGURED) {
  console.log('🔓 Firebase not configured — automatically switching to DEV MODE');
  AUTH_MODE = 'dev';
}

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
    console.warn('   Automatically falling back to DEV MODE');
    AUTH_MODE = 'dev';
  }
}

if (AUTH_MODE === 'dev') {
  console.log('🔓 Auth running in DEV MODE — Firebase is bypassed');
  console.log('   Use header "x-user-id: <user-uuid>" or login via /api/auth/dev/login');
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
      // 1. Try verifying custom Access Token JWT first
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'snapon_jwt_access_secret_key_2026_secure');
          return attachUser(req, decoded, res, next);
        } catch (e) {
          // Fall through to regular dev mode fallback if not a valid JWT
        }
      }

      // For sync-user in dev mode: decode Firebase JWT from body (no verification)
      const isSyncUser = req.originalUrl && req.originalUrl.includes('/sync-user');
      if (isSyncUser) {
        const firebaseToken = req.body?.firebaseToken;
        if (firebaseToken) {
          // Handle mock-firebase-token (used by Google login mock & dev testing)
          if (firebaseToken.startsWith('mock-firebase-token')) {
            const email = firebaseToken.split(':')[1] || 'mock-user@example.com';
            req.firebaseUser = {
              uid: `mock-uid-${email.replace(/[@.]/g, '-')}`,
              email,
              name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
              picture: 'https://via.placeholder.com/150',
            };
            return next();
          }
          try {
            const payload = JSON.parse(
              Buffer.from(firebaseToken.split('.')[1], 'base64url').toString()
            );
            req.firebaseUser = {
              uid: payload.sub || payload.user_id || 'dev-uid',
              email: payload.email || 'dev@snapon.vn',
              name: payload.name || 'Dev User',
              picture: payload.picture || '',
            };
            return next();
          } catch (e) {
            // JWT decode failed, fall through
          }
        }
        // No token in body, try x-user-id
        const fallbackId = req.headers['x-user-id'];
        if (fallbackId) {
          const user = await findUserById(fallbackId);
          if (user) return attachUser(req, user, res, next);
        }
        return error(res, 'DEV MODE: Cannot sync user. Provide firebaseToken in body or x-user-id header.', 401);
      }

      let userId = req.headers['x-user-id'];

      // Fallback: use Bearer token as user ID (in dev mode, token = user UUID)
      if (!userId) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          userId = authHeader.split('Bearer ')[1];
        }
      }

      if (!userId) {
        return error(res, 'DEV MODE: Header "x-user-id" or Bearer token is required.', 401);
      }

      const user = await findUserById(userId);
      if (!user) {
        return error(res, 'User not found with the provided ID.', 404);
      }
      return attachUser(req, user, res, next);
    }

    // =====================
    // FIREBASE / CUSTOM JWT MODE
    // =====================
    const isSyncUser = req.originalUrl && req.originalUrl.includes('/sync-user');
    
    // For sync-user, we verify the Firebase ID Token
    if (isSyncUser) {
      let token = req.body?.firebaseToken;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split('Bearer ')[1];
      }

      if (!token) {
        return error(res, 'Access denied. No Firebase token provided.', 401);
      }

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

      req.firebaseUser = decodedToken;
      return next();
    }

    // For all other endpoints, verify our custom Access Token JWT
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1];
    }

    if (!token) {
      return error(res, 'Access denied. No token provided.', 401);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'snapon_jwt_access_secret_key_2026_secure');
      return attachUser(req, decoded, res, next);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return error(res, 'Token expired. Please refresh token.', 401);
      }
      // If custom JWT fails, check if it's a legacy Firebase ID Token for backward compatibility during transition
      try {
        let decodedFirebaseToken;
        if (token.startsWith('mock-firebase-token')) {
          const email = token.split(':')[1] || 'mock-user@example.com';
          decodedFirebaseToken = { uid: `mock-uid-${email.replace(/[@.]/g, '-')}` };
        } else {
          decodedFirebaseToken = await admin.auth().verifyIdToken(token);
        }

        const result = await pool.query(
          'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, created_at FROM users WHERE firebase_uid = $1',
          [decodedFirebaseToken.uid]
        );

        if (result.rows.length === 0) {
          return error(res, 'User not found. Please register first.', 404);
        }

        return attachUser(req, result.rows[0], res, next);
      } catch (fbErr) {
        return error(res, 'Invalid or expired token.', 401);
      }
    }
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return error(res, 'Authentication failed.', 401);
  }
};

const verifyTokenForSocket = async (token, xUserId) => {
  // If in dev mode, we can use xUserId
  if (AUTH_MODE === 'dev') {
    // Try to verify token as JWT first
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'snapon_jwt_access_secret_key_2026_secure');
        return {
          id: decoded.id,
          firebaseUid: decoded.firebaseUid || decoded.firebase_uid,
          fullName: decoded.fullName || decoded.full_name,
          avatarUrl: decoded.avatarUrl || decoded.avatar_url,
          email: decoded.email,
          role: decoded.role
        };
      } catch (e) {}
    }

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

  // Firebase / Custom JWT mode
  if (!token) {
    throw new Error('No token provided.');
  }

  // 1. Try custom Access Token JWT first
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'snapon_jwt_access_secret_key_2026_secure');
    if (decoded.status === 'BANNED') {
      throw new Error('User is banned.');
    }
    return {
      id: decoded.id,
      firebaseUid: decoded.firebaseUid || decoded.firebase_uid,
      fullName: decoded.fullName || decoded.full_name,
      avatarUrl: decoded.avatarUrl || decoded.avatar_url,
      email: decoded.email,
      role: decoded.role
    };
  } catch (err) {
    // 2. Fallback to Firebase ID Token validation (legacy support)
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
  }
};

module.exports = authenticate;
module.exports.verifyTokenForSocket = verifyTokenForSocket;