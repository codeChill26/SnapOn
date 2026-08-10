import api from './api';
import {
  PublicProfile,
  ProfileReview,
  Task,
  ApiResponse,
  PaginatedResponse
} from '../types';

export interface ProfilePostsResponse {
  success: boolean;
  data: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProfileReviewsResponse {
  success: boolean;
  data: ProfileReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const profileCache = new Map<string, { data: ApiResponse<PublicProfile>; timestamp: number }>();

export const profileService = {
  async getPublicProfile(userId: string): Promise<ApiResponse<PublicProfile>> {
    const cached = profileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < 10000) {
      return cached.data;
    }
    const response = await api.get<ApiResponse<PublicProfile>>(`/users/${userId}/profile`);
    profileCache.set(userId, { data: response.data, timestamp: Date.now() });
    return response.data;
  },

  prefetchPublicProfile(userId: string): void {
    if (profileCache.size > 50) {
      profileCache.clear();
    }
    void this.getPublicProfile(userId).catch(() => {});
  },

  async getPublicPosts(
    userId: string,
    type: 'RECRUITMENT' | 'SERVICE_OFFER',
    page = 1,
    limit = 10
  ): Promise<ProfilePostsResponse> {
    const response = await api.get<ProfilePostsResponse>(`/users/${userId}/profile/posts`, {
      params: { type, page, limit }
    });
    return response.data;
  },

  async getPublicReviews(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<ProfileReviewsResponse> {
    const response = await api.get<ProfileReviewsResponse>(`/users/${userId}/profile/reviews`, {
      params: { page, limit }
    });
    return response.data;
  }
};
