'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Bookmark,
  Tag
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  skills?: {
    id: string;
    name: string;
    slug: string;
  }[];
  _count?: {
    skills: number;
    tasks: number;
  };
}

interface SkillItem {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  category: {
    name: string;
  };
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'categories' | 'skills'>('categories');

  // Categories list state
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [catTotal, setCatTotal] = useState(0);
  const [catPage, setCatPage] = useState(1);
  const [catSearch, setCatSearch] = useState('');
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);

  // Expanded categories state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleExpandCategory = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  // Skills list state
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [skillTotal, setSkillTotal] = useState(0);
  const [skillPage, setSkillPage] = useState(1);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillFilterCat, setSkillFilterCat] = useState('');
  const [skillLoading, setSkillLoading] = useState(true);
  const [skillError, setSkillError] = useState<string | null>(null);

  // All categories (for skill create dropdown / filter)
  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);

  // Dialog State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'create_cat' | 'edit_cat' | 'create_skill' | 'edit_skill'>('create_cat');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'category' | 'skill' } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch all categories for lists/selects
  const fetchAllCategories = async () => {
    try {
      const res = await apiClient.get('/api/categories');
      const data = res.data;
      if (data.success) {
        setAllCategories(data.data);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    setCatError(null);
    try {
      const params: Record<string, string> = {
        page: catPage.toString(),
        limit: '10',
      };
      if (catSearch) params.search = catSearch;

      const res = await apiClient.get('/api/categories', { params });
      const data = res.data;
      if (data.success) {
        setCategories(data.data.categories);
        setCatTotal(data.data.total);
      }
    } catch (err: any) {
      console.error(err);
      setCatError(err.message || 'Failed to load categories.');
    } finally {
      setCatLoading(false);
    }
  }, [catPage, catSearch]);

  const fetchSkills = useCallback(async () => {
    setSkillLoading(true);
    setSkillError(null);
    try {
      const params: Record<string, string> = {
        page: skillPage.toString(),
        limit: '10',
      };
      if (skillSearch) params.search = skillSearch;
      if (skillFilterCat) params.categoryId = skillFilterCat;

      const res = await apiClient.get('/api/skills', { params });
      const data = res.data;
      if (data.success) {
        setSkills(data.data.skills);
        setSkillTotal(data.data.total);
      }
    } catch (err: any) {
      console.error(err);
      setSkillError(err.message || 'Failed to load skills.');
    } finally {
      setSkillLoading(false);
    }
  }, [skillPage, skillSearch, skillFilterCat]);

  useEffect(() => {
    fetchAllCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'categories') {
      fetchCategories();
    } else {
      fetchSkills();
    }
  }, [activeTab, fetchCategories, fetchSkills]);

  const handleOpenCreateCat = () => {
    setFormName('');
    setFormSlug('');
    setFormError(null);
    setModalType('create_cat');
    setModalOpen(true);
  };

  const handleOpenEditCat = (cat: CategoryItem) => {
    setSelectedItem(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormError(null);
    setModalType('edit_cat');
    setModalOpen(true);
  };

  const handleOpenCreateSkill = () => {
    setFormName('');
    setFormSlug('');
    setFormCategoryId(allCategories[0]?.id || '');
    setFormError(null);
    setModalType('create_skill');
    setModalOpen(true);
  };

  const handleOpenEditSkill = (skill: SkillItem) => {
    setSelectedItem(skill);
    setFormName(skill.name);
    setFormSlug(skill.slug);
    setFormCategoryId(skill.categoryId);
    setFormError(null);
    setModalType('edit_skill');
    setModalOpen(true);
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nameVal = e.target.value;
    setFormName(nameVal);
    setFormSlug(generateSlug(nameVal));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    let url = '/api/categories';
    let method: 'post' | 'put' = 'post';
    let bodyData: any = { name: formName, slug: formSlug };

    if (modalType === 'edit_cat') {
      url = `/api/categories/${selectedItem.id}`;
      method = 'put';
    } else if (modalType === 'create_skill') {
      url = '/api/skills';
      bodyData.categoryId = formCategoryId;
    } else if (modalType === 'edit_skill') {
      url = `/api/skills/${selectedItem.id}`;
      method = 'put';
      bodyData.categoryId = formCategoryId;
    }

    try {
      const res = method === 'post' 
        ? await apiClient.post(url, bodyData)
        : await apiClient.put(url, bodyData);

      const data = res.data;
      if (data.success) {
        toast(
          `${modalType.includes('cat') ? 'Category' : 'Skill'} saved successfully!`,
          'success'
        );
        setModalOpen(false);
        fetchAllCategories();
        if (activeTab === 'categories') {
          fetchCategories();
        } else {
          fetchSkills();
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const { id, type } = deleteTarget;
    const url = type === 'category' ? `/api/categories/${id}` : `/api/skills/${id}`;
    try {
      const res = await apiClient.delete(url);
      const data = res.data;
      if (data.success) {
        toast(`${type === 'category' ? 'Category' : 'Skill'} deleted successfully!`, 'success');
        setDeleteConfirmOpen(false);
        setDeleteTarget(null);
        fetchAllCategories();
        if (activeTab === 'categories') {
          fetchCategories();
        } else {
          fetchSkills();
        }
      }
    } catch (err: any) {
      console.error(err);
      toast(err.message || `Failed to delete ${type}.`, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#18181B]">Danh Mục & Kỹ Năng</h2>
          <p className="text-[#71717A] text-sm mt-1 font-medium">Cấu hình hệ thống danh mục dịch vụ và năng lực ngành nghề.</p>
        </div>
        <button
          onClick={activeTab === 'categories' ? handleOpenCreateCat : handleOpenCreateSkill}
          className="bg-[#312F2C] hover:bg-[#18181B] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-md self-start"
        >
          <Plus className="h-4 w-4" />
          <span>Tạo {activeTab === 'categories' ? 'Danh mục' : 'Kỹ năng'}</span>
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-[#E4E4E7] gap-6">
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 font-extrabold text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'categories'
              ? 'border-[#312F2C] text-[#312F2C]'
              : 'border-transparent text-[#71717A] hover:text-[#18181B]'
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>Danh Mục</span>
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`pb-3 font-extrabold text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'skills'
              ? 'border-[#312F2C] text-[#312F2C]'
              : 'border-transparent text-[#71717A] hover:text-[#18181B]'
          }`}
        >
          <Bookmark className="h-4 w-4" />
          <span>Kỹ Năng</span>
        </button>
      </div>

      {/* Tab: Categories */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Filters Card */}
          <Card className="flex flex-col sm:flex-row gap-4 items-center bg-white border-[#E4E4E7] shadow-sm">
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#71717A]">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Tìm tên danh mục..."
                value={catSearch}
                onChange={(e) => { setCatSearch(e.target.value); setCatPage(1); }}
                className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl py-2 pl-9 pr-4 text-[#18181B] text-sm placeholder-[#71717A] focus:outline-none focus:border-[#312F2C] transition-all font-medium"
              />
            </div>
          </Card>

          {/* Categories Grid Table Card */}
          <Card className="overflow-hidden bg-white border-[#E4E4E7] shadow-sm p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#71717A]">
                <thead className="bg-[#F4F4F5] text-[11px] uppercase font-extrabold text-[#71717A] border-b border-[#E4E4E7]">
                  <tr>
                    <th className="px-6 py-3.5 font-extrabold">Tên Danh Mục</th>
                    <th className="px-6 py-3.5 font-extrabold">Mã Slug</th>
                    <th className="px-6 py-3.5 font-extrabold">Kỹ Năng Con</th>
                    <th className="px-6 py-3.5 font-extrabold text-center">Số Công Việc</th>
                    <th className="px-6 py-3.5 font-extrabold text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E7] text-[#18181B]">
                  {catLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-[#71717A] font-medium">Đang tải danh mục...</td>
                    </tr>
                  ) : catError ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p className="text-rose-600 font-semibold">{catError}</p>
                          <button
                            onClick={fetchCategories}
                            className="px-4 py-2 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl hover:bg-[#E4E4E7] text-[#18181B] transition-colors cursor-pointer text-xs font-bold"
                          >
                            Tải lại
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : categories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-[#71717A] font-medium">Không tìm thấy danh mục nào.</td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-6 py-4 font-bold text-[#18181B] text-base">{cat.name}</td>
                        <td className="px-6 py-4 text-[#71717A] font-mono text-xs font-semibold">{cat.slug}</td>
                        <td className="px-6 py-4">
                          {(() => {
                            const catSkills = cat.skills || [];
                            const isExpanded = !!expandedCategories[cat.id];
                            const visibleSkills = isExpanded ? catSkills : catSkills.slice(0, 8);
                            const hasMore = catSkills.length > 8;

                            return (
                              <div className="flex flex-wrap gap-1.5 max-w-xs md:max-w-md">
                                {visibleSkills.map(skill => (
                                  <span 
                                    key={skill.id} 
                                    className="inline-flex items-center rounded-full bg-[#312F2C] text-white px-2.5 py-0.5 text-[10px] font-bold shadow-2xs"
                                  >
                                    {skill.name}
                                  </span>
                                ))}
                                {hasMore && !isExpanded && (
                                  <button
                                    onClick={() => toggleExpandCategory(cat.id)}
                                    className="inline-flex items-center rounded-full bg-[#F4F4F5] border border-[#E4E4E7] hover:bg-[#E4E4E7] px-2.5 py-0.5 text-[10px] font-bold text-[#312F2C] transition-colors cursor-pointer"
                                  >
                                    +{catSkills.length - 8} kỹ năng
                                  </button>
                                )}
                                {hasMore && isExpanded && (
                                  <button
                                    onClick={() => toggleExpandCategory(cat.id)}
                                    className="inline-flex items-center rounded-full bg-[#F4F4F5] border border-[#E4E4E7] hover:bg-[#E4E4E7] px-2.5 py-0.5 text-[10px] font-bold text-[#71717A] transition-colors cursor-pointer"
                                  >
                                    Thu gọn
                                  </button>
                                )}
                                {catSkills.length === 0 && (
                                  <span className="text-xs text-[#71717A] italic">Chưa có kỹ năng con</span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-center text-emerald-700 font-extrabold">{cat._count?.tasks || 0}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditCat(cat)}
                              className="rounded-lg p-2 bg-[#F4F4F5] border border-[#E4E4E7] hover:bg-[#312F2C] hover:text-white text-[#312F2C] transition-colors cursor-pointer shadow-2xs"
                              title="Sửa Danh mục"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({ id: cat.id, name: cat.name, type: 'category' });
                                setDeleteConfirmOpen(true);
                              }}
                              className="rounded-lg p-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer shadow-2xs"
                              title="Xóa Danh mục"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {catTotal > 10 && (
              <div className="flex items-center justify-between border-t border-[#E4E4E7] px-6 py-4 bg-white">
                <div className="text-xs text-[#71717A]">
                  Hiển thị trang <span className="font-bold text-[#18181B]">{catPage}</span> /{' '}
                  <span className="font-bold text-[#18181B]">{Math.ceil(catTotal / 10)}</span> ({catTotal} danh mục)
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={catPage <= 1}
                    onClick={() => setCatPage(catPage - 1)}
                    className="rounded-lg border border-[#E4E4E7] bg-[#F4F4F5] p-2 text-[#312F2C] hover:bg-[#E4E4E7] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={catPage >= Math.ceil(catTotal / 10)}
                    onClick={() => setCatPage(catPage + 1)}
                    className="rounded-lg border border-[#E4E4E7] bg-[#F4F4F5] p-2 text-[#312F2C] hover:bg-[#E4E4E7] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab: Skills */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          {/* Filters Card */}
          <Card className="flex flex-col sm:flex-row gap-4 items-center bg-white border-[#E4E4E7] shadow-sm">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#71717A]">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Tìm tên kỹ năng..."
                value={skillSearch}
                onChange={(e) => { setSkillSearch(e.target.value); setSkillPage(1); }}
                className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl py-2 pl-9 pr-4 text-[#18181B] text-sm placeholder-[#71717A] focus:outline-none focus:border-[#312F2C] transition-all font-medium"
              />
            </div>

            {/* Category select filter */}
            <div className="w-full sm:w-56">
              <select
                value={skillFilterCat}
                onChange={(e) => { setSkillFilterCat(e.target.value); setSkillPage(1); }}
                className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl py-2 px-3 text-[#18181B] text-sm focus:outline-none focus:border-[#312F2C] transition-all font-medium"
              >
                <option value="">Tất cả danh mục</option>
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </Card>

          {/* Skills Grid Table */}
          <Card className="overflow-hidden bg-white border-[#E4E4E7] shadow-sm p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#71717A]">
                <thead className="bg-[#F4F4F5] text-[11px] uppercase font-extrabold text-[#71717A] border-b border-[#E4E4E7]">
                  <tr>
                    <th className="px-6 py-3.5 font-extrabold">Tên Kỹ Năng</th>
                    <th className="px-6 py-3.5 font-extrabold">Mã Slug</th>
                    <th className="px-6 py-3.5 font-extrabold">Danh Mục Liên Kết</th>
                    <th className="px-6 py-3.5 font-extrabold text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E7] text-[#18181B]">
                  {skillLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-[#71717A] font-medium">Đang tải kỹ năng...</td>
                    </tr>
                  ) : skillError ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p className="text-rose-600 font-semibold">{skillError}</p>
                          <button
                            onClick={fetchSkills}
                            className="px-4 py-2 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl hover:bg-[#E4E4E7] text-[#18181B] transition-colors cursor-pointer text-xs font-bold"
                          >
                            Tải lại
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : skills.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-[#71717A] font-medium">Không tìm thấy kỹ năng nào.</td>
                    </tr>
                  ) : (
                    skills.map((skill) => (
                      <tr key={skill.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-6 py-4 font-bold text-[#18181B] text-base">{skill.name}</td>
                        <td className="px-6 py-4 text-[#71717A] font-mono text-xs font-semibold">{skill.slug}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-[#312F2C] text-white px-2.5 py-0.5 text-xs font-bold uppercase shadow-2xs">
                            {skill.category?.name || 'Chưa phân loại'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditSkill(skill)}
                              className="rounded-lg p-2 bg-[#F4F4F5] border border-[#E4E4E7] hover:bg-[#312F2C] hover:text-white text-[#312F2C] transition-colors cursor-pointer shadow-2xs"
                              title="Sửa Kỹ năng"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({ id: skill.id, name: skill.name, type: 'skill' });
                                setDeleteConfirmOpen(true);
                              }}
                              className="rounded-lg p-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer shadow-2xs"
                              title="Xóa Kỹ năng"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {skillTotal > 10 && (
              <div className="flex items-center justify-between border-t border-[#E4E4E7] px-6 py-4 bg-white">
                <div className="text-xs text-[#71717A]">
                  Hiển thị trang <span className="font-bold text-[#18181B]">{skillPage}</span> /{' '}
                  <span className="font-bold text-[#18181B]">{Math.ceil(skillTotal / 10)}</span> ({skillTotal} kỹ năng)
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={skillPage <= 1}
                    onClick={() => setSkillPage(skillPage - 1)}
                    className="rounded-lg border border-[#E4E4E7] bg-[#F4F4F5] p-2 text-[#312F2C] hover:bg-[#E4E4E7] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={skillPage >= Math.ceil(skillTotal / 10)}
                    onClick={() => setSkillPage(skillPage + 1)}
                    className="rounded-lg border border-[#E4E4E7] bg-[#F4F4F5] p-2 text-[#312F2C] hover:bg-[#E4E4E7] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Create / Edit Modal Dialog */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          modalType === 'create_cat' ? 'Tạo Danh Mục Mới' :
          modalType === 'edit_cat' ? 'Chỉnh Sửa Danh Mục' :
          modalType === 'create_skill' ? 'Tạo Kỹ Năng Mới' :
          'Chỉnh Sửa Kỹ Năng'
        }
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-sm text-[#18181B]">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#312F2C] mb-2">Tên hiển thị</label>
            <input
              type="text"
              required
              placeholder="ví dụ: Thiết kế đồ họa"
              value={formName}
              onChange={handleNameChange}
              className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl py-2.5 px-3.5 text-[#18181B] placeholder-[#71717A] focus:outline-none focus:border-[#312F2C] transition-all text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#312F2C] mb-2">Mã Slug URL</label>
            <input
              type="text"
              required
              placeholder="ví dụ: thiet-ke-do-hoa"
              value={formSlug}
              onChange={(e) => setFormSlug(generateSlug(e.target.value))}
              className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl py-2.5 px-3.5 text-[#18181B] placeholder-[#71717A] font-mono text-xs focus:outline-none focus:border-[#312F2C] transition-all font-semibold"
            />
          </div>

          {(modalType === 'create_skill' || modalType === 'edit_skill') && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#312F2C] mb-2">Danh mục liên kết</label>
              <select
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl py-2.5 px-3 text-[#18181B] focus:outline-none focus:border-[#312F2C] transition-all font-semibold text-sm"
              >
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t border-[#E4E4E7]">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 bg-[#F4F4F5] border border-[#E4E4E7] hover:bg-[#E4E4E7] py-2.5 px-4 rounded-xl font-bold text-[#312F2C] transition-colors cursor-pointer text-center"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="flex-1 bg-[#312F2C] hover:bg-[#18181B] disabled:opacity-50 py-2.5 px-4 rounded-xl font-bold text-white transition-colors cursor-pointer text-center flex items-center justify-center gap-2"
            >
              {formSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        isLoading={deleteLoading}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={executeDelete}
        title={deleteTarget?.type === 'category' ? 'Xóa Danh Mục' : 'Xóa Kỹ Năng'}
        description={
          deleteTarget
            ? deleteTarget.type === 'category'
              ? `Bạn có chắc chắn muốn xóa danh mục "${deleteTarget.name}"? Thao tác này sẽ bỏ liên kết với các kỹ năng con và công việc liên quan.`
              : `Bạn có chắc chắn muốn xóa kỹ năng "${deleteTarget.name}"? Thao tác này không thể hoàn tác.`
            : ''
        }
        confirmText="Xác nhận Xóa"
      />
    </div>
  );
}
