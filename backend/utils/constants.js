/**
 * Application Constants & Enums
 */

const TASK_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const APPLICATION_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
};

const ASSIGNED_TASK_STATUS = {
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const USER_ROLES = {
  POSTER: 'POSTER',
  TASKER: 'TASKER',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
};

const ASSIGNED_BY = {
  MANUAL: 'MANUAL',
  AUTO_MATCH: 'AUTO_MATCH',
};

const TASK_TYPES = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
};

const LOCATION_TYPES = {
  TASK_LOCATION: 'TASK_LOCATION',
  MEETING_POINT: 'MEETING_POINT',
};

// Matching algorithm weights
const MATCHING_WEIGHTS = {
  PRICE: 0.30,
  RATING: 0.25,
  DISTANCE: 0.20,
  COMPLETION_RATE: 0.15,
  RESPONSE_TIME: 0.10,
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
};

// Configurable cache TTL values (in seconds)
const CACHE_CONFIG = {
  TASK_LIST_TTL: 30,
  TASK_DETAIL_TTL: 120,
  SMS_OTP_TTL: 300,
};

// Authentication configurations
const AUTH_CONFIG = {
  EMAIL_OTP_EXPIRY_MS: 15 * 60 * 1000,
  FORGOT_PASSWORD_MIN_LOCK_SEC: 60,
  FORGOT_PASSWORD_HOUR_LOCK_SEC: 3600,
  FORGOT_PASSWORD_OTP_EXPIRY_MS: 5 * 60 * 1000,
  PASSWORD_RESET_TOKEN_EXPIRY_MS: 10 * 60 * 1000,
  CLEANUP_INTERVAL_MS: 60000,
  BCRYPT_SALT_ROUNDS: 10,
  
  // NOTE: Password Migration Plan (SHA-256 to Bcrypt)
  // - Phase 1 (Current): ALLOW_SHA256_FALLBACK = true. Users logging in with legacy SHA-256 hashes
  //   will have their password automatically migrated/re-hashed to Bcrypt upon successful verification.
  // - Phase 2 (Planned): ALLOW_SHA256_FALLBACK = false. Deny legacy SHA-256 logins. This flag will be set to false
  //   after verification that the majority of active users have logged in once and been migrated.
  // - Phase 3 (Planned): Delete fallback verification logic completely from passwordController.js.
  ALLOW_SHA256_FALLBACK: true,
  
  ALLOW_DEBUG_OTP: process.env.ALLOW_DEBUG_OTP === 'true',
};

module.exports = {
  TASK_STATUS,
  APPLICATION_STATUS,
  ASSIGNED_TASK_STATUS,
  USER_ROLES,
  ASSIGNED_BY,
  TASK_TYPES,
  LOCATION_TYPES,
  MATCHING_WEIGHTS,
  PAGINATION,
  CACHE_CONFIG,
  AUTH_CONFIG,
};
