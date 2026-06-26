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
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Categories & Skills</h2>
          <p className="text-zinc-400 mt-1">Configure categories and job capabilities for users and tasks.</p>
        </div>
        <button
          onClick={activeTab === 'categories' ? handleOpenCreateCat : handleOpenCreateSkill}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/10 self-start animate-fade-in"
        >
          <Plus className="h-4 w-4" />
          <span>Create {activeTab === 'categories' ? 'Category' : 'Skill'}</span>
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-zinc-900 gap-6">
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'categories'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>Categories</span>
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'skills'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Bookmark className="h-4 w-4" />
          <span>Skills</span>
        </button>
      </div>

      {/* Tab: Categories */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Filters Card */}
          <Card className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search category name..."
                value={catSearch}
                onChange={(e) => { setCatSearch(e.target.value); setCatPage(1); }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </Card>

          {/* Categories Grid Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Category Name</th>
                    <th className="px-6 py-3.5 font-semibold">Slug Identifier</th>
                    <th className="px-6 py-3.5 font-semibold">Sub-skills</th>
                    <th className="px-6 py-3.5 font-semibold text-center">Tasks Count</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300">
                  {catLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">Loading categories...</td>
                    </tr>
                  ) : catError ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p className="text-red-400">{catError}</p>
                          <button
                            onClick={fetchCategories}
                            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 text-zinc-200 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
                          >
                            Retry Load
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : categories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">No categories found.</td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-zinc-900/20 transition-colors">
                        <td className="px-6 py-4 font-semibold text-white">{cat.name}</td>
                        <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{cat.slug}</td>
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
                                    className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300"
                                  >
                                    {skill.name}
                                  </span>
                                ))}
                                {hasMore && !isExpanded && (
                                  <button
                                    onClick={() => toggleExpandCategory(cat.id)}
                                    className="inline-flex items-center rounded-full bg-indigo-950/40 border border-indigo-850/60 hover:bg-indigo-900/40 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 transition-colors cursor-pointer"
                                  >
                                    +{catSkills.length - 8} more
                                  </button>
                                )}
                                {hasMore && isExpanded && (
                                  <button
                                    onClick={() => toggleExpandCategory(cat.id)}
                                    className="inline-flex items-center rounded-full bg-zinc-950/40 border border-zinc-850/60 hover:bg-zinc-900/40 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                  >
                                    Show less
                                  </button>
                                )}
                                {catSkills.length === 0 && (
                                  <span className="text-xs text-zinc-650 italic">No sub-skills</span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-center text-emerald-450 font-semibold">{cat._count?.tasks || 0}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditCat(cat)}
                              className="rounded-lg p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/60 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                              title="Edit Category"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({ id: cat.id, name: cat.name, type: 'category' });
                                setDeleteConfirmOpen(true);
                              }}
                              className="rounded-lg p-1.5 bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900/20 hover:text-red-200 transition-colors cursor-pointer"
                              title="Delete Category"
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
              <div className="flex items-center justify-between border-t border-zinc-900 px-6 py-4">
                <div className="text-xs text-zinc-500">
                  Showing page <span className="font-semibold text-white">{catPage}</span> of{' '}
                  <span className="font-semibold text-white">{Math.ceil(catTotal / 10)}</span> ({catTotal} categories)
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={catPage <= 1}
                    onClick={() => setCatPage(catPage - 1)}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={catPage >= Math.ceil(catTotal / 10)}
                    onClick={() => setCatPage(catPage + 1)}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
          <Card className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search skill name..."
                value={skillSearch}
                onChange={(e) => { setSkillSearch(e.target.value); setSkillPage(1); }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Category select filter */}
            <div className="w-full sm:w-56">
              <select
                value={skillFilterCat}
                onChange={(e) => { setSkillFilterCat(e.target.value); setSkillPage(1); }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                <option value="">All Categories</option>
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </Card>

          {/* Skills Grid Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Skill Name</th>
                    <th className="px-6 py-3.5 font-semibold">Slug Identifier</th>
                    <th className="px-6 py-3.5 font-semibold">Linked Category</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300">
                  {skillLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-zinc-500">Loading skills...</td>
                    </tr>
                  ) : skillError ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p className="text-red-400">{skillError}</p>
                          <button
                            onClick={fetchSkills}
                            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 text-zinc-200 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
                          >
                            Retry Load
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : skills.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-zinc-500">No skills found.</td>
                    </tr>
                  ) : (
                    skills.map((skill) => (
                      <tr key={skill.id} className="hover:bg-zinc-900/20 transition-colors">
                        <td className="px-6 py-4 font-semibold text-white">{skill.name}</td>
                        <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{skill.slug}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-indigo-950/40 border border-indigo-900/40 text-indigo-305 px-2.5 py-0.5 text-xs font-semibold uppercase">
                            {skill.category?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditSkill(skill)}
                              className="rounded-lg p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/60 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                              title="Edit Skill"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({ id: skill.id, name: skill.name, type: 'skill' });
                                setDeleteConfirmOpen(true);
                              }}
                              className="rounded-lg p-1.5 bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900/20 hover:text-red-200 transition-colors cursor-pointer"
                              title="Delete Skill"
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
              <div className="flex items-center justify-between border-t border-zinc-900 px-6 py-4">
                <div className="text-xs text-zinc-500">
                  Showing page <span className="font-semibold text-white">{skillPage}</span> of{' '}
                  <span className="font-semibold text-white">{Math.ceil(skillTotal / 10)}</span> ({skillTotal} skills)
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={skillPage <= 1}
                    onClick={() => setSkillPage(skillPage - 1)}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={skillPage >= Math.ceil(skillTotal / 10)}
                    onClick={() => setSkillPage(skillPage + 1)}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
          modalType === 'create_cat' ? 'Create Category' :
          modalType === 'edit_cat' ? 'Edit Category' :
          modalType === 'create_skill' ? 'Create Skill' :
          'Edit Skill'
        }
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
          {formError && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Display Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Graphic Design"
              value={formName}
              onChange={handleNameChange}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Slug URL Identifier</label>
            <input
              type="text"
              required
              placeholder="e.g. graphic-design"
              value={formSlug}
              onChange={(e) => setFormSlug(generateSlug(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-white placeholder-zinc-500 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {(modalType === 'create_skill' || modalType === 'edit_skill') && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Linked Category</label>
              <select
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t border-zinc-900">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 py-2.5 px-4 rounded-xl font-semibold text-zinc-300 transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 py-2.5 px-4 rounded-xl font-semibold text-white transition-colors cursor-pointer text-center flex items-center justify-center gap-2"
            >
              {formSubmitting ? 'Saving...' : 'Save Settings'}
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
        title={deleteTarget?.type === 'category' ? 'Delete Category' : 'Delete Skill'}
        description={
          deleteTarget
            ? deleteTarget.type === 'category'
              ? `Are you sure you want to delete the category "${deleteTarget.name}"? This will unlink it from its sub-skills and associated jobs.`
              : `Are you sure you want to delete the skill "${deleteTarget.name}"? This action cannot be undone.`
            : ''
        }
        confirmText="Confirm Delete"
      />
    </div>
  );
}
