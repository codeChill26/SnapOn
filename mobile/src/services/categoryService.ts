import api from './api';
import { JobField, JobSubcategory } from '../constants/jobCategories';

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
  getCategories: async (): Promise<JobField[] | null> => {
    try {
      const response = await api.get('/categories');
      const responseData = response.data;
      
      const success = responseData?.success;
      const data = responseData?.data;

      if (!success || !Array.isArray(data)) {
        return null;
      }

      return data.map((cat: any): JobField => {
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
    } catch (error) {
      console.error('Failed to fetch categories in categoryService:', error);
      return null;
    }
  },
};
