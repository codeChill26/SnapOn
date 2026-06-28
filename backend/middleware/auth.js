const admin = require('firebase-admin');
const pool = require('../config/db');
const { error } = require('../utils/responseHandler');
const jwt = require('jsonwebtoken');

/** Look up a user by their database UUID */
async function findUserById(userId) {
  const result = await pool.query(
    'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, is_id_verified, created_at FROM users WHERE id = $1',
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
    firebaseUid: user.firebase_uid || user.firebaseUid,
    fullName: user.full_name || user.fullName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatar_url || user.avatarUrl,
    role: user.role,
    status: user.status,
    isVerified: user.is_verified ?? user.isVerified,
    isIdVerified: user.is_id_verified ?? user.isIdVerified,
    createdAt: user.created_at || user.createdAt,
  };

  req.firebaseUser = {
    uid: user.firebase_uid || user.firebaseUid,
    email: user.email,
    name: user.full_name || user.fullName,
    picture: user.avatar_url || user.avatarUrl,
  };

  return next();
}

// ============================================================
// AUTH CONFIGURATION
// ============================================================

const FIREBASE_CONFIGURED = !!(process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID);
let AUTH_MODE = process.env.AUTH_MODE || 'firebase';

if (AUTH_MODE === 'firebase' && !FIREBASE_CONFIGURED) {
  throw new Error("CRITICAL: Firebase configuration missing. App cannot start.");
}

if (!process.env.JWT_ACCESS_SECRET) {
  throw new Error("CRITICAL: JWT_ACCESS_SECRET environment variable is missing. App cannot start.");
}

const getJwtAccessSecret = () => {
  return process.env.JWT_ACCESS_SECRET;
};

// Initialize Firebase Admin SDK (only if AUTH_MODE = firebase)
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
    throw new Error(`CRITICAL: Firebase Admin SDK failed to initialize: ${err.message}`);
  }
}

if (AUTH_MODE === 'dev') {
  console.log('🔓 Auth running in DEV MODE — Firebase is bypassed');
  console.log('   Use header "x-user-id: <user-uuid>" or login via /api/auth/dev/login');
}

const isMockAllowed = () => {
  return AUTH_MODE === 'dev' || process.env.NODE_ENV !== 'production';
};

/**
 * Authentication Middleware
 */
const authenticate = async (req, res, next) => {
  try {
    // =====================
    // DEV MODE
    // =====================
    if (AUTH_MODE === 'dev') {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        try {
          const decoded = jwt.verify(token, getJwtAccessSecret());
          return attachUser(req, decoded, res, next);
        } catch (e) {
          if (e.name === 'TokenExpiredError') {
            return error(res, 'Token expired. Please refresh token.', 401);
          }
          if (token.startsWith('eyJ')) {
            return error(res, 'Invalid token.', 401);
          }
        }
      }

      const isSyncUser = req.originalUrl && req.originalUrl.includes('/sync-user');
      if (isSyncUser) {
        const firebaseToken = req.body?.firebaseToken;
        if (firebaseToken) {
          if (firebaseToken.startsWith('mock-firebase-token')) {
            if (!isMockAllowed()) {
              return error(res, 'Mock token not allowed in production.', 401);
            }
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
            // fall through
          }
        }
        const fallbackId = req.headers['x-user-id'];
        if (fallbackId) {
          const user = await findUserById(fallbackId);
          if (user) return attachUser(req, user, res, next);
        }
        return error(res, 'DEV MODE: Cannot sync user. Provide firebaseToken in body or x-user-id header.', 401);
      }

      let userId = req.headers['x-user-id'];
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
        if (!isMockAllowed()) {
          return error(res, 'Mock token not allowed in production.', 401);
        }
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

    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1];
    }

    if (!token) {
      return error(res, 'Access denied. No token provided.', 401);
    }

    try {
      const decoded = jwt.verify(token, getJwtAccessSecret());
      return attachUser(req, decoded, res, next);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return error(res, 'Token expired. Please refresh token.', 401);
      }
      try {
        let decodedFirebaseToken;
        if (token.startsWith('mock-firebase-token')) {
          if (!isMockAllowed()) {
            return error(res, 'Mock token not allowed in production.', 401);
          }
          const email = token.split(':')[1] || 'mock-user@example.com';
          decodedFirebaseToken = { uid: `mock-uid-${email.replace(/[@.]/g, '-')}` };
        } else {
          decodedFirebaseToken = await admin.auth().verifyIdToken(token);
        }

        const result = await pool.query(
          'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, is_id_verified, created_at FROM users WHERE firebase_uid = $1',
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
  if (AUTH_MODE === 'dev') {
    if (token) {
      try {
        const decoded = jwt.verify(token, getJwtAccessSecret());
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
      'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, is_id_verified FROM users WHERE id = $1',
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

  if (!token) {
    throw new Error('No token provided.');
  }

  try {
    const decoded = jwt.verify(token, getJwtAccessSecret());
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
    let decodedToken;
    if (token.startsWith('mock-firebase-token')) {
      if (!isMockAllowed()) {
        throw new Error('Mock token not allowed in production.');
      }
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
      'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, is_id_verified FROM users WHERE firebase_uid = $1',
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

/**
 * Middleware phân quyền (Role Authorization)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Access denied. User not authenticated.', 401);
    }

    const hasRole = allowedRoles.some(role => {
      return String(req.user.role).toUpperCase() === String(role).toUpperCase();
    });

    if (!hasRole) {
      return error(res, 'Bạn không có quyền thực hiện hành động này.', 403);
    }

    next();
  };
};

module.exports = authenticate;
module.exports.verifyTokenForSocket = verifyTokenForSocket;
module.exports.authorize = authorize;