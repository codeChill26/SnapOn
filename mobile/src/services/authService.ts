import api from './api';
import { User, ApiResponse } from '../types';

export const authService = {
  async syncUser(firebaseToken: string): Promise<User> {
    const response = await api.post<ApiResponse<User>>(
      '/auth/sync-user',
      { firebaseToken },
      {
        headers: {
          Authorization: `Bearer ${firebaseToken}`,
        },
      }
    );
    return (response.data as any).user || response.data.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/users/profile');
    return (response.data as any).user || response.data.data;
  },
};
