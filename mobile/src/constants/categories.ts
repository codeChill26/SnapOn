import { Colors } from './colors';

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: '1', name: 'Sửa chữa', slug: 'repair', icon: 'wrench', color: Colors.categoryRepair },
  { id: '2', name: 'Dọn dẹp', slug: 'cleaning', icon: 'broom', color: Colors.categoryCleaning },
  { id: '3', name: 'Vận chuyển', slug: 'moving', icon: 'truck-delivery', color: Colors.categoryMoving },
  { id: '4', name: 'Điện', slug: 'electrical', icon: 'flash', color: Colors.categoryElectrical },
  { id: '5', name: 'Sửa ống nước', slug: 'plumbing', icon: 'water', color: Colors.categoryPlumbing },
  { id: '6', name: 'Sơn sửa', slug: 'painting', icon: 'brush', color: Colors.categoryPainting },
  { id: '7', name: 'Làm vườn', slug: 'gardening', icon: 'flower', color: Colors.categoryGardening },
  { id: '8', name: 'Công nghệ', slug: 'it', icon: 'laptop', color: Colors.categoryIT },
  { id: '9', name: 'Gia sư', slug: 'tutoring', icon: 'school', color: Colors.categoryTutoring },
  { id: '10', name: 'Chăm sóc sức khỏe', slug: 'healthcare', icon: 'heart', color: Colors.categoryHealthcare },
  { id: '11', name: 'Khác', slug: 'other', icon: 'dots-horizontal', color: Colors.categoryOther },
];

export const getCategoryById = (id: string): CategoryInfo | undefined =>
  CATEGORIES.find(c => c.id === id);

export const getCategoryBySlug = (slug: string): CategoryInfo | undefined =>
  CATEGORIES.find(c => c.slug === slug);
