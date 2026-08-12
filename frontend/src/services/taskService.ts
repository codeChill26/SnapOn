import api from './api';
import {
  Task,
  TaskStatus,
  TaskLocation,
  PaginatedResponse,
  PaginationParams,
  ApiResponse,
} from '../types';

export interface TaskFilters extends PaginationParams {
  status?: TaskStatus;
  category_id?: string;
  field_id?: string;
  task_type?: string;
  search?: string;
  post_type?: string;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  category_id: string;
  task_type: string;
  budget_min: number;
  budget_max: number;
  deadline_start?: string;
  deadline_end?: string;
  allow_insurance?: boolean;
  skill_ids?: string[];
  location?: {
    location_type?: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  images?: string[];
  post_type?: string;
  work_mode?: string;
  salary_unit?: string;
  employment_type?: string;
  people_needed?: number | null;
  contact_phone?: string | null;
  start_date?: string | null;
  experience_level?: string;
  education_level?: string;
  gender_requirement?: string;
  min_age?: number | null;
  max_age?: number | null;
  min_height_cm?: number | null;
  max_height_cm?: number | null;
  hashtags?: string[];
  application_deadline?: string | null;
}

export const mapLocationFromApi = (loc: any): TaskLocation => {
  if (!loc) return { address: '', lat: 10.7769, lng: 106.7009 };
  return {
    id: loc.id,
    taskId: loc.task_id || loc.taskId,
    locationType: loc.location_type || loc.locationType,
    address: loc.address || '',
    lat: loc.latitude !== undefined ? Number(loc.latitude) : Number(loc.lat || 10.7769),
    lng: loc.longitude !== undefined ? Number(loc.longitude) : Number(loc.lng || 106.7009),
  };
};

export const mapTaskFromApi = (data: any): Task => {
  if (!data) return data;
  return {
    id: data.id,
    posterId: data.poster_id || data.posterId,
    categoryId: data.category_id || data.categoryId,
    title: data.title || '',
    description: data.description || '',
    taskType: data.task_type || data.taskType || 'ONLINE',
    status: data.status || 'OPEN',
    budgetMin: data.budget_min !== undefined ? Number(data.budget_min) : Number(data.budgetMin || 0),
    budgetMax: data.budget_max !== undefined ? Number(data.budget_max) : Number(data.budgetMax || 0),
    finalPrice: data.final_price !== undefined ? Number(data.final_price) : (data.finalPrice ? Number(data.finalPrice) : undefined),
    deadlineStart: data.deadline_start || data.deadlineStart,
    deadlineEnd: data.deadline_end || data.deadlineEnd,
    allowInsurance: data.allow_insurance !== undefined ? Boolean(data.allow_insurance) : Boolean(data.allowInsurance),
    createdAt: data.created_at || data.createdAt || new Date().toISOString(),
    applicationDeadline: data.application_deadline || data.applicationDeadline,
    closedAt: data.closed_at || data.closedAt,
    closedById: data.closed_by_id || data.closedById,
    closedReason: data.closed_reason || data.closedReason,
    posterName: data.poster_name || data.posterName || data.poster?.fullName || data.poster?.full_name || 'Người dùng',
    categoryName: data.category_name || data.categoryName || data.category?.name,
    field: (() => {
      if (!data.field && !data.category) return undefined;
      const raw = data.field || data.category;
      const f = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return {
        id: f.id || '',
        name: f.name || '',
        slug: f.slug || '',
        icon: f.icon || '',
        color: f.color || '',
      };
    })(),
    subcategory: (() => {
      if (!data.subcategory) return undefined;
      const sub = typeof data.subcategory === 'string' ? JSON.parse(data.subcategory) : data.subcategory;
      return {
        id: sub.id || '',
        categoryId: sub.category_id || sub.categoryId || '',
        name: sub.name || '',
        slug: sub.slug || '',
      };
    })(),
    skills: (() => {
      const rawSkills = data.required_skills || data.skills;
      if (!rawSkills) return undefined;
      const parsed = typeof rawSkills === 'string' ? JSON.parse(rawSkills) : rawSkills;
      return Array.isArray(parsed) ? parsed.map((s: any) => ({
        id: s.id || '',
        categoryId: s.category_id || s.categoryId || '',
        name: s.name || '',
        slug: s.slug || '',
      })) : undefined;
    })(),
    locations: data.locations ? data.locations.map(mapLocationFromApi) : (data.location ? [mapLocationFromApi(data.location)] : undefined),
    poster: data.poster ? {
      id: data.poster.id || data.poster_id,
      fullName: data.poster.fullName || data.poster.full_name || data.poster_name || 'Người dùng',
      avatarUrl: data.poster.avatarUrl || data.poster.avatar_url || data.poster_avatar,
      email: data.poster.email || '',
      phone: data.poster.phone || '',
      role: data.poster.role || 'USER',
      status: data.poster.status || 'ACTIVE',
      isVerified: Boolean(data.poster.isVerified || data.poster.is_verified),
      createdAt: data.poster.createdAt || data.poster.created_at || new Date().toISOString(),
    } : (data.poster_name ? {
      id: data.poster_id || '',
      fullName: data.poster_name,
      avatarUrl: data.poster_avatar,
      email: '',
      role: 'USER',
      status: 'ACTIVE',
      isVerified: false,
      createdAt: new Date().toISOString(),
    } : undefined),
    images: Array.isArray(data.images) ? data.images : [],
    postType: data.post_type || data.postType || 'RECRUITMENT',
    workMode: data.work_mode || data.workMode || 'ONSITE',
    salaryUnit: data.salary_unit || data.salaryUnit || 'PER_JOB',
    employmentType: data.employment_type || data.employmentType || 'ONE_TIME',
    peopleNeeded: data.people_needed !== undefined ? data.people_needed : data.peopleNeeded,
    contactPhone: data.contact_phone !== undefined ? data.contact_phone : data.contactPhone,
    startDate: data.start_date || data.startDate,
    experienceLevel: data.experience_level || data.experienceLevel,
    educationLevel: data.education_level || data.educationLevel,
    genderRequirement: data.gender_requirement || data.genderRequirement,
    minAge: data.min_age !== undefined ? data.min_age : data.minAge,
    maxAge: data.max_age !== undefined ? data.max_age : data.maxAge,
    minHeightCm: data.min_height_cm !== undefined ? data.min_height_cm : data.minHeightCm,
    maxHeightCm: data.max_height_cm !== undefined ? data.max_height_cm : data.maxHeightCm,
    hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
    assignedWorker: data.assigned_worker ? {
      id: data.assigned_worker.id || data.assigned_worker.tasker_id || data.assigned_worker.workerId,
      name: data.assigned_worker.name || data.assigned_worker.tasker_name || data.assigned_worker.fullName || 'Thợ',
      avatarUrl: data.assigned_worker.avatar_url || data.assigned_worker.avatarUrl || data.assigned_worker.avatar,
      phone: data.assigned_worker.phone,
      assignmentId: data.assigned_worker.assignment_id || data.assigned_worker.assignmentId,
      status: data.assigned_worker.status || 'ACTIVE',
      assignedAt: data.assigned_worker.assigned_at || data.assigned_worker.assignedAt,
      bidPrice: data.assigned_worker.bid_price !== undefined ? Number(data.assigned_worker.bid_price) : undefined,
      estimatedTime: data.assigned_worker.estimated_time,
      message: data.assigned_worker.message,
    } : null,
    isSaved: Boolean(data.is_saved ?? data.isSaved),
    savedAt: data.saved_at || data.savedAt,
  };
};

export const taskService = {
  async getTasks(filters: TaskFilters = {}): Promise<PaginatedResponse<Task>> {
    const params: Record<string, any> = {
      page: filters.page || 1,
      limit: filters.limit || 12,
    };
    if (filters.status) params.status = filters.status;
    if (filters.category_id) params.category_id = filters.category_id;
    if (filters.field_id) params.field_id = filters.field_id;
    if (filters.task_type) params.task_type = filters.task_type;
    if (filters.search) params.search = filters.search;
    if (filters.post_type) params.post_type = filters.post_type;

    const response = await api.get('/tasks', { params });
    const raw = response.data;
    const taskList = Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
    return {
      data: taskList.map(mapTaskFromApi),
      pagination: raw.pagination || { page: 1, limit: filters.limit || 12, total: taskList.length, totalPages: Math.ceil(taskList.length / (filters.limit || 12)) || 1 },
    };
  },

  async getMyTasks(params: PaginationParams = {}): Promise<PaginatedResponse<Task>> {
    const response = await api.get('/tasks/my-tasks', {
      params: { page: params.page || 1, limit: params.limit || 12 },
    });
    const raw = response.data;
    const taskList = Array.isArray(raw.data) ? raw.data : [];
    return {
      data: taskList.map(mapTaskFromApi),
      pagination: raw.pagination || { page: 1, limit: params.limit || 12, total: taskList.length, totalPages: 1 },
    };
  },

  async getSavedTasks(params: PaginationParams = {}): Promise<PaginatedResponse<Task>> {
    const response = await api.get('/tasks/saved', {
      params: { page: params.page || 1, limit: params.limit || 20 },
    });
    const raw = response.data;
    const taskList = Array.isArray(raw.data) ? raw.data : [];
    return {
      data: taskList.map(mapTaskFromApi),
      pagination: raw.pagination || { page: 1, limit: 20, total: taskList.length, totalPages: 1 },
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

  async updateTask(id: string, payload: Partial<CreateTaskPayload>): Promise<Task> {
    const response = await api.patch<ApiResponse<any>>(`/tasks/${id}`, payload);
    return mapTaskFromApi(response.data.data);
  },

  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    const response = await api.patch<ApiResponse<any>>(`/tasks/${id}/status`, { status });
    return mapTaskFromApi(response.data.data);
  },

  async deleteTask(id: string): Promise<Task> {
    const response = await api.delete<ApiResponse<any>>(`/tasks/${id}`);
    return mapTaskFromApi(response.data.data);
  },

  async closeRecruitment(id: string): Promise<Task> {
    const response = await api.patch<ApiResponse<any>>(`/tasks/${id}/close-recruitment`);
    return mapTaskFromApi(response.data.data);
  },

  async saveTask(id: string): Promise<void> {
    await api.post(`/tasks/${id}/save`);
  },

  async unsaveTask(id: string): Promise<void> {
    await api.delete(`/tasks/${id}/save`);
  },

  async uploadTaskImages(base64Images: string[]): Promise<string[]> {
    const response = await api.post<ApiResponse<{ urls: string[] }>>('/tasks/upload-images', {
      images: base64Images,
    });
    return response.data.data?.urls || [];
  },
};
