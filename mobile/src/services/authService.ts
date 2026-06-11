import api from './api';
import { User, ApiResponse } from '../types';

interface AuthResponse {
  user: User;
  token: string;
}

export const authService = {
  async syncUser(firebaseToken: string): Promise<User> {
    const response = await api.post<ApiResponse<User>>('/auth/sync-user', {
      firebaseToken,
    });
    return response.data.data;
  },

  async devLogin(email: string, name?: string, role?: string): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/dev/login', {
      email,
      name,
      role,
    });
    return response.data.data;
  },

  async devRegister(email: string, name: string, password: string, phone?: string, role?: string): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/dev/register', {
      email,
      name,
      password,
      phone,
      role,
    });
    return response.data.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/users/profile');
    return response.data.data;
  },
};
