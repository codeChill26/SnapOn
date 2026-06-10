import api from './api';
import { Wallet, WalletTransaction, ApiResponse } from '../types';

export const walletService = {
  async getMyWallet(): Promise<Wallet> {
    const response = await api.get<ApiResponse<Wallet>>('/wallet/me');
    return response.data.data;
  },

  async getTransactions(cursor?: string): Promise<{
    transactions: WalletTransaction[];
    nextCursor?: string;
  }> {
    const params: Record<string, string> = {};
    if (cursor) params.cursor = cursor;
    const response = await api.get<ApiResponse<{
      transactions: WalletTransaction[];
      nextCursor?: string;
    }>>('/wallet/transactions', { params });
    return response.data.data;
  },

  async topupMock(amount: number): Promise<Wallet> {
    const response = await api.post<ApiResponse<Wallet>>('/wallet/topup/mock', { amount });
    return response.data.data;
  },
};
