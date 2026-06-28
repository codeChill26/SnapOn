import api from './api';
import { ApiResponse, PaginatedResponse } from '../types';
import { ActivityItem, ActivitySummary } from '../types/activity';
import { mapTaskFromApi } from './taskService';

interface GetActivitiesParams {
  view: 'POSTED' | 'PARTICIPATING';
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const activityService = {
  async getActivities(params: GetActivitiesParams): Promise<PaginatedResponse<ActivityItem>> {
    const response = await api.get<any>('/activities/me', { params });
    const data = (response.data.data || []).map((item: any) => ({
      id: item.id,
      activityType: item.activity_type,
      post: mapTaskFromApi(item.post),
      participation: item.participation ? {
        id: item.participation.id,
        type: item.participation.type,
        status: item.participation.status,
        createdAt: item.participation.createdAt,
        updatedAt: item.participation.updatedAt,
      } : undefined,
      stats: {
        applicantCount: item.stats?.applicantCount || 0,
        hireRequestCount: item.stats?.hireRequestCount || 0,
      },
    }));

    return {
      data,
      pagination: response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  },

  async getActivitySummary(): Promise<ActivitySummary> {
    const response = await api.get<ApiResponse<ActivitySummary>>('/activities/me/summary');
    return response.data.data;
  },
};
