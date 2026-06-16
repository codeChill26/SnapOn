const prisma = require('../db/prisma');
const { success, error } = require('../utils/responseHandler');

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

      const formatted = conversations.map(c => {
        const otherUser = c.user1Id === userId ? c.user2 : c.user1;
        return {
          id: c.id,
          otherUser,
          lastMessage: c.messages[0] || null,
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
      const { text } = req.body;
      const userId = req.user.id;

      if (!text || text.trim() === '') {
        return error(res, 'Message text is required.', 400);
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id }
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
          text
        }
      });

      // Update conversation's updatedAt timestamp
      await prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() }
      });

      // Broadcast new message via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(conversation.user1Id).emit('message_received', message);
        io.to(conversation.user2Id).emit('message_received', message);
      }

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
  }
};

module.exports = chatController;
