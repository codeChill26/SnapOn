'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { formatImageUrl } from '@/lib/image-utils';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  XCircle, 
  Trash2,
  Briefcase,
  MapPin,
  DollarSign,
  User,
  Info,
  Wallet
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import TaskDetailModal from '@/components/TaskDetailModal';

interface TaskItem {
  id: string;
  title: string;
  taskType: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'CLOSED' | 'EXPIRED';
  budgetMin: string | null;
  budgetMax: string | null;
  createdAt: string;
  images: string[];
  category: {
    name: string;
  } | null;
  poster: {
    fullName: string;
    email: string;
  };
}

export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Categories list (for filters)
  const [categories, setCategories] = useState<any[]>([]);

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Delete State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/api/categories');
      const data = res.data;
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.categoryId = categoryFilter;

      const res = await apiClient.get('/api/tasks', { params });
      const data = res.data;
      if (data.success) {
        setTasks(data.data.tasks);
        setTotal(data.data.total);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleCategoryFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value);
    setPage(1);
  };

  const handleViewDetails = (id: string) => {
    setSelectedTaskId(id);
    setDetailModalOpen(true);
  };

  const handleOpenCancel = (task: any) => {
    setSelectedTask(task);
    setCancelReason('');
    setCancelError(null);
    setCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelError(null);
    setCancelSubmitting(true);

    try {
      const res = await apiClient.post(`/api/tasks/${selectedTask.id}/cancel`, {
        reason: cancelReason,
      });
      const data = res.data;

      if (data.success) {
        toast('Task listing successfully cancelled.', 'success');
        setCancelModalOpen(false);
        setDetailModalOpen(false);
        fetchTasks();
      }
    } catch (err: any) {
      setCancelError(err.message || 'Operation failed');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await apiClient.delete(`/api/tasks/${deleteTarget.id}`);
      const data = res.data;
      if (data.success) {
        toast('Task permanently deleted from the database.', 'success');
        setDeleteConfirmOpen(false);
        setDeleteTarget(null);
        setDetailModalOpen(false);
        fetchTasks();
      }
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to delete task.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Manage Tasks</h2>
        <p className="text-zinc-400 mt-1">Audit task details, applications, payments, and cancel/delete listings.</p>
      </div>

      {/* Filters Card */}
      <Card className="flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search task title or details..."
            value={search}
            onChange={handleSearchChange}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="CLOSED">Closed</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="w-full sm:w-56">
          <select
            value={categoryFilter}
            onChange={handleCategoryFilterChange}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          >
            <option value="">All Categories</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3.5 font-semibold w-[80px]">Image</th>
                <th className="px-6 py-3.5 font-semibold">Task Details</th>
                <th className="px-6 py-3.5 font-semibold">Poster</th>
                <th className="px-6 py-3.5 font-semibold">Category</th>
                <th className="px-6 py-3.5 font-semibold text-center">Budget</th>
                <th className="px-6 py-3.5 font-semibold text-center">Status</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-zinc-500">Loading tasks...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-red-400">{error}</p>
                      <button
                        onClick={fetchTasks}
                        className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 text-zinc-200 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
                      >
                        Retry Load
                      </button>
                    </div>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-zinc-500">No tasks found matching parameters.</td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-zinc-900/20 transition-colors">
                    <td className="px-6 py-4">
                      {task.images && task.images.length > 0 ? (
                        <div 
                          onClick={() => handleViewDetails(task.id)}
                          className="relative w-[56px] h-[56px] rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden cursor-pointer group shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md hover:shadow-indigo-500/10 hover:border-zinc-700"
                          title="Click to view full gallery and details"
                        >
                          <Image
                            src={formatImageUrl(task.images[0])}
                            width={56}
                            height={56}
                            alt={task.title}
                            className="w-full h-full object-cover transition-transform duration-200"
                          />
                          {task.images.length > 1 && (
                            <span className="absolute bottom-1 right-1 bg-black/70 text-white rounded-full text-xs font-semibold px-2 py-0.5 pointer-events-none select-none">
                              +{task.images.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-[56px] h-[56px] rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 font-medium select-none">
                          No Image
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white truncate max-w-[200px]" title={task.title}>
                        {task.title}
                      </div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-1">
                        <span className="capitalize">{task.taskType.toLowerCase()}</span>
                        <span>&bull;</span>
                        <span>{new Date(task.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{task.poster.fullName}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{task.poster.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-zinc-400 border border-zinc-800 uppercase">
                        {task.category?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-xs font-semibold text-white">
                        {task.budgetMin ? `${Number(task.budgetMin).toLocaleString('vi-VN')} VND` : 'No Limit'}
                      </div>
                      {task.budgetMax && (
                        <div className="text-[10px] text-zinc-550 mt-0.5">
                          Up to {Number(task.budgetMax).toLocaleString('vi-VN')} VND
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                        task.status === 'OPEN' ? 'bg-blue-950/40 text-blue-300 border-blue-800/40' :
                        task.status === 'IN_PROGRESS' ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' :
                        task.status === 'COMPLETED' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                        task.status === 'CANCELLED' ? 'bg-red-950/40 text-red-300 border-red-800/40' :
                        'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(task.id)}
                          className="rounded-lg p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/60 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {task.status !== 'CANCELLED' && task.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleOpenCancel(task)}
                            className="rounded-lg p-1.5 bg-amber-950/20 border border-amber-900/30 text-amber-450 hover:bg-amber-900/20 hover:text-amber-200 transition-colors cursor-pointer"
                            title="Cancel Task"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setDeleteTarget({ id: task.id, title: task.title });
                            setDeleteConfirmOpen(true);
                          }}
                          className="rounded-lg p-1.5 bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900/20 hover:text-red-200 transition-colors cursor-pointer"
                          title="Delete Task"
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
            <div className="text-xs text-zinc-550">
              Showing page <span className="font-semibold text-white">{page}</span> of{' '}
              <span className="font-semibold text-white">{totalPages}</span> ({total} entries)
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

      {/* Task Details Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={detailModalOpen}
        onClose={() => {
          setSelectedTaskId(null);
          setDetailModalOpen(false);
        }}
        onRefresh={fetchTasks}
      />

      {/* Cancel Reason Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Task Listing"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4 text-sm">
          {cancelError && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200">
              {cancelError}
            </div>
          )}

          <div className="p-3 bg-amber-950/20 border border-amber-900/30 text-amber-300 rounded-xl flex items-start gap-2">
            <Info className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span className="text-xs">
              Cancelling a task will change its status to <strong>CANCELLED</strong>. This action is logged.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Cancellation Reason
            </label>
            <textarea
              required
              rows={4}
              placeholder="Provide a detailed reason for cancelling this task (e.g., policy violation, spam, user request)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-zinc-900">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 py-2.5 px-4 rounded-xl font-semibold text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={cancelSubmitting}
              className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 py-2.5 px-4 rounded-xl font-semibold text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {cancelSubmitting ? 'Processing...' : 'Confirm Cancel'}
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
        title="Delete Task Permanently"
        description={deleteTarget ? `Are you sure you want to permanently delete the task "${deleteTarget.title}"? This will delete all bids, applications, address records, and histories related to this task. This action cannot be undone.` : ''}
        confirmText="Confirm Delete"
      />
    </div>
  );
}
