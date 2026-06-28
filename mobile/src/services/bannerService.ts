import api from './api';
import { HomeBanner } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BANNERS_CACHE_KEY = '@snapon/cache_banners';
const BANNERS_CACHE_TTL = 1 * 60 * 60 * 1000; // 1 giờ (ms)

export const bannerService = {
  getHomeBanners: async (onUpdate?: (banners: HomeBanner[]) => void): Promise<HomeBanner[]> => {
    let cached: string | null = null;
    try {
      // 1. Thử lấy từ cache local trước
      cached = await AsyncStorage.getItem(BANNERS_CACHE_KEY);
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        if (Array.isArray(data)) {
          // Trả cache cũ ngay lập tức qua callback để hiển thị tức thì
          onUpdate?.(data);
          // Nếu cache vẫn còn hạn, kết thúc và trả về ngay
          if (age < BANNERS_CACHE_TTL) {
            return data;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to read or parse banners cache:', e);
    }

    try {
      // 2. Cache miss hoặc hết hạn: Gọi API lấy dữ liệu mới ở background
      const response = await api.get('/banners/home');
      
      // The backend returns a response wrapped in { success: true, message: '...', data: [...] }
      const banners = response.data?.data ?? response.data ?? [];

      if (!Array.isArray(banners)) {
        // Dự phòng: Trả về cache cũ nếu gọi API lỗi
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.data)) return parsed.data;
          } catch {}
        }
        return [];
      }

      const mapped = banners
        .filter((item: any): item is HomeBanner => {
          return Boolean(
            item &&
            item.id &&
            item.imageUrl
          );
        })
        .sort((a, b) => a.displayOrder - b.displayOrder);

      // 3. Lưu lại vào cache local
      const cacheData = {
        timestamp: Date.now(),
        data: mapped,
      };
      await AsyncStorage.setItem(BANNERS_CACHE_KEY, JSON.stringify(cacheData)).catch(() => {});

      // 4. Cập nhật dữ liệu mới nhất cho UI
      onUpdate?.(mapped);
      return mapped;
    } catch (error) {
      console.error('Failed to fetch home banners in bannerService:', error);
      // Dự phòng: Trả về cache cũ khi gặp lỗi kết nối mạng
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.data)) return parsed.data;
        } catch {}
      }
      return [];
    }
  },
};
