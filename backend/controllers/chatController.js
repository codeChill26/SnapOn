const prisma = require('../db/prisma');
const { success, error, paginated } = require('../utils/responseHandler');
const cloudinary = require('../utils/cloudinary');
const { sendExpoPushNotification } = require('../utils/pushNotification');

/**
 * Chat Controller — Handles chat conversation and messaging logic
 */
const chatController = {
  /**
   * GET /api/chat/conversations
   * Get list of conversations of logged-in user
   */
  async getConversations(req, res) {
    try {
      const userId = req.user.id;
      const conversations = await prisma.conversation.findMany({
        where: {
          OR: [
            { user1Id: userId },
            { user2Id: userId }
          ]
        },
        include: {
          user1: {
            select: { id: true, fullName: true, avatarUrl: true, role: true, email: true }
          },
          user2: {
            select: { id: true, fullName: true, avatarUrl: true, role: true, email: true }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      // Lấy số lượng tin nhắn chưa đọc cho toàn bộ hội thoại của user trong 1 câu truy vấn raw SQL duy nhất để tránh N+1 query
      const unreadCounts = await prisma.$queryRaw`
        SELECT 
          c.id AS conversation_id,
          COUNT(m.id)::int AS unread_count
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id 
          AND m.sender_id != ${userId}::uuid
          AND (
            (c.user1_id = ${userId}::uuid AND (c.user1_last_read_at IS NULL OR m.created_at > c.user1_last_read_at))
            OR
            (c.user2_id = ${userId}::uuid AND (c.user2_last_read_at IS NULL OR m.created_at > c.user2_last_read_at))
          )
        WHERE c.user1_id = ${userId}::uuid OR c.user2_id = ${userId}::uuid
        GROUP BY c.id
      `;

      const unreadMap = {};
      if (Array.isArray(unreadCounts)) {
        unreadCounts.forEach(row => {
          unreadMap[row.conversation_id] = row.unread_count || 0;
        });
      }

      const formatted = conversations.map((c) => {
        const otherUser = c.user1Id === userId ? c.user2 : c.user1;
        const unreadCount = unreadMap[c.id] || 0;

        return {
          id: c.id,
          otherUser,
          lastMessage: c.messages[0] || null,
          unreadCount,
          updatedAt: c.updatedAt
        };
      });

      return success(res, formatted, 'Conversations retrieved successfully.');
    } catch (err) {
      console.error('Get conversations error:', err);
      return error(res, 'Failed to retrieve conversations.', 500);
    }
  },

  /**
   * GET /api/chat/conversations/:id/messages
   * Get all messages in a conversation
   */
  async getMessages(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const conversation = await prisma.conversation.findUnique({
        where: { id }
      });

      if (!conversation) {
        return error(res, 'Conversation not found.', 404);
      }

      if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
        return error(res, 'Access denied.', 403);
      }

      // Mark conversation as read
      const isUser1 = conversation.user1Id === userId;
      const readAt = new Date();
      if (isUser1) {
        await prisma.$executeRaw`
          UPDATE conversations
          SET user1_last_read_at = ${readAt}
          WHERE id = ${id}::uuid
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE conversations
          SET user2_last_read_at = ${readAt}
          WHERE id = ${id}::uuid
        `;
      }

      const otherUserId = isUser1 ? conversation.user2Id : conversation.user1Id;
      await prisma.message.updateMany({
        where: {
          conversationId: id,
          senderId: otherUserId,
          status: { not: 'READ' }
        },
        data: {
          status: 'READ',
          readAt
        }
      });

      const io = req.app.get('io');
      if (io) {
        io.to(otherUserId).emit('conversation_read', {
          conversationId: id,
          readerId: userId,
          readAt
        });
      }

      const currentPage = Math.max(parseInt(page) || 1, 1);
      const currentLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
      const skip = (currentPage - 1) * currentLimit;

      const total = await prisma.message.count({
        where: { conversationId: id }
      });

      const messages = await prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: currentLimit
      });

      messages.reverse();

      return paginated(res, messages, {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages: Math.ceil(total / currentLimit)
      }, 'Messages retrieved successfully.');
    } catch (err) {
      console.error('Get messages error:', err);
      return error(res, 'Failed to retrieve messages.', 500);
    }
  },

  /**
   * POST /api/chat/conversations/:id/messages
   * Send a message in a conversation
   */
  async sendMessage(req, res) {
    try {
      const { id } = req.params;
      const { text, type = 'TEXT', imageUrl } = req.body;
      const userId = req.user.id;

      if (type === 'TEXT' && (!text || text.trim() === '')) {
        return error(res, 'Message text is required for text messages.', 400);
      }
      if (type === 'IMAGE' && (!imageUrl || imageUrl.trim() === '')) {
        return error(res, 'Image URL is required for image messages.', 400);
      }
      if (type === 'MIXED' && (!imageUrl || imageUrl.trim() === '')) {
        return error(res, 'Image URL is required for mixed messages.', 400);
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          user1: { select: { id: true, fullName: true } },
          user2: { select: { id: true, fullName: true } }
        }
      });

      if (!conversation) {
        return error(res, 'Conversation not found.', 404);
      }

      if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
        return error(res, 'Access denied.', 403);
      }

      const message = await prisma.message.create({
        data: {
          conversationId: id,
          senderId: userId,
          text: text ? text.trim() : null,
          type,
          imageUrl: imageUrl || null,
          status: 'SENT'
        }
      });

      // Update conversation's updatedAt timestamp
      await prisma.conversation.update({
        where: { id },
        data: {
          updatedAt: new Date()
        }
      });

      // Define isUser1 and receiverId to prevent crash and duplicate notifications
      const isUser1 = conversation.user1Id === userId;
      const receiverId = isUser1 ? conversation.user2Id : conversation.user1Id;
      const senderName = isUser1 ? conversation.user1.fullName : conversation.user2.fullName;

      // Broadcast new message via Socket.io to the receiver only
      const io = req.app.get('io');
      if (io) {
        io.to(receiverId).emit('message_received', message);
      }

      void prisma.pushToken.findMany({
        where: { userId: receiverId }
      }).then(tokens => {
        if (tokens && tokens.length > 0) {
          const tokenStrings = tokens.map(t => t.token);
          const bodyText = type === 'IMAGE' ? '📷 Đã gửi một ảnh' : message.text || '📷 Đã gửi một ảnh';
          void sendExpoPushNotification(
            tokenStrings,
            senderName,
            bodyText,
            {
              conversationId: id,
              otherUserId: userId,
              screen: 'ChatDetail'
            }
          );
        }
      }).catch(err => console.warn('Failed to send push notifications:', err));

      return success(res, message, 'Message sent successfully.', 201);
    } catch (err) {
      console.error('Send message error:', err);
      return error(res, 'Failed to send message.', 500);
    }
  },

  /**
   * POST /api/chat/conversations/start
   * Start a conversation with a user by passing their userId
   */
  async startConversation(req, res) {
    try {
      const currentUserId = req.user.id;
      const { userId: otherUserId } = req.body;

      if (!otherUserId) {
        return error(res, 'User ID is required.', 400);
      }

      if (currentUserId === otherUserId) {
        return error(res, 'You cannot start a conversation with yourself.', 400);
      }

      // Check if other user exists
      const otherUser = await prisma.user.findUnique({
        where: { id: otherUserId }
      });

      if (!otherUser) {
        return error(res, 'User not found.', 404);
      }

      // Enforce user1Id < user2Id lexicographically to guarantee unique [user1Id, user2Id]
      const user1Id = currentUserId < otherUserId ? currentUserId : otherUserId;
      const user2Id = currentUserId < otherUserId ? otherUserId : currentUserId;

      // Find or create conversation
      let conversation = await prisma.conversation.findUnique({
        where: {
          user1Id_user2Id: { user1Id, user2Id }
        },
        include: {
          user1: { select: { id: true, fullName: true, avatarUrl: true, role: true, email: true } },
          user2: { select: { id: true, fullName: true, avatarUrl: true, role: true, email: true } }
        }
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { user1Id, user2Id },
          include: {
            user1: { select: { id: true, fullName: true, avatarUrl: true, role: true, email: true } },
            user2: { select: { id: true, fullName: true, avatarUrl: true, role: true, email: true } }
          }
        });
      }

      const otherUserSelected = conversation.user1Id === currentUserId ? conversation.user2 : conversation.user1;

      const result = {
        id: conversation.id,
        otherUser: otherUserSelected,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      };

      return success(res, result, 'Conversation started successfully.');
    } catch (err) {
      console.error('Start conversation error:', err);
      return error(res, 'Failed to start conversation.', 500);
    }
  },

  /**
   * POST /api/chat/attachments/image
   * Upload chat attachment image (Base64)
   */
  async uploadChatImage(req, res) {
    try {
      const { base64Image } = req.body;
      if (!base64Image) {
        return error(res, 'No image data provided', 400);
      }

      const { validateBase64Image } = require('../utils/fileValidator');
      try {
        validateBase64Image(base64Image, 10); // 10MB limit
      } catch (valErr) {
        return error(res, valErr.message, 400);
      }

      const imageUrl = await cloudinary.uploadImage(base64Image, { folder: 'snapon_chat' });

      return success(res, { imageUrl }, 'Image uploaded successfully.', 201);
    } catch (err) {
      console.error('Upload chat image error:', err);
      return error(res, 'Failed to upload chat image.', 500);
    }
  },

  /**
   * POST /api/chat/conversations/:id/read
   * Mark conversation messages as read
   */
  async markConversationAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const conversation = await prisma.conversation.findUnique({
        where: { id }
      });

      if (!conversation) {
        return error(res, 'Conversation not found.', 404);
      }

      if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
        return error(res, 'Access denied.', 403);
      }

      // Update the user's lastReadAt timestamp
      const isUser1 = conversation.user1Id === userId;
      const readAt = new Date();
      if (isUser1) {
        await prisma.$executeRaw`
          UPDATE conversations
          SET user1_last_read_at = ${readAt}
          WHERE id = ${id}::uuid
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE conversations
          SET user2_last_read_at = ${readAt}
          WHERE id = ${id}::uuid
        `;
      }

      // Update the status of messages sent by the other user to READ
      const otherUserId = isUser1 ? conversation.user2Id : conversation.user1Id;
      await prisma.message.updateMany({
        where: {
          conversationId: id,
          senderId: otherUserId,
          status: { not: 'READ' }
        },
        data: {
          status: 'READ',
          readAt
        }
      });

      // Notify the sender via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(otherUserId).emit('conversation_read', {
          conversationId: id,
          readerId: userId,
          readAt
        });
      }

      return success(res, { success: true }, 'Conversation marked as read.');
    } catch (err) {
      console.error('Mark conversation as read error:', err);
      return error(res, 'Failed to mark conversation as read.', 500);
    }
  },

  /**
   * POST /api/users/push-token
   * Register push token
   */
  async registerPushToken(req, res) {
    try {
      const { token, platform } = req.body;
      const userId = req.user.id;

      if (!token || !platform) {
        return error(res, 'Token and platform are required.', 400);
      }

      const pushToken = await prisma.pushToken.upsert({
        where: { token },
        update: { userId, platform: platform.toLowerCase() },
        create: {
          userId,
          token,
          platform: platform.toLowerCase()
        }
      });

      return success(res, pushToken, 'Push token registered successfully.', 201);
    } catch (err) {
      console.error('Register push token error:', err);
      return error(res, 'Failed to register push token.', 500);
    }
  },

  /**
   * DELETE /api/users/push-token
   * Remove push token
   */
  async removePushToken(req, res) {
    try {
      const { token } = req.body;
      if (!token) {
        return error(res, 'Token is required.', 400);
      }

      await prisma.pushToken.deleteMany({
        where: { token }
      });

      return success(res, null, 'Push token removed successfully.');
    } catch (err) {
      console.error('Remove push token error:', err);
      return error(res, 'Failed to remove push token.', 500);
    }
  }
};

module.exports = chatController;
