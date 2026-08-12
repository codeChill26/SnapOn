import api from './api';
import { ApiResponse, PaginatedResponse } from '../types';
import { ActivityItem, ActivitySummary, GetActivitiesParams } from '../types/activity';
import { mapTaskFromApi } from './taskService';

export const activityService = {
  async getActivities(params: GetActivitiesParams): Promise<PaginatedResponse<ActivityItem>> {
    try {
      const response = await api.get('/activities/me', { params });
      const raw = response.data;
      const rawList = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);

      const data: ActivityItem[] = rawList.map((item: any) => ({
        id: item.id || (item.post && item.post.id) || String(Math.random()),
        activityType: item.activity_type || params.view,
        post: mapTaskFromApi(item.post || item),
        participation: item.participation ? {
          id: item.participation.id,
          type: item.participation.type || 'JOB_APPLICATION',
          status: item.participation.status,
          createdAt: item.participation.createdAt || item.participation.created_at,
          updatedAt: item.participation.updatedAt || item.participation.updated_at,
        } : undefined,
        stats: {
          applicantCount: item.stats?.applicantCount || item.applicant_count || 0,
          hireRequestCount: item.stats?.hireRequestCount || item.hire_request_count || 0,
        },
      }));

      return {
        data,
        pagination: raw.pagination || { page: params.page || 1, limit: params.limit || 10, total: data.length, totalPages: 1 },
      };
    } catch {
      return {
        data: [],
        pagination: { page: params.page || 1, limit: params.limit || 10, total: 0, totalPages: 1 },
      };
    }
  },

  async getActivitySummary(): Promise<ActivitySummary | null> {
    try {
      const response = await api.get<ApiResponse<ActivitySummary>>('/activities/me/summary');
      return response.data?.data || null;
    } catch {
      return null;
    }
  },
};
