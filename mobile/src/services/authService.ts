import api from './api';
import { User } from '../types';

export const authService = {
  async syncUser(firebaseToken: string): Promise<User> {
    const response = await api.post<any>('/auth/sync-user', {
      firebaseToken,
    });
    return response.data.user;
  },

  async getProfile(): Promise<User> {
    const response = await api.get<any>('/users/profile');
    return response.data.user;
  },

  async updateProfile(profileData: { fullName?: string; phone?: string; avatarUrl?: string }): Promise<User> {
    const response = await api.put<any>('/users/profile', profileData);
    return response.data.user;
  },

  async uploadAvatar(base64Image: string): Promise<string> {
    const response = await api.post<any>('/users/upload-avatar', {
      base64Image,
    });
    return response.data.avatarUrl;
  },

  async verifyAccount(frontImage: string, backImage: string, selfieImage: string): Promise<User> {
    const response = await api.post<any>('/users/verify', {
      frontImage,
      backImage,
      selfieImage,
    });
    return response.data.user;
  },
};
