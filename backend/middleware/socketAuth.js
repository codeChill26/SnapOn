const { verifyTokenForSocket } = require('./auth');

/**
 * Socket.io Authentication Middleware
 * Validates the connection token (from handshake.auth or query) and attaches user object to socket
 */
module.exports = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided.'));
    }

    const user = await verifyTokenForSocket(token);
    
    // Attach authenticated user to the socket object
    socket.user = user;
    next();
  } catch (err) {
    console.error('Socket authentication error:', err.message);
    next(new Error(`Authentication error: ${err.message}`));
  }
};
