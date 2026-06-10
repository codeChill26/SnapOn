import api from './api';
import { TaskApplication, ApiResponse, PaginatedResponse } from '../types';

export const applicationService = {
  async createApplication(
    taskId: string,
    payload: { bid_price: number; estimated_time: string; message?: string }
  ): Promise<TaskApplication> {
    const response = await api.post<ApiResponse<TaskApplication>>(
      `/tasks/${taskId}/applications`,
      payload
    );
    return response.data.data;
  },

  async getApplicationsByTask(
    taskId: string
  ): Promise<TaskApplication[]> {
    const response = await api.get<ApiResponse<TaskApplication[]>>(
      `/tasks/${taskId}/applications`
    );
    return response.data.data;
  },

  async withdrawApplication(id: string): Promise<TaskApplication> {
    const response = await api.patch<ApiResponse<TaskApplication>>(
      `/applications/${id}/withdraw`
    );
    return response.data.data;
  },
};
