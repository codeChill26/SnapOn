'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { formatImageUrl } from '@/lib/image-utils';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  UserCheck, 
  UserX, 
  Eye, 
  Info,
  Shield,
  Phone,
  Calendar,
  Wallet,
  Briefcase
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import TaskDetailModal from '@/components/TaskDetailModal';

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: 'ACTIVE' | 'BANNED' | 'SUSPENDED';
  role: string | null;
  createdAt: string;
  _count: {
    postedTasks: number;
    assignedTasks: number;
  };
}

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);



  // Task Detail Modal State for user's task clicks
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  // Confirmation Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string; status: 'ACTIVE' | 'BANNED' | 'SUSPENDED' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get('/api/users', { params });
      const data = res.data;
      if (data.success) {
        setUsers(data.data.users);
        setTotal(data.data.total);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch users list.');
      toast(err.message || 'Failed to fetch users list.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleViewDetails = async (id: string) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    setSelectedUser(null);
    try {
      const res = await apiClient.get(`/api/users/${id}`);
      const data = res.data;
      if (data.success) {
        setSelectedUser(data.data);
      }
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to load user details.', 'error');
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'ACTIVE' | 'BANNED' | 'SUSPENDED') => {
    setActionLoading(true);
    try {
      const res = await apiClient.put(`/api/users/${id}`, { status: newStatus });
      const data = res.data;
      if (data.success) {
        // Update list
        setUsers(prevUsers => prevUsers.map(u => u.id === id ? { ...u, status: newStatus } : u));
        // Update detail modal
        if (selectedUser && selectedUser.id === id) {
          setSelectedUser({ ...selectedUser, status: newStatus });
        }
        toast(`User status updated to ${newStatus} successfully!`, 'success');
        setConfirmOpen(false);
        setConfirmTarget(null);
      }
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to update user status.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#18181B]">Manage Users</h2>
        <p className="text-[#71717A] text-sm mt-1 font-medium">Audit user accounts, platform status, bans, roles, and user statistics.</p>
      </div>

      {/* Filters Card */}
      <Card className="flex flex-col sm:flex-row gap-4 items-center bg-white border-[#E4E4E7] shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#71717A]">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={handleSearchChange}
            className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl py-2 pl-9 pr-4 text-[#18181B] text-sm placeholder-[#71717A] focus:outline-none focus:border-[#312F2C] transition-all font-medium"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl py-2 px-3 text-[#18181B] text-sm focus:outline-none focus:border-[#312F2C] transition-all font-semibold"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="BANNED">Banned</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </Card>

      {/* Data Table Card */}
      <Card className="overflow-hidden bg-white border-[#E4E4E7] shadow-sm p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#71717A]">
            <thead className="bg-[#F4F4F5] text-[11px] uppercase font-extrabold text-[#71717A] border-b border-[#E4E4E7]">
              <tr>
                <th className="px-6 py-3.5">User Details</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-center">Tasks</th>
                <th className="px-6 py-3.5">Joined At</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7] text-[#18181B]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-[#71717A] font-medium">
                    Loading users list...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-rose-600 font-bold">{error}</p>
                      <button
                        onClick={fetchUsers}
                        className="px-4 py-2 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl hover:bg-[#E4E4E7] text-[#18181B] transition-colors cursor-pointer text-xs font-bold"
                      >
                        Retry Load
                      </button>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-[#71717A] font-medium">
                    No users found matching parameters.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full overflow-hidden border border-[#E4E4E7] bg-[#F4F4F5] shrink-0">
                          <img
                            src={formatImageUrl(user.avatarUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.fullName || 'User')}`}
                            alt={`${user.fullName}'s Avatar`}
                            className="object-cover w-full h-full"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.fullName || 'User')}`;
                            }}
                          />
                        </div>
                        <div>
                          <div className="font-bold text-[#18181B]">{user.fullName}</div>
                          <div className="text-xs text-[#71717A] font-mono mt-0.5">{user.email}</div>
                          {user.phone && <div className="text-xs text-[#71717A] font-mono">{user.phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-[#312F2C] text-white px-2.5 py-0.5 text-xs font-bold uppercase shadow-2xs">
                        {user.role || 'USER'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold border ${
                        user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        user.status === 'BANNED' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-xs font-bold">
                        <span className="text-indigo-600">{user._count.postedTasks}</span> Posted /{' '}
                        <span className="text-emerald-600">{user._count.assignedTasks}</span> Taken
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#71717A] font-mono font-medium">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(user.id)}
                          className="rounded-xl p-2 bg-[#F4F4F5] border border-[#E4E4E7] hover:bg-[#E4E4E7] text-[#18181B] transition-colors cursor-pointer shadow-2xs"
                          title="View Profile Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {user.status === 'ACTIVE' ? (
                          <button
                            onClick={() => {
                              setConfirmTarget({ id: user.id, name: user.fullName, status: 'BANNED' });
                              setConfirmOpen(true);
                            }}
                            className="rounded-xl p-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
                            title="Ban Account"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setConfirmTarget({ id: user.id, name: user.fullName, status: 'ACTIVE' });
                              setConfirmOpen(true);
                            }}
                            className="rounded-xl p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                            title="Activate Account"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#E4E4E7] px-6 py-4 bg-[#F4F4F5]">
            <div className="text-xs text-[#71717A] font-medium">
              Showing page <span className="font-bold text-[#18181B]">{page}</span> of{' '}
              <span className="font-bold text-[#18181B]">{totalPages}</span> ({total} entries)
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-xl border border-[#E4E4E7] bg-white p-2 text-[#18181B] hover:bg-[#E4E4E7] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-xl border border-[#E4E4E7] bg-white p-2 text-[#18181B] hover:bg-[#E4E4E7] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* User Details Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="User Profile Details"
      >
        {detailLoading ? (
          <div className="py-8 text-center text-zinc-500">Loading user info...</div>
        ) : !selectedUser ? (
          <div className="py-8 text-center text-zinc-500">Failed to load user details.</div>
        ) : (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0">
                <img
                  src={formatImageUrl(selectedUser.avatarUrl) || '/default-avatar.png'}
                  alt={`${selectedUser.fullName}'s Avatar`}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/default-avatar.png';
                  }}
                />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{selectedUser.fullName}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 uppercase text-zinc-400">
                    {selectedUser.role || 'USER'}
                  </span>
                </h4>
                <p className="text-sm text-zinc-400">{selectedUser.email}</p>
              </div>
            </div>

            {/* Profile Data */}
            <div className="grid grid-cols-2 gap-4 border-t border-b border-zinc-900 py-4 text-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <Phone className="h-4 w-4 text-indigo-500" />
                <span>{selectedUser.phone || 'No phone number'}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="h-4 w-4 text-indigo-500" />
                <span>Joined {new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Shield className="h-4 w-4 text-indigo-500" />
                <span className="capitalize">Status: <strong className="text-white">{selectedUser.status}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Wallet className="h-4 w-4 text-indigo-500" />
                <span>Wallet Balance: <strong className="text-emerald-400">{Number(selectedUser.wallet?.balance || 0).toLocaleString('vi-VN')} VND</strong></span>
              </div>
            </div>

            {/* Bio / Headline */}
            {(selectedUser.headline || selectedUser.bio) && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Bio & Headline</h5>
                {selectedUser.headline && <p className="text-sm font-semibold text-white">{selectedUser.headline}</p>}
                {selectedUser.bio && <p className="text-sm text-zinc-400 italic bg-zinc-900/30 p-3 rounded-lg border border-zinc-900">"{selectedUser.bio}"</p>}
              </div>
            )}

            {/* User's Posted Tasks Panel */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
                <span>Posted Tasks ({selectedUser.postedTasks?.length || 0})</span>
              </h5>
              
              {selectedUser.postedTasks && selectedUser.postedTasks.length > 0 ? (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {selectedUser.postedTasks.map((task: any) => (
                    <div 
                      key={task.id} 
                      onClick={() => {
                        setActiveTaskId(task.id);
                        setTaskDetailOpen(true);
                      }}
                      className="bg-zinc-900/35 border border-zinc-900 rounded-xl p-3 flex items-center justify-between hover:border-zinc-800 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-white truncate">{task.title}</div>
                        <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-2">
                          <span>{task.category?.name || 'No Category'}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-medium">
                            {task.budgetMin && task.budgetMax
                              ? `${Number(task.budgetMin).toLocaleString('vi-VN')} - ${Number(task.budgetMax).toLocaleString('vi-VN')} VND`
                              : task.budgetMin
                              ? `${Number(task.budgetMin).toLocaleString('vi-VN')} VND`
                              : 'Negotiable'}
                          </span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ml-3 shrink-0 ${
                        task.status === 'OPEN' ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40' :
                        task.status === 'IN_PROGRESS' ? 'bg-blue-950/40 text-blue-300 border-blue-800/40' :
                        task.status === 'COMPLETED' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                        task.status === 'CANCELLED' ? 'bg-red-950/40 text-red-300 border-red-800/40' :
                        'bg-zinc-800 text-zinc-400 border-zinc-700/60'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-zinc-500 text-xs italic bg-zinc-900/10 p-3 rounded border border-zinc-900">
                  <Info className="h-4 w-4 text-indigo-500" />
                  <span>This user has not posted any tasks.</span>
                </div>
              )}
            </div>

            {/* User's Taken Tasks Panel */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-emerald-400" />
                <span>Taken Tasks ({selectedUser.assignedTasks?.length || 0})</span>
              </h5>
              
              {selectedUser.assignedTasks && selectedUser.assignedTasks.length > 0 ? (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {selectedUser.assignedTasks.map((assignment: any) => {
                    const task = assignment.task;
                    if (!task) return null;
                    return (
                      <div 
                        key={assignment.id} 
                        onClick={() => {
                          setActiveTaskId(task.id);
                          setTaskDetailOpen(true);
                        }}
                        className="bg-zinc-900/35 border border-zinc-900 rounded-xl p-3 flex items-center justify-between hover:border-zinc-800 transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-xs text-white truncate">{task.title}</div>
                          <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-2">
                            <span>{task.category?.name || 'No Category'}</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-medium">
                              {task.budgetMin && task.budgetMax
                                ? `${Number(task.budgetMin).toLocaleString('vi-VN')} - ${Number(task.budgetMax).toLocaleString('vi-VN')} VND`
                                : task.budgetMin
                                ? `${Number(task.budgetMin).toLocaleString('vi-VN')} VND`
                                : 'Negotiable'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                            assignment.status === 'ACTIVE' || assignment.status === 'ASSIGNED' ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40' :
                            assignment.status === 'IN_PROGRESS' ? 'bg-blue-950/40 text-blue-300 border-blue-800/40' :
                            assignment.status === 'COMPLETED' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                            'bg-red-950/40 text-red-300 border-red-800/40'
                          }`}>
                            Work: {assignment.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-zinc-500 text-xs italic bg-zinc-900/10 p-3 rounded border border-zinc-900">
                  <Info className="h-4 w-4 text-indigo-500" />
                  <span>This user has not taken any tasks.</span>
                </div>
              )}
            </div>

            {/* Verifications Panel */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Identity Verifications</h5>
              {selectedUser.verifications && selectedUser.verifications.length > 0 ? (
                selectedUser.verifications.map((v: any, index: number) => (
                  <div key={index} className="bg-zinc-900/35 border border-zinc-900 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 border border-zinc-700/60 uppercase">{v.type}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                        v.status === 'APPROVED' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                        v.status === 'PENDING' ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' :
                        'bg-red-950/40 text-red-300 border-red-800/40'
                      }`}>
                        {v.status}
                      </span>
                    </div>

                    {/* OCR Details if CCCD */}
                    {v.type === 'CCCD' && v.ocrFullName && (
                      <div className="text-xs grid grid-cols-2 gap-2 bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-900 text-zinc-400">
                        <div>OCR Name: <strong className="text-white">{v.ocrFullName}</strong></div>
                        <div>CCCD Number Hash: <strong className="text-white truncate max-w-[100px] block">{v.ocrCccdNumberHash || 'N/A'}</strong></div>
                        <div>OCR DOB: <strong className="text-white">{v.ocrDob ? new Date(v.ocrDob).toLocaleDateString('vi-VN') : 'N/A'}</strong></div>
                      </div>
                    )}

                    {/* Document Images */}
                    {v.documents && v.documents.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        {v.documents[0].frontImageUrl && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Front Side</span>
                            <a href={formatImageUrl(v.documents[0].frontImageUrl)} target="_blank" rel="noreferrer" className="block relative aspect-video rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors">
                              <img src={formatImageUrl(v.documents[0].frontImageUrl)} alt="Front Document" className="object-cover w-full h-full" />
                            </a>
                          </div>
                        )}
                        {v.documents[0].backImageUrl && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Back Side</span>
                            <a href={formatImageUrl(v.documents[0].backImageUrl)} target="_blank" rel="noreferrer" className="block relative aspect-video rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors">
                              <img src={formatImageUrl(v.documents[0].backImageUrl)} alt="Back Document" className="object-cover w-full h-full" />
                            </a>
                          </div>
                        )}
                        {v.documents[0].selfieImageUrl && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Selfie Portrait</span>
                            <a href={formatImageUrl(v.documents[0].selfieImageUrl)} target="_blank" rel="noreferrer" className="block relative aspect-video rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors">
                              <img src={formatImageUrl(v.documents[0].selfieImageUrl)} alt="Selfie" className="object-cover w-full h-full" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 text-zinc-500 text-xs italic bg-zinc-900/10 p-3 rounded border border-zinc-900">
                  <Info className="h-4 w-4 text-indigo-500" />
                  <span>No verification documents submitted for this account.</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="border-t border-zinc-900 pt-4 flex gap-3">
              {selectedUser.status === 'ACTIVE' ? (
                <button
                  onClick={() => {
                    setConfirmTarget({ id: selectedUser.id, name: selectedUser.fullName, status: 'BANNED' });
                    setConfirmOpen(true);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer text-center"
                >
                  Ban Account
                </button>
              ) : (
                <button
                  onClick={() => {
                    setConfirmTarget({ id: selectedUser.id, name: selectedUser.fullName, status: 'ACTIVE' });
                    setConfirmOpen(true);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer text-center"
                >
                  Activate Account
                </button>
              )}
              <button
                onClick={() => setDetailModalOpen(false)}
                className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer text-center"
              >
                Close Panel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmOpen}
        isLoading={actionLoading}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
        onConfirm={async () => {
          if (!confirmTarget) return;
          await handleUpdateStatus(confirmTarget.id, confirmTarget.status);
        }}
        title={confirmTarget?.status === 'BANNED' ? 'Ban User Account' : 'Activate User Account'}
        description={
          confirmTarget
            ? confirmTarget.status === 'BANNED'
              ? `Are you sure you want to ban the user "${confirmTarget.name}"? They will lose access to administrative/user resources immediately.`
              : `Are you sure you want to activate the user "${confirmTarget.name}"? Their account status will be restored to ACTIVE.`
            : ''
        }
        confirmText={confirmTarget?.status === 'BANNED' ? 'Ban User' : 'Activate User'}
      />

      <TaskDetailModal 
        taskId={activeTaskId} 
        isOpen={taskDetailOpen} 
        onClose={() => {
          setActiveTaskId(null);
          setTaskDetailOpen(false);
        }} 
        onRefresh={() => {
          if (selectedUser) {
            handleViewDetails(selectedUser.id);
          }
        }} 
      />
    </div>
  );
}
