import api from './api';
import { HomeBanner } from '../types';

export const bannerService = {
  getHomeBanners: async (): Promise<HomeBanner[]> => {
    try {
      const response = await api.get('/banners/home');
      
      // The backend returns a response wrapped in { success: true, message: '...', data: [...] }
      const banners = response.data?.data ?? response.data ?? [];

      if (!Array.isArray(banners)) {
        return [];
      }

      return banners
        .filter((item: any): item is HomeBanner => {
          return Boolean(
            item &&
            item.id &&
            item.imageUrl
          );
        })
        .sort((a, b) => a.displayOrder - b.displayOrder);
    } catch (error) {
      console.error('Failed to fetch home banners in bannerService:', error);
      return [];
    }
  },
};
