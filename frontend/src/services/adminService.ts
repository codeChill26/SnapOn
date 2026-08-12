import api from './api';
import { WalletTransaction } from '../types';
import { mapTransaction } from './walletService';

export interface AdminStats {
  users: {
    total: number;
    newThisMonth: number;
    newThisWeek: number;
    verified: number;
  };
  tasks: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    recruitment: number;
    serviceOffer: number;
    newThisMonth: number;
    newThisWeek: number;
  };
  applications: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    withdrawn: number;
  };
  assignments: {
    total: number;
    completed: number;
    cancelled: number;
    inProgress: number;
    assigned: number;
  };
  escrow: {
    totalVolume: number;
    releasedVolume: number;
    holdingVolume: number;
    refundedVolume: number;
  };
  wallet: {
    totalBalance: number;
    walletCount: number;
  };
  tasksByCategory: { name: string; slug: string; count: number }[];
  tasksByDay: { date: string; count: number; completed: number }[];
  topUsers: {
    id: string;
    name: string;
    avatarUrl: string;
    email: string;
    joinedAt: string;
    postCount: number;
    completedCount: number;
  }[];
}

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const response = await api.get('/admin/stats');
    return response.data.data;
  },

  async getWithdrawals(status?: string): Promise<WalletTransaction[]> {
    const params = status && status !== 'all' ? { status } : {};
    const response = await api.get('/admin/withdrawals', { params });
    const raw = response.data?.data || response.data || [];
    return (Array.isArray(raw) ? raw : []).map(mapTransaction);
  },

  async approveWithdrawal(id: string): Promise<any> {
    const response = await api.patch(`/admin/withdrawals/${id}/approve`);
    return response.data;
  },

  async rejectWithdrawal(id: string): Promise<any> {
    const response = await api.patch(`/admin/withdrawals/${id}/reject`);
    return response.data;
  },

  async getBanners(): Promise<any[]> {
    const response = await api.get('/admin/banners');
    return response.data?.data || response.data || [];
  },

  async createBanner(payload: any): Promise<any> {
    const response = await api.post('/admin/banners', payload);
    return response.data;
  },

  async updateBanner(id: string, payload: any): Promise<any> {
    const response = await api.put(`/admin/banners/${id}`, payload);
    return response.data;
  },

  async toggleBannerStatus(id: string, is_active: boolean): Promise<any> {
    const response = await api.patch(`/admin/banners/${id}/status`, { is_active });
    return response.data;
  },

  async deleteBanner(id: string): Promise<any> {
    const response = await api.delete(`/admin/banners/${id}`);
    return response.data;
  },
};
