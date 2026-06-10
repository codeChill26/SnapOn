import api from './api';
import {
  Task,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  TaskStatus,
} from '../types';

interface TaskFilters extends PaginationParams {
  status?: TaskStatus;
  category_id?: string;
  task_type?: string;
  search?: string;
}

interface CreateTaskPayload {
  title: string;
  description: string;
  category_id: string;
  task_type: string;
  budget_min: number;
  budget_max: number;
  deadline_start: string;
  deadline_end: string;
  allow_insurance?: boolean;
  skill_ids?: string[];
  location?: {
    location_type: string;
    address: string;
    lat: number;
    lng: number;
  };
}

export const taskService = {
  async getTasks(filters: TaskFilters = {}): Promise<PaginatedResponse<Task>> {
    const params: Record<string, any> = {
      page: filters.page || 1,
      limit: filters.limit || 10,
    };
    if (filters.status) params.status = filters.status;
    if (filters.category_id) params.category_id = filters.category_id;
    if (filters.task_type) params.task_type = filters.task_type;
    if (filters.search) params.search = filters.search;

    const response = await api.get<ApiResponse<PaginatedResponse<Task>>>('/tasks', { params });
    return response.data.data;
  },

  async getMyTasks(params: PaginationParams = {}): Promise<PaginatedResponse<Task>> {
    const response = await api.get<ApiResponse<PaginatedResponse<Task>>>('/tasks/my-tasks', {
      params: { page: params.page || 1, limit: params.limit || 10 },
    });
    return response.data.data;
  },

  async getTaskById(id: string): Promise<Task> {
    const response = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
    return response.data.data;
  },

  async createTask(payload: CreateTaskPayload): Promise<Task> {
    const response = await api.post<ApiResponse<Task>>('/tasks', payload);
    return response.data.data;
  },

  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    const response = await api.patch<ApiResponse<Task>>(`/tasks/${id}/status`, { status });
    return response.data.data;
  },
};
