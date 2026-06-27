import axios from 'axios';
import api from './api';
import Config from '../constants/config';
import { storage } from '../utils/storage';
import { User } from '../types';
import { detectBackend } from '../utils/backendDetector';

// Clean axios instance without 401 interceptor — used by tokenLogin to avoid
// race conditions with the interceptor's auto-logout during session restoration.
const cleanApi = axios.create({
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

cleanApi.interceptors.request.use(async (config) => {
  config.baseURL = await detectBackend();
  return config;
});

export const authService = {
  async syncUser(firebaseToken: string): Promise<{ user: User; accessToken: string; refreshToken: string; wallet: any }> {
    const response = await api.post<any>('/auth/sync-user', {
      firebaseToken,
    });
    return {
      user: response.data.user,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      wallet: response.data.wallet,
    };
  },

  async getProfile(): Promise<User> {
    const response = await api.get<any>('/users/profile');
    return response.data.user;
  },

  async updateProfile(profileData: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    coverUrl?: string;
    bio?: string;
    headline?: string;
    skills?: string[];
  }): Promise<User> {
    const response = await api.put<any>('/users/profile', profileData);
    return response.data.user;
  },

  async uploadAvatar(base64Image: string): Promise<string> {
    const response = await api.post<any>('/users/upload-avatar', {
      base64Image,
    });
    return response.data.avatarUrl;
  },

  async uploadCover(base64Image: string): Promise<string> {
    const response = await api.post<any>('/users/upload-cover', {
      base64Image,
    });
    return response.data.coverUrl;
  },

  async searchUserByPhone(phone: string): Promise<User | null> {
    const response = await api.get<any>('/users/search', {
      params: { phone },
    });
    return response.data.user;
  },

  async tokenLogin(): Promise<{ user: User; wallet: any }> {
    const token = await storage.getToken();
    const response = await cleanApi.post<any>('/auth/token-login', {}, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return {
      user: response.data.user,
      wallet: response.data.wallet,
    };
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken });
  },

  async verifyAccount(frontImage: string, backImage: string, selfieImage: string): Promise<User> {
    const response = await api.post<any>('/users/verify', {
      frontImage,
      backImage,
      selfieImage,
    });
    return response.data.user;
  },

  async sendOtp(phone: string): Promise<{ success: boolean; message: string; otp?: string }> {
    const response = await api.post<any>('/auth/send-otp', { phone });
    return response.data;
  },

  async verifyOtp(phone: string, otp: string): Promise<{ success: boolean; user: User; token: string }> {
    const response = await api.post<any>('/auth/verify-otp', { phone, otp });
    return response.data;
  },

  async verifyEmail(email: string, token: string): Promise<{ success: boolean; user: User; accessToken: string; refreshToken: string; wallet: any; message?: string }> {
    const response = await api.post<any>('/auth/verify-email', { email, token });
    return response.data;
  },

  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string; data?: { debugOtp?: string; warning?: string } }> {
    const response = await api.post<any>('/auth/resend-verification', { email });
    return response.data;
  },
};
