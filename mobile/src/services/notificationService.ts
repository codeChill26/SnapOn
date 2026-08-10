import api from './api';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: string;
  task_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface GetNotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

export const notificationService = {
  async getNotifications(): Promise<GetNotificationsResponse> {
    const res = await api.get('/notifications');
    const data = res.data.data;
    return {
      notifications: data.notifications || [],
      unreadCount: data.unreadCount || 0,
    };
  },

  async markAsRead(id: string): Promise<AppNotification> {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data.data;
  },

  async markAllAsRead(): Promise<boolean> {
    await api.put('/notifications/read-all');
    return true;
  },

  async registerDeviceForChatNotifications(): Promise<void> {
    // Push token registration placeholder
  },
};
