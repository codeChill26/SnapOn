import { Colors } from './colors';

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: '1', name: 'Content / Dịch thuật', slug: 'content', icon: 'file-document-edit-outline', color: '#004E89' },
  { id: '2', name: 'Design / Thiết kế', slug: 'design', icon: 'palette-outline', color: '#EC4899' },
  { id: '3', name: 'Tech / Lập trình', slug: 'tech', icon: 'code-json', color: '#6366F1' },
  { id: '4', name: 'Research / Khảo sát', slug: 'research', icon: 'file-search-outline', color: '#14B8A6' },
  { id: '5', name: 'Hỗ trợ học tập', slug: 'study', icon: 'book-open-page-variant-outline', color: '#F59E0B' },
  { id: '6', name: 'Khác', slug: 'others', icon: 'dots-horizontal', color: '#6B7280' },
];

export const getCategoryById = (id: string | number | undefined): CategoryInfo | undefined =>
  CATEGORIES.find(c => String(c.id) === String(id));

export const getCategoryBySlug = (slug: string): CategoryInfo | undefined =>
  CATEGORIES.find(c => c.slug === slug);
