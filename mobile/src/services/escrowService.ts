import api from './api';
import { Escrow, ApiResponse } from '../types';

export const escrowService = {
  async getMyEscrows(params?: {
    role?: string;
    status?: string;
    cursor?: string;
  }): Promise<{ escrows: Escrow[]; nextCursor?: string }> {
    const response = await api.get<ApiResponse<{ escrows: Escrow[]; nextCursor?: string }>>(
      '/escrows/me',
      { params }
    );
    return response.data.data;
  },

  async getEscrowByTaskId(taskId: string): Promise<Escrow> {
    const response = await api.get<ApiResponse<Escrow>>(`/escrows/${taskId}`);
    return response.data.data;
  },
};
