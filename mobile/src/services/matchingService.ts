import api from './api';
import { TaskApplication, ApiResponse } from '../types';

export const matchingService = {
  async getRankedApplications(taskId: string): Promise<TaskApplication[]> {
    const response = await api.get<ApiResponse<TaskApplication[]>>(
      `/tasks/${taskId}/ranked-applications`
    );
    return response.data.data;
  },

  async autoMatch(taskId: string): Promise<{ task: any; assignedTask: any }> {
    const response = await api.post<ApiResponse<{ task: any; assignedTask: any }>>(
      `/tasks/${taskId}/auto-match`
    );
    return response.data.data;
  },

  async manualMatch(
    taskId: string,
    applicationId: string
  ): Promise<{ task: any; assignedTask: any }> {
    const response = await api.post<ApiResponse<{ task: any; assignedTask: any }>>(
      `/tasks/${taskId}/manual-match`,
      { application_id: applicationId }
    );
    return response.data.data;
  },
};
