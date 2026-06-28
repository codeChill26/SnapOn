const { verifyTokenForSocket } = require('./auth');

/**
 * Socket.io Authentication Middleware
 * Validates the connection token (from handshake.auth or query) and attaches user object to socket
 */
module.exports = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const xUserId = socket.handshake.auth?.xUserId || socket.handshake.query?.xUserId || socket.handshake.headers?.['x-user-id'];

    if (!token && !xUserId) {
      return next(new Error('Authentication error: No token or user ID provided.'));
    }

    const user = await verifyTokenForSocket(token, xUserId);
    
    // Attach authenticated user to the socket object
    socket.user = user;
    next();
  } catch (err) {
    console.error('Socket authentication error:', err.message);
    next(new Error(`Authentication error: ${err.message}`));
  }
};
