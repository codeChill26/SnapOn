const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticate = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

// All chat routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Get all conversations for the authenticated user
 *     tags: [Chat]
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 */
router.get('/conversations', chatController.getConversations);

/**
 * @swagger
 * /api/chat/conversations/start:
 *   post:
 *     summary: Start or retrieve a conversation with another user
 *     tags: [Chat]
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the other user to chat with
 *     responses:
 *       200:
 *         description: Conversation started or retrieved successfully
 */
router.post('/conversations/start', chatController.startConversation);

/**
 * @swagger
 * /api/chat/conversations/{id}/messages:
 *   get:
 *     summary: Get all messages in a conversation
 *     tags: [Chat]
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The conversation ID
 *     responses:
 *       200:
 *         description: List of messages
 */
router.get('/conversations/:id/messages', chatController.getMessages);

/**
 * @swagger
 * /api/chat/conversations/{id}/messages:
 *   post:
 *     summary: Send a message in a conversation
 *     tags: [Chat]
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: The message text
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
router.post('/conversations/:id/messages', chatController.sendMessage);

// Upload chat image attachment
router.post('/attachments/image', rateLimiter('chat-upload', 10, 60), chatController.uploadChatImage);

// Mark conversation as read
router.post('/conversations/:id/read', chatController.markConversationAsRead);

module.exports = router;
