/**
 * Socket.io Connection Event Handler
 * Manages room subscriptions, custom events, and disconnections.
 */
const prisma = require('../db/prisma');

module.exports = (io, socket) => {
  const userId = socket.user.id;
  const userName = socket.user.fullName;

  console.log(`🔌 User connected: ${userName} (${userId}) on socket ${socket.id}`);

  // Override socket.join to enforce strict room authorization checks
  const originalJoin = socket.join.bind(socket);
  socket.join = async (rooms) => {
    const roomList = Array.isArray(rooms) ? rooms : [rooms];
    for (const room of roomList) {
      // 1. A user is always allowed to join their own private room
      if (room === userId) {
        await originalJoin(room);
        continue;
      }

      // 2. Allow joining a conversation room if the user is a participant of it
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(room)) {
        try {
          const conversation = await prisma.conversation.findUnique({
            where: { id: room }
          });
          if (conversation && (conversation.user1Id === userId || conversation.user2Id === userId)) {
            await originalJoin(room);
            continue;
          }
        } catch (err) {
          console.error(`Error verifying room permission for room ${room}:`, err);
        }
      }

      // 3. Reject any other rooms
      console.warn(`🔒 Access denied: User ${userId} attempted to join unauthorized room: ${room}`);
    }
  };

  // Join a private room unique to this user ID
  // This allows us to broadcast events to this user across all their devices/tabs
  socket.join(userId);

  // Handle user disconnect
  socket.on('disconnect', (reason) => {
    console.log(`🔌 User disconnected: ${userName} (${userId}) from socket ${socket.id}. Reason: ${reason}`);
  });
};
