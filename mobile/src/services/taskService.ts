import api from './api';
import {
  Task,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  TaskStatus,
  TaskLocation,
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
    latitude: number;
    longitude: number;
  };
  images?: string[];
}

export const mapTaskFromApi = (data: any): Task => {
  if (!data) return data;
  return {
    id: data.id,
    posterId: data.poster_id || data.posterId,
    categoryId: data.category_id || data.categoryId,
    title: data.title,
    description: data.description,
    taskType: data.task_type || data.taskType,
    status: data.status,
    budgetMin: data.budget_min !== undefined ? Number(data.budget_min) : Number(data.budgetMin),
    budgetMax: data.budget_max !== undefined ? Number(data.budget_max) : Number(data.budgetMax),
    finalPrice: data.final_price !== undefined ? Number(data.final_price) : (data.finalPrice ? Number(data.finalPrice) : undefined),
    deadlineStart: data.deadline_start || data.deadlineStart,
    deadlineEnd: data.deadline_end || data.deadlineEnd,
    allowInsurance: data.allow_insurance !== undefined ? data.allow_insurance : data.allowInsurance,
    createdAt: data.created_at || data.createdAt,
    posterName: data.poster_name || data.posterName,
    categoryName: data.category_name || data.categoryName,
    skills: data.required_skills || data.skills,
    locations: data.locations ? data.locations.map(mapLocationFromApi) : undefined,
    poster: data.poster_name || data.poster ? {
      id: data.poster_id || data.posterId || (data.poster && data.poster.id),
      fullName: data.poster_name || (data.poster && data.poster.fullName) || 'User',
      avatarUrl: data.poster_avatar || (data.poster && data.poster.avatarUrl),
    } as any : undefined,
    images: data.images || [],
    assignedWorker: data.assigned_worker ? {
      id: data.assigned_worker.id,
      name: data.assigned_worker.name,
      avatarUrl: data.assigned_worker.avatar_url,
      phone: data.assigned_worker.phone,
      assignmentId: data.assigned_worker.assignment_id,
      status: data.assigned_worker.status,
      assignedAt: data.assigned_worker.assigned_at,
      bidPrice: data.assigned_worker.bid_price !== undefined ? Number(data.assigned_worker.bid_price) : undefined,
      estimatedTime: data.assigned_worker.estimated_time,
      message: data.assigned_worker.message,
    } : null,
  };
};

const mapLocationFromApi = (loc: any): TaskLocation => {
  if (!loc) return loc;
  return {
    id: loc.id,
    taskId: loc.task_id || loc.taskId,
    locationType: loc.location_type || loc.locationType,
    address: loc.address,
    lat: loc.latitude !== undefined ? Number(loc.latitude) : Number(loc.lat),
    lng: loc.longitude !== undefined ? Number(loc.longitude) : Number(loc.lng),
  };
};

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

    const response = await api.get<any>('/tasks', { params });
    return {
      data: (response.data.data || []).map(mapTaskFromApi),
      pagination: response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  },

  async getMyTasks(params: PaginationParams = {}): Promise<PaginatedResponse<Task>> {
    const response = await api.get<any>('/tasks/my-tasks', {
      params: { page: params.page || 1, limit: params.limit || 10 },
    });
    return {
      data: (response.data.data || []).map(mapTaskFromApi),
      pagination: response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  },

  async getTaskById(id: string): Promise<Task> {
    const response = await api.get<ApiResponse<any>>(`/tasks/${id}`);
    return mapTaskFromApi(response.data.data);
  },

  async createTask(payload: CreateTaskPayload): Promise<Task> {
    const response = await api.post<ApiResponse<any>>('/tasks', payload);
    return mapTaskFromApi(response.data.data);
  },

  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    const response = await api.patch<ApiResponse<any>>(`/tasks/${id}/status`, { status });
    return mapTaskFromApi(response.data.data);
  },

  async uploadTaskImages(base64Images: string[]): Promise<string[]> {
    const response = await api.post<ApiResponse<{ urls: string[] }>>('/tasks/upload-images', {
      images: base64Images,
    });
    return response.data.data.urls;
  },
};
