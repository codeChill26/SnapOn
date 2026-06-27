'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

interface BannerItem {
  id: string;
  code: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  placement: string;
  display_order: number;
  is_active: boolean;
  categories: {
    name: string;
  } | null;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Categories list (for select input)
  const [categories, setCategories] = useState<any[]>([]);

  // Modal Dialog states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [selectedBanner, setSelectedBanner] = useState<any>(null);

  // Form states
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formPlacement, setFormPlacement] = useState('HOME_FEATURED');
  const [formActionType, setFormActionType] = useState('CATEGORY_DETAIL');
  const [formActionValue, setFormActionValue] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState(1);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);

      const res = await fetch(`/api/banners?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setBanners(data.data.banners);
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleOpenCreate = () => {
    setFormCode('');
    setFormTitle('');
    setFormSubtitle('');
    setFormImageUrl('');
    setFormCategoryId(categories[0]?.id || '');
    setFormPlacement('HOME_FEATURED');
    setFormActionType('CATEGORY_DETAIL');
    setFormActionValue('');
    setFormDisplayOrder(1);
    setFormIsActive(true);
    setFormError(null);
    setModalType('create');
    setModalOpen(true);
  };

  const handleOpenEdit = (b: any) => {
    setSelectedBanner(b);
    setFormCode(b.code);
    setFormTitle(b.title);
    setFormSubtitle(b.subtitle || '');
    setFormImageUrl(b.image_url);
    setFormCategoryId(b.category_id || '');
    setFormPlacement(b.placement);
    setFormActionType(b.action_type);
    setFormActionValue(b.action_value || '');
    setFormDisplayOrder(b.display_order);
    setFormIsActive(b.is_active);
    setFormError(null);
    setModalType('edit');
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    const bodyData = {
      code: formCode,
      title: formTitle,
      subtitle: formSubtitle,
      image_url: formImageUrl,
      category_id: formCategoryId || undefined,
      placement: formPlacement,
      action_type: formActionType,
      action_value: formActionValue || undefined,
      display_order: parseInt(formDisplayOrder.toString()),
      is_active: formIsActive,
    };

    const url = modalType === 'create' ? '/api/banners' : `/api/banners/${selectedBanner.id}`;
    const method = modalType === 'create' ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Operation failed');
      }

      setModalOpen(false);
      fetchBanners();
    } catch (err: any) {
      setFormError(err.message || 'Server error occurred');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (b: BannerItem) => {
    const newStatus = !b.is_active;
    try {
      const res = await fetch(`/api/banners/${b.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setBanners(banners.map(item => item.id === b.id ? { ...item, is_active: newStatus } : item));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this banner permanently?');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchBanners();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Manage Banners</h2>
          <p className="text-zinc-400 mt-1">Configure layout carousel banners and active promotions.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/10 self-start"
        >
          <Plus className="h-4 w-4" />
          <span>Create Banner</span>
        </button>
      </div>

      {/* Filters Card */}
      <Card className="flex flex-col sm:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search banner title or code..."
            value={search}
            onChange={handleSearchChange}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-450">
            <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Banner Info</th>
                <th className="px-6 py-3.5 font-semibold">Placement</th>
                <th className="px-6 py-3.5 font-semibold text-center">Display Order</th>
                <th className="px-6 py-3.5 font-semibold">Linked Category</th>
                <th className="px-6 py-3.5 font-semibold text-center">Status</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-zinc-500">Loading banners...</td>
                </tr>
              ) : banners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-zinc-500">No banners found matching search parameter.</td>
                </tr>
              ) : (
                banners.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-900/20 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      {/* Image Preview */}
                      <div className="h-10 w-16 bg-zinc-900 border border-zinc-800 rounded overflow-hidden relative shrink-0">
                        {b.image_url ? (
                          <img src={b.image_url} alt={b.title} className="object-cover w-full h-full" />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-zinc-500"><ImageIcon className="h-4 w-4" /></div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white truncate max-w-[150px]">{b.title}</div>
                        <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[120px] mt-0.5" title={b.code}>
                          Code: {b.code}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-zinc-900 px-2.5 py-1 rounded text-zinc-400 border border-zinc-800 uppercase">
                        {b.placement}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-white">{b.display_order}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-indigo-400 font-semibold">{b.categories?.name || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(b)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold cursor-pointer border ${
                          b.is_active 
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/20' 
                            : 'bg-zinc-900 text-zinc-450 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {b.is_active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>{b.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="rounded-lg p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/60 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit Banner"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="rounded-lg p-1.5 bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900/20 hover:text-red-200 transition-colors cursor-pointer"
                          title="Delete Banner"
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-900 px-6 py-4">
            <div className="text-xs text-zinc-500">
              Showing page <span className="font-semibold text-white">{page}</span> of{' '}
              <span className="font-semibold text-white">{totalPages}</span> ({total} banners)
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Create / Edit Modal Dialog */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalType === 'create' ? 'Create Layout Banner' : 'Edit Layout Banner'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-sm max-h-[80vh] overflow-y-auto pr-1">
          {formError && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Unique Code</label>
              <input
                type="text"
                required
                disabled={modalType === 'edit'}
                placeholder="e.g. HOME_BANNER_1"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Display Order</label>
              <input
                type="number"
                required
                min={1}
                placeholder="1"
                value={formDisplayOrder}
                onChange={(e) => setFormDisplayOrder(parseInt(e.target.value) || 1)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Special Discount for Services"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Subtitle</label>
            <input
              type="text"
              placeholder="e.g. Get 20% off using SnapOn app"
              value={formSubtitle}
              onChange={(e) => setFormSubtitle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Image URL</label>
            <input
              type="url"
              required
              placeholder="e.g. https://res.cloudinary.com/..."
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Placement Group</label>
              <select
                value={formPlacement}
                onChange={(e) => setFormPlacement(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                <option value="HOME_FEATURED">Home Featured (Carousel)</option>
                <option value="SIDEBAR_AD">Sidebar Advertisement</option>
                <option value="POPUP_PROMO">Popup Promotion</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Linked Category</label>
              <select
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                <option value="">None (General)</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Action Type</label>
              <select
                value={formActionType}
                onChange={(e) => setFormActionType(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                <option value="CATEGORY_DETAIL">Category Detail Navigation</option>
                <option value="WEB_URL">Redirect to URL Link</option>
                <option value="NONE">No Action click</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Action Value</label>
              <input
                type="text"
                placeholder={formActionType === 'WEB_URL' ? 'e.g. https://google.com' : 'e.g. category-slug'}
                value={formActionValue}
                onChange={(e) => setFormActionValue(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="h-4 w-4 bg-zinc-900 border-zinc-800 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="is_active" className="text-sm text-zinc-300 font-semibold cursor-pointer">
              Set banner as Active (Visible immediately if matching rules)
            </label>
          </div>

          <div className="flex gap-3 pt-3 border-t border-zinc-900">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 py-2.5 px-4 rounded-xl font-semibold text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 py-2.5 px-4 rounded-xl font-semibold text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {formSubmitting ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
