import api from './api';
import { AppNotification } from '../types';

export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    try {
      const response = await api.get('/notifications');
      const raw = response.data?.data || response.data || [];
      if (Array.isArray(raw)) {
        return raw.map((n: any) => ({
          id: n.id,
          title: n.title || 'Thông báo',
          message: n.message || n.content || '',
          time: n.created_at ? new Date(n.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
          type: n.type || 'system',
          isUnread: !n.read && !n.is_read,
          link: n.link,
          createdAt: n.created_at,
        }));
      }
    } catch {
      // Fallback
    }
    return [];
  },

  async markAllAsRead(): Promise<void> {
    try {
      await api.put('/notifications/read-all');
    } catch {}
  },

  async markAsRead(id: string): Promise<void> {
    try {
      await api.put(`/notifications/${id}/read`);
    } catch {}
  },
};
