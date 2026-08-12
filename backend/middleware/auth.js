const admin = require('firebase-admin');
const pool = require('../config/db');
const { error } = require('../utils/responseHandler');
const jwt = require('jsonwebtoken');

/** Look up a user by their database UUID */
async function findUserById(userId) {
  const result = await pool.query(
    'SELECT id, firebase_uid, full_name, email, phone, avatar_url, cover_url, role, status, is_verified, is_id_verified, bio, headline, skills, bank_name, bank_account_number, created_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

/** Attach user data to request and call next */
function attachUser(req, user, res, next) {
  if (user.status === 'BANNED') {
    return error(res, 'Your account has been banned.', 403);
  }

  let skillsArr = [];
  if (user.skills) {
    if (Array.isArray(user.skills)) skillsArr = user.skills;
    else if (typeof user.skills === 'string') {
      try { skillsArr = JSON.parse(user.skills); } catch { skillsArr = []; }
    }
  }

  req.user = {
    id: user.id,
    firebaseUid: user.firebase_uid || user.firebaseUid,
    fullName: user.full_name || user.fullName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatar_url || user.avatarUrl,
    coverUrl: user.cover_url || user.coverUrl || '',
    role: user.role,
    status: user.status,
    isVerified: user.is_verified ?? user.isVerified,
    isIdVerified: user.is_id_verified ?? user.isIdVerified,
    bio: user.bio || '',
    headline: user.headline || '',
    skills: skillsArr,
    bankName: user.bank_name || user.bankName || '',
    bankAccountNumber: user.bank_account_number || user.bankAccountNumber || '',
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
// AUTH CONFIGURATION (FIREBASE AUTH ONLY)
// ============================================================

const FIREBASE_CONFIGURED = !!(process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID);

if (!FIREBASE_CONFIGURED) {
  throw new Error("CRITICAL: Firebase configuration missing. App cannot start.");
}

if (!process.env.JWT_ACCESS_SECRET) {
  throw new Error("CRITICAL: JWT_ACCESS_SECRET environment variable is missing. App cannot start.");
}

const getJwtAccessSecret = () => {
  return process.env.JWT_ACCESS_SECRET;
};

// Initialize Firebase Admin SDK (always required)
if (!admin.apps.length) {
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

/**
 * Authentication Middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const isSyncUser = req.originalUrl && req.originalUrl.includes('/sync-user');
    
    if (isSyncUser) {
      const token = req.body?.firebaseToken;
      
      if (!token) {
        return error(res, 'Access denied. No Firebase token provided.', 401);
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
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
      // 1. Verify custom app JWT
      const decoded = jwt.verify(token, getJwtAccessSecret());
      const dbUser = await findUserById(decoded.id);
      if (!dbUser) {
        return error(res, 'User not found.', 404);
      }
      return attachUser(req, dbUser, res, next);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return error(res, 'Token expired. Please refresh token.', 401);
      }
      try {
        // 2. Fallback to verify Firebase ID token directly
        const decodedFirebaseToken = await admin.auth().verifyIdToken(token);

        const result = await pool.query(
          'SELECT id, firebase_uid, full_name, email, phone, avatar_url, cover_url, role, status, is_verified, is_id_verified, bio, headline, skills, bank_name, bank_account_number, created_at FROM users WHERE firebase_uid = $1',
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

const verifyTokenForSocket = async (token) => {
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
    const decodedToken = await admin.auth().verifyIdToken(token);

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
      return error(res, 'Authentication required.', 401);
    }

    // If no specific roles required, just check authentication
    if (allowedRoles.length === 0) {
      return next();
    }

    const userRole = req.user.role;
    const normalizedUserRole = userRole ? userRole.toUpperCase() : '';
    const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase());

    if (!normalizedUserRole || !normalizedAllowedRoles.includes(normalizedUserRole)) {
      return error(
        res,
        'Access denied. You do not have permission to perform this action.',
        403
      );
    }

    next();
  };
};

const authenticateOptional = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, getJwtAccessSecret());
    const dbUser = await findUserById(decoded.id);
    if (dbUser) {
      attachUser(req, dbUser, res, () => {});
    }
    return next();
  } catch (err) {
    try {
      const decodedFirebaseToken = await admin.auth().verifyIdToken(token);
      const result = await pool.query(
        'SELECT id, firebase_uid, full_name, email, phone, avatar_url, cover_url, role, status, is_verified, is_id_verified, bio, headline, skills, bank_name, bank_account_number, created_at FROM users WHERE firebase_uid = $1',
        [decodedFirebaseToken.uid]
      );
      if (result.rows.length > 0) {
        attachUser(req, result.rows[0], res, () => {});
      }
    } catch (fbErr) {
      // Ignored for optional auth
    }
    return next();
  }
};

module.exports = authenticate;
module.exports.verifyTokenForSocket = verifyTokenForSocket;
module.exports.authorize = authorize;
module.exports.authenticateOptional = authenticateOptional;