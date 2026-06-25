const { error } = require('../utils/responseHandler');

/**
 * Role-based Authorization Middleware
 * Usage: authorize('POSTER', 'ADMIN')
 * Checks if the authenticated user has one of the allowed roles.
 * 
 * Note: Since the DB schema doesn't have a 'role' column on users,
 * role is determined by context:
 * - POSTER: user who created the task (checked in controllers)
 * - TASKER: user who has a tasker_profile (checked here or in controllers)
 * - MANAGER / ADMIN: determined by user.status or a separate roles mechanism
 * 
 * This middleware is a lightweight guard. Detailed permission checks 
 * happen in controllers based on resource ownership.
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

module.exports = authorize;
