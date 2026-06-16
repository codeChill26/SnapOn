/**
 * Socket.io Connection Event Handler
 * Manages room subscriptions, custom events, and disconnections.
 */
module.exports = (io, socket) => {
  const userId = socket.user.id;
  const userName = socket.user.fullName;

  console.log(`🔌 User connected: ${userName} (${userId}) on socket ${socket.id}`);

  // Join a private room unique to this user ID
  // This allows us to broadcast events to this user across all their devices/tabs
  socket.join(userId);

  // Handle user disconnect
  socket.on('disconnect', (reason) => {
    console.log(`🔌 User disconnected: ${userName} (${userId}) from socket ${socket.id}. Reason: ${reason}`);
  });
};
