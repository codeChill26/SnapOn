import api from './api';
import { ApiResponse } from '../types';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
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

  async sendMessage(conversationId: string, text: string): Promise<ChatMessage> {
    const response = await api.post<ApiResponse<ChatMessage>>(`/chat/conversations/${conversationId}/messages`, { text });
    return response.data.data;
  },

  async startConversation(userId: string): Promise<ChatConversation> {
    const response = await api.post<ApiResponse<ChatConversation>>('/chat/conversations/start', { userId });
    return response.data.data;
  },
};
