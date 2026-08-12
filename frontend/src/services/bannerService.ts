import api from './api';
import { HomeBanner } from '../types';

let cachedBanners: HomeBanner[] | null = null;
let lastBannerFetchTime = 0;
const BANNER_CACHE_TTL = 5 * 60 * 1000; // 5 mins

export const bannerService = {
  async getHomeBanners(forceRefresh = false): Promise<HomeBanner[]> {
    if (!forceRefresh && cachedBanners && Date.now() - lastBannerFetchTime < BANNER_CACHE_TTL) {
      return cachedBanners;
    }

    try {
      const response = await api.get('/banners/home');
      const raw = response.data?.data || response.data || [];
      if (Array.isArray(raw) && raw.length > 0) {
        const mapped: HomeBanner[] = raw
          .filter((item: any) => Boolean(item && (item.id || item.imageUrl || item.image_url)))
          .map((item: any) => ({
            id: item.id,
            code: item.code || '',
            title: item.title || '',
            subtitle: item.subtitle,
            imageUrl: item.imageUrl || item.image_url,
            category: item.category || (item.category_id ? { id: item.category_id, name: '' } : null),
            action: item.action || {
              type: item.action_type || 'NONE',
              value: item.action_value || null,
            },
            displayOrder: item.displayOrder ?? item.display_order ?? 0,
          }))
          .sort((a, b) => a.displayOrder - b.displayOrder);

        cachedBanners = mapped;
        lastBannerFetchTime = Date.now();
        return mapped;
      }
    } catch (err) {
      console.warn('Failed to load banners from /api/banners/home, using fallback:', err);
    }

    return [];
  },
};
