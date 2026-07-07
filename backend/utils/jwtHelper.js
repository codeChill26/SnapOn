const jwt = require('jsonwebtoken');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

const DEFAULT_ACCESS_SECRET = 'snapon_jwt_access_secret_key_2026_secure';
const DEFAULT_REFRESH_SECRET = 'snapon_jwt_refresh_secret_key_2026_secure';

if (!JWT_ACCESS_SECRET) {
  throw new Error("CRITICAL: JWT_ACCESS_SECRET environment variable is missing. App cannot start.");
}
if (!JWT_REFRESH_SECRET) {
  throw new Error("CRITICAL: JWT_REFRESH_SECRET environment variable is missing. App cannot start.");
}

if (process.env.NODE_ENV === 'production') {
  if (JWT_ACCESS_SECRET === DEFAULT_ACCESS_SECRET) {
    throw new Error("CRITICAL: JWT_ACCESS_SECRET cannot be the default fallback key in production.");
  }
  if (JWT_REFRESH_SECRET === DEFAULT_REFRESH_SECRET) {
    throw new Error("CRITICAL: JWT_REFRESH_SECRET cannot be the default fallback key in production.");
  }
}

module.exports = {
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY_DAYS,

  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.id,
        firebaseUid: user.firebase_uid || user.firebaseUid,
        fullName: user.full_name || user.fullName,
        email: user.email,
        role: user.role || 'USER',
        status: user.status
      },
      JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
  },

  generateRefreshToken(user) {
    return jwt.sign(
      { id: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
    );
  },

  verifyAccessToken(token) {
    return jwt.verify(token, JWT_ACCESS_SECRET);
  },

  verifyRefreshToken(token) {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  }
};
