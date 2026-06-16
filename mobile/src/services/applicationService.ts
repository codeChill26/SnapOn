import api from './api';
import { TaskApplication, ApiResponse } from '../types';

export const mapApplicationFromApi = (data: any): TaskApplication => {
  if (!data) return data;
  return {
    // Ranked applications return `applicationId`; normal ones return `id`
    id: data.id || data.applicationId || data.application_id,
    taskId: data.task_id || data.taskId,
    taskerId: data.tasker_id || data.taskerId,
    bidPrice: data.bid_price !== undefined ? Number(data.bid_price) : Number(data.bidPrice),
    estimatedTime: data.estimated_time || data.estimatedTime,
    message: data.message,
    status: data.status,
    createdAt: data.created_at || data.createdAt,
    taskerName: data.tasker_name || data.taskerName,
    taskerAvatar: data.tasker_avatar || data.taskerAvatar,
    taskerRating: data.average_rating !== undefined ? Number(data.average_rating) : (data.taskerRating !== undefined ? Number(data.taskerRating) : undefined),
    // Support both `score` (top-level from ranked API) and `scores.total`
    score: data.score !== undefined
      ? Number(data.score)
      : (data.scores?.total !== undefined ? Number(data.scores.total) : undefined),
  };
};


export const applicationService = {
  async createApplication(
    taskId: string,
    payload: { bid_price: number; estimated_time: string; message?: string }
  ): Promise<TaskApplication> {
    const response = await api.post<ApiResponse<any>>(
      `/tasks/${taskId}/applications`,
      payload
    );
    return mapApplicationFromApi(response.data.data);
  },

  async getApplicationsByTask(
    taskId: string
  ): Promise<TaskApplication[]> {
    const response = await api.get<ApiResponse<any[]>>(
      `/tasks/${taskId}/applications`
    );
    return (response.data.data || []).map(mapApplicationFromApi);
  },

  async getMyApplications(): Promise<TaskApplication[]> {
    // Returns all applications submitted by the current user (as worker)
    const response = await api.get<ApiResponse<any[]>>(
      '/applications/my-applications'
    );
    return (response.data.data || []).map(mapApplicationFromApi);
  },

  async withdrawApplication(id: string): Promise<TaskApplication> {
    const response = await api.patch<ApiResponse<any>>(
      `/applications/${id}/withdraw`
    );
    return mapApplicationFromApi(response.data.data);
  },

};
