import api from './api';
import { User, Wallet } from '../types';

export const authService = {
  async syncUser(firebaseToken: string): Promise<{ user: User; accessToken?: string; refreshToken?: string; wallet?: Wallet }> {
    const response = await api.post('/auth/sync-user', { firebaseToken });
    const resData = response.data;
    const user = resData.data?.user || resData.user;
    const wallet = resData.data?.wallet || resData.wallet;
    return {
      user,
      accessToken: resData.data?.accessToken || resData.accessToken,
      refreshToken: resData.data?.refreshToken || resData.refreshToken,
      wallet,
    };
  },

  async getProfile(): Promise<User> {
    const response = await api.get('/users/profile');
    const resData = response.data;
    return resData.data?.user || resData.user || resData.data;
  },

  async updateProfile(profileData: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    coverUrl?: string;
    bio?: string;
    headline?: string;
    skills?: string[];
    bankName?: string;
    bankAccountNumber?: string;
  }): Promise<User> {
    const response = await api.put('/users/profile', profileData);
    const resData = response.data;
    return resData.data?.user || resData.user || resData.data;
  },

  async updateRole(role: string): Promise<User> {
    const response = await api.put('/users/role', { role });
    const resData = response.data;
    return resData.data?.user || resData.user || resData.data;
  },

  async uploadAvatar(base64Image: string): Promise<string> {
    const response = await api.post('/users/upload-avatar', { base64Image });
    return response.data.data?.avatarUrl || response.data.avatarUrl;
  },

  async uploadCover(base64Image: string): Promise<string> {
    const response = await api.post('/users/upload-cover', { base64Image });
    return response.data.data?.coverUrl || response.data.coverUrl;
  },

  async verifyAccount(frontImage: string, backImage: string, selfieImage: string): Promise<User> {
    const response = await api.post('/users/verify', {
      frontImage,
      backImage,
      selfieImage,
    });
    return response.data.data?.user || response.data.user;
  },

  async searchUserByPhone(phone: string): Promise<User | null> {
    const response = await api.get('/users/search', { params: { phone } });
    return response.data.data?.user || response.data.user || null;
  },

  async logout(refreshToken?: string): Promise<void> {
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore network errors during logout
    }
  },
};
