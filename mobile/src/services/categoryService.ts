import api from './api';
import { JobField, JobSubcategory } from '../constants/jobCategories';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CATEGORIES_CACHE_KEY = '@snapon/cache_categories';
const CATEGORIES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 giờ (ms)

const FIELD_METADATA: Record<string, { icon: string; isHot?: boolean }> = {
  content: { icon: 'text-box-edit-outline', isHot: true },
  design: { icon: 'palette-outline', isHot: true },
  'video-media': { icon: 'movie-open-edit-outline', isHot: false },
  marketing: { icon: 'bullhorn-outline', isHot: true },
  tech: { icon: 'code-tags', isHot: true },
  admin: { icon: 'database-edit-outline', isHot: false },
  research: { icon: 'file-search-outline', isHot: false },
  ecommerce: { icon: 'shopping-outline', isHot: false },
  translation: { icon: 'translate', isHot: false },
  study: { icon: 'school-outline', isHot: false },
  'customer-service': { icon: 'headset', isHot: false },
  'ai-automation': { icon: 'robot-outline', isHot: true },
};

export const categoryService = {
  getCategories: async (onUpdate?: (categories: JobField[]) => void): Promise<JobField[] | null> => {
    let cached: string | null = null;
    try {
      // 1. Thử lấy từ cache local trước
      cached = await AsyncStorage.getItem(CATEGORIES_CACHE_KEY);
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        if (Array.isArray(data)) {
          // Trả cache cũ ngay lập tức qua callback để hiển thị tức thì
          onUpdate?.(data);
          // Nếu cache vẫn còn hạn, kết thúc và trả về ngay
          if (age < CATEGORIES_CACHE_TTL) {
            return data;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to read or parse categories cache:', e);
    }

    try {
      // 2. Cache miss hoặc hết hạn: Gọi API lấy dữ liệu mới ở background
      const response = await api.get('/categories');
      const responseData = response.data;
      
      const success = responseData?.success;
      const data = responseData?.data;

      if (!success || !Array.isArray(data)) {
        // Dự phòng: Trả về cache cũ nếu gọi API lỗi
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.data)) return parsed.data;
          } catch {}
        }
        return null;
      }

      const mapped = data.map((cat: any): JobField => {
        const meta = FIELD_METADATA[cat.slug] || { icon: 'briefcase-outline', isHot: false };
        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          icon: meta.icon as any,
          isHot: meta.isHot,
          apiCategoryId: cat.slug,
          subcategories: (cat.subcategories || []).map((sub: any): JobSubcategory => ({
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
            apiCategoryId: cat.slug,
          })),
        };
      });

      // 3. Lưu lại vào cache local
      const cacheData = {
        timestamp: Date.now(),
        data: mapped,
      };
      await AsyncStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(cacheData)).catch(() => {});

      // 4. Cập nhật dữ liệu mới nhất cho UI
      onUpdate?.(mapped);
      return mapped;
    } catch (error) {
      console.error('Failed to fetch categories in categoryService:', error);
      // Dự phòng: Trả về cache cũ khi gặp lỗi kết nối mạng
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.data)) return parsed.data;
        } catch {}
      }
      return null;
    }
  },
};
