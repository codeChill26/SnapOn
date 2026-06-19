import api from './api';
import { ApiResponse } from '../types';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string | null;
  type?: 'TEXT' | 'IMAGE' | 'MIXED';
  imageUrl?: string | null;
  status?: 'SENT' | 'DELIVERED' | 'READ';
  readAt?: string | null;
  createdAt: string;
}

export interface SendMessagePayload {
  text?: string;
  type?: 'TEXT' | 'IMAGE' | 'MIXED';
  imageUrl?: string;
}

export interface ChatConversation {
  id: string;
  otherUser: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    role: string;
    email: string;
  };
  lastMessage: ChatMessage | null;
  unreadCount?: number;
  updatedAt: string;
}

export const chatService = {
  async getConversations(): Promise<ChatConversation[]> {
    const response = await api.get<ApiResponse<ChatConversation[]>>('/chat/conversations');
    return response.data.data;
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const response = await api.get<ApiResponse<ChatMessage[]>>(`/chat/conversations/${conversationId}/messages`);
    return response.data.data;
  },

  async sendMessage(conversationId: string, payload: string | SendMessagePayload): Promise<ChatMessage> {
    const body = typeof payload === 'string' ? { text: payload } : payload;
    const response = await api.post<ApiResponse<ChatMessage>>(`/chat/conversations/${conversationId}/messages`, body);
    return response.data.data;
  },

  async startConversation(userId: string): Promise<ChatConversation> {
    const response = await api.post<ApiResponse<ChatConversation>>('/chat/conversations/start', { userId });
    return response.data.data;
  },

  async uploadChatImage(base64Image: string): Promise<string> {
    const response = await api.post<ApiResponse<{ imageUrl: string }>>('/chat/attachments/image', { base64Image });
    return response.data.data.imageUrl;
  },

  async markConversationAsRead(conversationId: string): Promise<void> {
    await api.post(`/chat/conversations/${conversationId}/read`);
  },

  async registerPushToken(token: string, platform: string): Promise<void> {
    await api.post('/users/push-token', { token, platform });
  },

  async removePushToken(token: string): Promise<void> {
    await api.delete('/users/push-token', { data: { token } });
  },
};
