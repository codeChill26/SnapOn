import api from './api';
import { TaskApplication, ApiResponse } from '../types';

export const mapApplicationFromApi = (data: any): TaskApplication => {
  if (!data) return data;
  return {
    id: data.id || data.applicationId || data.application_id,
    taskId: data.task_id || data.taskId,
    taskerId: data.tasker_id || data.taskerId,
    bidPrice: data.bid_price !== undefined ? Number(data.bid_price) : Number(data.bidPrice || 0),
    estimatedTime: data.estimated_time || data.estimatedTime,
    message: data.message || '',
    status: data.status || 'PENDING',
    createdAt: data.created_at || data.createdAt || new Date().toISOString(),
    taskerName: data.tasker_name || data.taskerName || data.full_name || data.fullName || 'Người làm',
    taskerAvatar: data.tasker_avatar || data.taskerAvatar || data.avatar_url || data.avatarUrl,
    taskerRating: data.average_rating !== undefined ? Number(data.average_rating) : (data.taskerRating !== undefined ? Number(data.taskerRating) : 5.0),
    completedJobs: data.completed_jobs !== undefined ? Number(data.completed_jobs) : 0,
    score: data.score !== undefined
      ? Number(data.score)
      : (data.scores?.total !== undefined ? Number(data.scores.total) : undefined),
    taskTitle: data.task_title || data.taskTitle,
    taskStatus: data.task_status || data.taskStatus,
    taskPostType: data.task_post_type || data.taskPostType,
    taskSalaryUnit: data.task_salary_unit || data.taskSalaryUnit,
    assignmentId: data.assignment_id || data.assignmentId,
    assignmentStatus: data.assignment_status || data.assignmentStatus,
  };
};

export const applicationService = {
  async createApplication(
    taskId: string,
    payload: { bid_price?: number; estimated_time?: string | null; message?: string | null }
  ): Promise<TaskApplication> {
    const response = await api.post<ApiResponse<any>>(
      `/tasks/${taskId}/applications`,
      payload
    );
    return mapApplicationFromApi(response.data.data);
  },

  async getApplicationsByTask(taskId: string): Promise<TaskApplication[]> {
    try {
      const response = await api.get<ApiResponse<any[]>>(
        `/tasks/${taskId}/applications`
      );
      return (response.data.data || []).map(mapApplicationFromApi);
    } catch {
      return [];
    }
  },

  async getMyApplications(): Promise<TaskApplication[]> {
    const response = await api.get<ApiResponse<any[]>>(
      '/applications/my-applications'
    );
    return (response.data.data || []).map(mapApplicationFromApi);
  },

  async getMyApplicationForTask(taskId: string): Promise<TaskApplication | null> {
    try {
      const myApps = await this.getMyApplications();
      const found = myApps.find(a => String(a.taskId) === String(taskId));
      return found || null;
    } catch {
      return null;
    }
  },

  async withdrawApplication(id: string): Promise<TaskApplication> {
    const response = await api.patch<ApiResponse<any>>(
      `/applications/${id}/withdraw`
    );
    return mapApplicationFromApi(response.data.data);
  },

  async updateApplicationStatus(
    id: string,
    status: 'ACCEPTED' | 'REJECTED'
  ): Promise<TaskApplication> {
    const response = await api.patch<ApiResponse<any>>(
      `/applications/${id}/status`,
      { status }
    );
    return mapApplicationFromApi(response.data.data);
  },

  async manualMatch(taskId: string, applicationId: string): Promise<any> {
    const response = await api.post(`/tasks/${taskId}/manual-match`, { application_id: applicationId });
    return response.data;
  },

  async autoMatch(taskId: string): Promise<any> {
    const response = await api.post(`/tasks/${taskId}/auto-match`);
    return response.data;
  },

  async acceptAssignment(id: string): Promise<void> {
    await api.patch(`/assignments/${id}/accept`);
  },

  async declineAssignment(id: string): Promise<void> {
    await api.patch(`/assignments/${id}/decline`);
  },

  async completeAssignment(id: string): Promise<void> {
    await api.patch(`/assignments/${id}/complete`);
  },

  async cancelAssignment(id: string): Promise<void> {
    await api.patch(`/assignments/${id}/cancel`);
  },
};
