const prisma = require('../db/prisma');
const { success, error } = require('../utils/responseHandler');
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

      const formatted = await Promise.all(conversations.map(async (c) => {
        const otherUser = c.user1Id === userId ? c.user2 : c.user1;
        const lastReadAt = c.user1Id === userId ? c.user1LastReadAt : c.user2LastReadAt;

        const unreadCount = await prisma.message.count({
          where: {
            conversationId: c.id,
            senderId: { not: userId },
            ...(lastReadAt && {
              createdAt: { gt: lastReadAt }
            })
          }
        });

        return {
          id: c.id,
          otherUser,
          lastMessage: c.messages[0] || null,
          unreadCount,
          updatedAt: c.updatedAt
        };
      }));

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

      const conversation = await prisma.conversation.findUnique({
        where: { id }
      });

      if (!conversation) {
        return error(res, 'Conversation not found.', 404);
      }

      if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
        return error(res, 'Access denied.', 403);
      }

      const messages = await prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'asc' }
      });

      return success(res, messages, 'Messages retrieved successfully.');
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

      // Update conversation's updatedAt timestamp and sender's lastReadAt
      const isUser1 = conversation.user1Id === userId;
      await prisma.conversation.update({
        where: { id },
        data: {
          updatedAt: new Date(),
          ...(isUser1 ? { user1LastReadAt: new Date() } : { user2LastReadAt: new Date() })
        }
      });

      // Broadcast new message via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(conversation.user1Id).emit('message_received', message);
        io.to(conversation.user2Id).emit('message_received', message);
      }

      // Send push notification to receiver in background
      const senderName = isUser1 ? conversation.user1.fullName : conversation.user2.fullName;
      const receiverId = isUser1 ? conversation.user2Id : conversation.user1Id;

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

      const base64Data = String(base64Image).replace(/^data:image\/[\w.+-]+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');

      // Validate file size (10MB)
      if (buffer.length > 10 * 1024 * 1024) {
        return error(res, 'File size exceeds limit (10MB)', 400);
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
