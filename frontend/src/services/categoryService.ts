import api from './api';
import { Category, Skill } from '../types';

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  content: { icon: '✍️', color: 'bg-pink-50 text-pink-500' },
  design: { icon: '🎨', color: 'bg-purple-50 text-purple-500' },
  'video-media': { icon: '📸', color: 'bg-rose-50 text-rose-500' },
  photography: { icon: '📸', color: 'bg-rose-50 text-rose-500' },
  marketing: { icon: '📢', color: 'bg-orange-50 text-orange-500' },
  tech: { icon: '💻', color: 'bg-cyan-50 text-cyan-600' },
  errands: { icon: '🏃', color: 'bg-orange-50 text-orange-500' },
  carrying: { icon: '📦', color: 'bg-indigo-50 text-indigo-500' },
  admin: { icon: '📋', color: 'bg-amber-50 text-amber-600' },
  manager: { icon: '📋', color: 'bg-amber-50 text-amber-600' },
  research: { icon: '🔍', color: 'bg-teal-50 text-teal-500' },
  ecommerce: { icon: '🛒', color: 'bg-emerald-50 text-emerald-600' },
  translation: { icon: '🌐', color: 'bg-blue-50 text-blue-500' },
  study: { icon: '📚', color: 'bg-blue-50 text-blue-500' },
  entertainment: { icon: '🎭', color: 'bg-fuchsia-50 text-fuchsia-500' },
  'customer-service': { icon: '🎧', color: 'bg-sky-50 text-sky-500' },
  'ai-automation': { icon: '🤖', color: 'bg-violet-50 text-violet-500' },
  others: { icon: '⚡', color: 'bg-gray-50 text-gray-500' },
};

let cachedCategories: Category[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const categoryService = {
  async getCategories(forceRefresh = false): Promise<Category[]> {
    if (!forceRefresh && cachedCategories && Date.now() - lastFetchTime < CACHE_TTL) {
      return cachedCategories;
    }

    try {
      const response = await api.get('/categories');
      const data = response.data?.data || response.data || [];
      if (Array.isArray(data) && data.length > 0) {
        const mapped: Category[] = data.map((cat: any) => {
          const meta = CATEGORY_META[cat.slug] || { icon: '⚡', color: 'bg-orange-50 text-orange-500' };
          return {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            icon: meta.icon,
            color: meta.color,
            subcategories: Array.isArray(cat.subcategories || cat.skills)
              ? (cat.subcategories || cat.skills).map((sub: any): Skill => ({
                  id: sub.id,
                  categoryId: sub.category_id || sub.categoryId || cat.id,
                  name: sub.name,
                  slug: sub.slug,
                }))
              : [],
          };
        });

        cachedCategories = mapped;
        lastFetchTime = Date.now();
        return mapped;
      }
    } catch (err) {
      console.warn('Failed to load categories from API, using fallback:', err);
    }

    // Fallback if network fails
    return [
      { id: 'errands', name: 'Errands (Việc vặt)', slug: 'errands', icon: '🏃', color: 'bg-orange-50 text-orange-500' },
      { id: 'content', name: 'Content / Dịch thuật', slug: 'content', icon: '✍️', color: 'bg-pink-50 text-pink-500' },
      { id: 'design', name: 'Thiết kế Design', slug: 'design', icon: '🎨', color: 'bg-purple-50 text-purple-500' },
      { id: 'tech', name: 'Công nghệ Tech / IT', slug: 'tech', icon: '💻', color: 'bg-cyan-50 text-cyan-600' },
      { id: 'carrying', name: 'Khuân vác Carrying', slug: 'carrying', icon: '📦', color: 'bg-indigo-50 text-indigo-500' },
      { id: 'photography', name: 'Chụp ảnh Media', slug: 'photography', icon: '📸', color: 'bg-rose-50 text-rose-500' },
      { id: 'research', name: 'Nghiên cứu Research', slug: 'research', icon: '🔍', color: 'bg-teal-50 text-teal-500' },
      { id: 'manager', name: 'Quản lý Manager', slug: 'manager', icon: '📋', color: 'bg-amber-50 text-amber-600' },
      { id: 'entertainment', name: 'Giải trí Event', slug: 'entertainment', icon: '🎭', color: 'bg-fuchsia-50 text-fuchsia-500' },
      { id: 'study', name: 'Gia sư Study Help', slug: 'study', icon: '📚', color: 'bg-blue-50 text-blue-500' },
      { id: 'others', name: 'Việc khác Others', slug: 'others', icon: '⚡', color: 'bg-gray-50 text-gray-500' },
    ];
  },
};
