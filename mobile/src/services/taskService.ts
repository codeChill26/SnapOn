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
  field_id?: string;
  task_type?: string;
  search?: string;
  post_type?: string;
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

export const mapTaskFromApi = (data: any): Task => {
  if (!data) return data;
  return {
    id: data.id,
    posterId: data.poster_id || data.posterId,
    categoryId: data.category_id || data.categoryId,
    title: data.title,
    description: data.description,
    taskType: data.task_type || data.taskType || 'ONLINE',
    status: data.status || 'OPEN',
    budgetMin: data.budget_min !== undefined ? Number(data.budget_min) : Number(data.budgetMin || 0),
    budgetMax: data.budget_max !== undefined ? Number(data.budget_max) : Number(data.budgetMax || 0),
    finalPrice: data.final_price !== undefined ? Number(data.final_price) : (data.finalPrice !== undefined ? Number(data.finalPrice) : undefined),
    deadlineStart: data.deadline_start || data.deadlineStart || undefined,
    deadlineEnd: data.deadline_end || data.deadlineEnd || undefined,
    allowInsurance: data.allow_insurance !== undefined ? data.allow_insurance : (data.allowInsurance ?? false),
    createdAt: data.created_at || data.createdAt || new Date().toISOString(),
    applicationDeadline: data.application_deadline || data.applicationDeadline || null,
    closedAt: data.closed_at || data.closedAt || null,
    closedById: data.closed_by_id || data.closedById || null,
    closedReason: data.closed_reason || data.closedReason || null,
    posterName: data.poster_name || data.posterName || (data.poster?.fullName) || 'Người dùng',
    categoryName: data.category_name || data.categoryName || '',
    field: (() => {
      if (!data.field) return undefined;
      const f = typeof data.field === 'string' ? JSON.parse(data.field) : data.field;
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
    locations: data.locations ? data.locations.map(mapLocationFromApi) : undefined,
    poster: data.poster_name || data.poster ? {
      id: data.poster_id || data.posterId || (data.poster && data.poster.id),
      fullName: data.poster_name || (data.poster && data.poster.fullName) || 'User',
      avatarUrl: data.poster_avatar || (data.poster && data.poster.avatarUrl),
    } as any : undefined,
    images: data.images || [],
    postType: data.post_type || data.postType || 'RECRUITMENT',
    workMode: data.work_mode || data.workMode || 'REMOTE',
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
    hashtags: data.hashtags || [],
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
    isSaved: Boolean(data.is_saved ?? data.isSaved),
    savedAt: data.saved_at || data.savedAt,
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

const taskDetailCache = new Map<string, { data: Task; timestamp: number }>();

let savedTasksCache: { data: PaginatedResponse<Task>; timestamp: number } | null = null;
const SAVED_CACHE_TTL = 10000; // 10 seconds

export const taskService = {
  invalidateSavedTasksCache(): void {
    savedTasksCache = null;
  },

  async getTasks(filters: TaskFilters = {}): Promise<PaginatedResponse<Task>> {
    const params: Record<string, any> = {
      page: filters.page || 1,
      limit: filters.limit || 10,
    };
    if (filters.status) params.status = filters.status;
    if (filters.category_id) params.category_id = filters.category_id;
    if (filters.field_id) params.field_id = filters.field_id;
    if (filters.task_type) params.task_type = filters.task_type;
    if (filters.search) params.search = filters.search;
    if (filters.post_type) params.post_type = filters.post_type;

    const response = await api.get<any>('/tasks', { params });

    if (__DEV__) {
      const total = response.data?.pagination?.total ?? (response.data?.data?.length || 0);
      const first = response.data?.data?.[0];
      console.log('========== JOB API DEBUG ==========');
      console.log('REQUEST URL: /tasks');
      console.log('QUERY PARAMS:', JSON.stringify(params));
      console.log('RESPONSE STATUS:', response.status);
      console.log('TOTAL JOBS:', total);
      console.log('FIRST JOB:', first ? {
        id: first.id,
        title: first.title,
        post_type: first.post_type,
        category_name: first.category_name,
        category_id: first.category_id,
        status: first.status,
      } : 'No jobs found');
      console.log('===================================');
    }

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

  async getSavedTasks(params: PaginationParams = {}, forceRefresh = false): Promise<PaginatedResponse<Task>> {
    const isDefaultRequest = (!params.page || params.page === 1) && (!params.limit || params.limit === 20);
    if (!forceRefresh && isDefaultRequest && savedTasksCache && Date.now() - savedTasksCache.timestamp < SAVED_CACHE_TTL) {
      return savedTasksCache.data;
    }
    const response = await api.get<any>('/tasks/saved', {
      params: { page: params.page || 1, limit: params.limit || 20 },
    });
    const result = {
      data: (response.data.data || []).map(mapTaskFromApi),
      pagination: response.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
    if (isDefaultRequest) {
      savedTasksCache = { data: result, timestamp: Date.now() };
    }
    return result;
  },

  async getTaskById(id: string): Promise<Task> {
    const cached = taskDetailCache.get(id);
    if (cached && Date.now() - cached.timestamp < 10000) {
      return cached.data;
    }
    const response = await api.get<ApiResponse<any>>(`/tasks/${id}`);
    const task = mapTaskFromApi(response.data.data);
    taskDetailCache.set(id, { data: task, timestamp: Date.now() });
    return task;
  },

  prefetchTaskDetail(id: string): void {
    if (taskDetailCache.size > 50) {
      taskDetailCache.clear();
    }
    void this.getTaskById(id).catch(() => {});
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
    await api.post<ApiResponse<{ taskId: string; isSaved: boolean }>>(`/tasks/${id}/save`);
    this.invalidateSavedTasksCache();
  },

  async unsaveTask(id: string): Promise<void> {
    await api.delete<ApiResponse<{ taskId: string; isSaved: boolean }>>(`/tasks/${id}/save`);
    this.invalidateSavedTasksCache();
  },

  async uploadTaskImages(base64Images: string[]): Promise<string[]> {
    const response = await api.post<ApiResponse<{ urls: string[] }>>('/tasks/upload-images', {
      images: base64Images,
    });
    return response.data.data.urls;
  },
};
