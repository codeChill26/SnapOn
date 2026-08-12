import api from './api';
import { PublicProfile, ProfileReview, Task, PaginatedResponse } from '../types';
import { mapTaskFromApi } from './taskService';

export const profileService = {
  async getPublicProfile(userId: string): Promise<PublicProfile> {
    const response = await api.get(`/users/${userId}/profile`);
    const raw = response.data?.data || response.data;
    const userObj = raw.user || raw;
    const stats = raw.publicStats || raw.stats || {};

    return {
      id: userObj.id || userId,
      fullName: userObj.fullName || userObj.full_name || 'Người dùng',
      avatarUrl: userObj.avatarUrl || userObj.avatar_url,
      coverUrl: userObj.coverUrl || userObj.cover_url,
      bio: userObj.bio || '',
      headline: userObj.headline || '',
      skills: Array.isArray(userObj.skills) ? userObj.skills : [],
      isVerified: Boolean(userObj.isVerified || userObj.is_verified),
      isIdVerified: Boolean(userObj.isIdVerified || userObj.is_id_verified),
      joinedAt: userObj.createdAt || userObj.created_at || userObj.joinedAt || new Date().toISOString(),
      ratingAverage: Number(userObj.ratingAverage || userObj.average_rating || 5.0),
      reviewCount: Number(userObj.reviewCount || stats.reviewsCount || 0),
      completedJobsCount: Number(userObj.completedJobsCount || stats.completed || 0),
      postedJobsCount: Number(userObj.postedJobsCount || stats.posted || 0),
      serviceOffersCount: Number(userObj.serviceOffersCount || stats.services || 0),
      activePostsCount: Number(userObj.activePostsCount || 0),
      publicStats: stats,
    };
  },

  async getPublicPosts(
    userId: string,
    type: 'RECRUITMENT' | 'SERVICE_OFFER' = 'RECRUITMENT',
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<Task>> {
    const response = await api.get(`/users/${userId}/profile/posts`, {
      params: { type, page, limit },
    });
    const raw = response.data;
    const items = Array.isArray(raw.data) ? raw.data : [];
    return {
      data: items.map(mapTaskFromApi),
      pagination: raw.pagination || { page, limit, total: items.length, totalPages: 1 },
    };
  },

  async getPublicReviews(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<ProfileReview>> {
    const response = await api.get(`/users/${userId}/profile/reviews`, {
      params: { page, limit },
    });
    const raw = response.data;
    const items = Array.isArray(raw.data) ? raw.data : [];
    const mapped: ProfileReview[] = items.map((r: any) => ({
      id: r.id,
      rating: Number(r.rating || 5),
      comment: r.comment || '',
      createdAt: r.created_at || r.createdAt || new Date().toISOString(),
      reviewerName: r.reviewer?.fullName || r.reviewer?.full_name || r.reviewer_name || 'Người dùng',
      reviewerAvatar: r.reviewer?.avatarUrl || r.reviewer?.avatar_url || r.reviewer_avatar,
      taskName: r.task?.title || r.task_title,
    }));
    return {
      data: mapped,
      pagination: raw.pagination || { page, limit, total: mapped.length, totalPages: 1 },
    };
  },
};
