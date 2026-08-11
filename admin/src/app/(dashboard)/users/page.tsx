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
        <h2 className="text-3xl font-extrabold tracking-tight text-[#18181B]">Quản Lý Người Dùng</h2>
        <p className="text-[#71717A] text-sm mt-1 font-medium">Quản lý danh sách tài khoản, trạng thái hoạt động, khóa/mở khóa tài khoản và chi tiết ví người dùng.</p>
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
            placeholder="Tìm kiếm theo tên, gmail, sđt..."
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
            className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl py-2 px-3 text-[#18181B] text-sm focus:outline-none focus:border-[#312F2C] transition-all font-semibold cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động (ACTIVE)</option>
            <option value="BANNED">Bị khóa (BANNED)</option>
            <option value="SUSPENDED">Tạm ngưng (SUSPENDED)</option>
          </select>
        </div>
      </Card>

      {/* Data Table Card */}
      <Card className="overflow-hidden bg-white border-[#E4E4E7] shadow-sm p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#71717A]">
            <thead className="bg-[#312F2C] text-white text-[11px] uppercase font-extrabold tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Thông Tin Người Dùng</th>
                <th className="px-6 py-3.5">Vai Trò</th>
                <th className="px-6 py-3.5">Trạng Thái</th>
                <th className="px-6 py-3.5 text-center">Công Việc</th>
                <th className="px-6 py-3.5">Ngày Tham Gia</th>
                <th className="px-6 py-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7] text-[#18181B]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-[#71717A] font-medium">
                    Đang tải danh sách người dùng...
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
                        Tải lại
                      </button>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-[#71717A] font-medium">
                    Không tìm thấy người dùng phù hợp.
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
                        user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                        user.status === 'BANNED' ? 'bg-rose-100 text-rose-900 border-rose-300' :
                        'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-xs font-bold">
                        <span className="text-indigo-600">{user._count.postedTasks}</span> Đăng /{' '}
                        <span className="text-emerald-600">{user._count.assignedTasks}</span> Nhận
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
                          title="Xem Chi Tiết Hồ Sơ"
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
                            title="Khóa Tài Khoản"
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
                            title="Mở Khóa Tài Khoản"
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
              Trang <span className="font-bold text-[#18181B]">{page}</span> /{' '}
              <span className="font-bold text-[#18181B]">{totalPages}</span> (Tổng {total} người dùng)
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
        title="Chi Tiết Hồ Sơ Người Dùng"
      >
        {detailLoading ? (
          <div className="py-8 text-center text-[#71717A] font-semibold">Đang tải thông tin người dùng...</div>
        ) : !selectedUser ? (
          <div className="py-8 text-center text-[#71717A] font-semibold">Không thể tải chi tiết người dùng.</div>
        ) : (
          <div className="space-y-6 text-sm text-[#18181B]">
            {/* Header info */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden border border-[#E4E4E7] bg-[#F4F4F5] shrink-0">
                <img
                  src={formatImageUrl(selectedUser.avatarUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedUser.fullName || 'User')}`}
                  alt={`${selectedUser.fullName}'s Avatar`}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedUser.fullName || 'User')}`;
                  }}
                />
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-[#18181B] flex items-center gap-2">
                  <span>{selectedUser.fullName}</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#312F2C] uppercase text-white shadow-2xs">
                    {selectedUser.role || 'USER'}
                  </span>
                </h4>
                <p className="text-xs font-mono text-[#71717A] font-semibold mt-0.5">{selectedUser.email}</p>
              </div>
            </div>

            {/* Profile Data Grid */}
            <div className="grid grid-cols-3 gap-3 bg-[#F4F4F5] p-3.5 rounded-xl border border-[#E4E4E7] text-xs">
              <div className="flex items-center gap-2 text-[#71717A] font-semibold">
                <Phone className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="text-[#18181B] font-bold">{selectedUser.phone || 'Chưa cập nhật SĐT'}</span>
              </div>
              <div className="flex items-center gap-2 text-[#71717A] font-semibold">
                <Calendar className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Tham gia: <strong className="text-[#18181B]">{new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-[#71717A] font-semibold">
                <Shield className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Trạng thái: <strong className="text-[#18181B]">{selectedUser.status}</strong></span>
              </div>
            </div>

            {/* Wallet & PayOS Deposit Log Section */}
            <div className="space-y-3">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#312F2C] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  <span>Chi Tiết Ví SnapOn & Lịch Sử Nạp Tiền PayOS</span>
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold px-2 py-0.5 rounded-full uppercase">
                  PayOS Linked
                </span>
              </h5>

              {/* Wallet Balances Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-[10px] font-extrabold uppercase text-emerald-800">Số Dư Khả Dụng</div>
                  <div className="text-base font-black text-emerald-900 mt-0.5">
                    {Number(selectedUser.wallet?.availableBalance || selectedUser.wallet?.balance || 0).toLocaleString('vi-VN')} <span className="text-xs font-bold text-emerald-700">đ</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                  <div className="text-[10px] font-extrabold uppercase text-amber-800">Đóng Băng Ký Quỹ</div>
                  <div className="text-base font-black text-amber-900 mt-0.5">
                    {Number(selectedUser.wallet?.lockedBalance || 0).toLocaleString('vi-VN')} <span className="text-xs font-bold text-amber-700">đ</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7]">
                  <div className="text-[10px] font-extrabold uppercase text-[#71717A]">Tổng Số Dư Ví</div>
                  <div className="text-base font-black text-[#18181B] mt-0.5">
                    {Number(selectedUser.wallet?.balance || 0).toLocaleString('vi-VN')} <span className="text-xs font-bold text-[#71717A]">đ</span>
                  </div>
                </div>
              </div>

              {/* Wallet Transactions Table (PayOS & Wallet Events) */}
              <div className="overflow-x-auto rounded-xl border border-[#E4E4E7]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#312F2C] text-white text-[10px] uppercase font-extrabold tracking-wider">
                    <tr>
                      <th className="px-3 py-2">Loại Giao Dịch</th>
                      <th className="px-3 py-2">Mã PayOS Order</th>
                      <th className="px-3 py-2 text-right">Số Tiền</th>
                      <th className="px-3 py-2 text-center">Trạng Thái</th>
                      <th className="px-3 py-2 text-right">Thời Gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7] font-medium text-[#18181B] bg-white">
                    {!selectedUser.wallet?.transactions || selectedUser.wallet.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-[#71717A] text-xs font-semibold bg-[#FAFAFA]">
                          Chưa có lịch sử giao dịch ví / nạp tiền PayOS.
                        </td>
                      </tr>
                    ) : (
                      selectedUser.wallet.transactions.map((tx: any) => {
                        const isDeposit = tx.type === 'DEPOSIT' || tx.type === 'ESCROW_RELEASE' || tx.type === 'REFUND';
                        return (
                          <tr key={tx.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                                tx.type === 'DEPOSIT' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                                tx.type === 'ESCROW_RELEASE' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                                tx.type === 'ESCROW_HOLD' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                'bg-purple-100 text-purple-900 border border-purple-300'
                              }`}>
                                {tx.type === 'DEPOSIT' ? 'Nạp Tiền PayOS' :
                                 tx.type === 'ESCROW_HOLD' ? 'Ký Quỹ Task' :
                                 tx.type === 'ESCROW_RELEASE' ? 'Thực Nhận 92%' : tx.type}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-[#71717A] font-bold">
                              {tx.order_code ? `#${tx.order_code.toString()}` : 'Ví Nội Bộ'}
                            </td>
                            <td className={`px-3 py-2.5 text-right font-black ${isDeposit ? 'text-emerald-700' : 'text-amber-800'}`}>
                              {isDeposit ? '+' : '-'}{Number(tx.amount || 0).toLocaleString('vi-VN')} đ
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                {tx.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-[10px] text-[#71717A]">
                              {new Date(tx.created_at || tx.createdAt).toLocaleDateString('vi-VN')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bio / Headline */}
            {(selectedUser.headline || selectedUser.bio) && (
              <div className="space-y-2">
                <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#312F2C]">Tiểu Sử & Giới Thiệu</h5>
                {selectedUser.headline && <p className="text-sm font-bold text-[#18181B]">{selectedUser.headline}</p>}
                {selectedUser.bio && <p className="text-xs text-[#18181B] font-medium italic bg-[#F4F4F5] p-3 rounded-xl border border-[#E4E4E7]">"{selectedUser.bio}"</p>}
              </div>
            )}

            {/* User's Posted Tasks Panel */}
            <div className="space-y-3">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#312F2C] flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-indigo-600" />
                <span>Công Việc Đã Đăng ({selectedUser.postedTasks?.length || 0})</span>
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
                      className="bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl p-3 flex items-center justify-between hover:border-[#312F2C] transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-[#18181B] truncate">{task.title}</div>
                        <div className="text-[10px] text-[#71717A] mt-1 flex items-center gap-2 font-medium">
                          <span>{task.category?.name || 'Chung'}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">
                            {task.budgetMin && task.budgetMax
                              ? `${Number(task.budgetMin).toLocaleString('vi-VN')} - ${Number(task.budgetMax).toLocaleString('vi-VN')} VNĐ`
                              : task.budgetMin
                              ? `${Number(task.budgetMin).toLocaleString('vi-VN')} VNĐ`
                              : 'Thỏa thuận'}
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-md bg-[#312F2C] text-white px-2 py-0.5 text-[10px] font-bold uppercase ml-3 shrink-0">
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[#71717A] text-xs font-medium bg-[#F4F4F5] p-3 rounded-xl border border-[#E4E4E7]">
                  <Info className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Người dùng chưa đăng bài tuyển dụng nào.</span>
                </div>
              )}
            </div>

            {/* User's Taken Tasks Panel */}
            <div className="space-y-3">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#312F2C] flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-emerald-600" />
                <span>Công Việc Đã Nhận ({selectedUser.assignedTasks?.length || 0})</span>
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
                        className="bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl p-3 flex items-center justify-between hover:border-[#312F2C] transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-[#18181B] truncate">{task.title}</div>
                          <div className="text-[10px] text-[#71717A] mt-1 flex items-center gap-2 font-medium">
                            <span>{task.category?.name || 'Chung'}</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">
                              {task.budgetMin && task.budgetMax
                                ? `${Number(task.budgetMin).toLocaleString('vi-VN')} - ${Number(task.budgetMax).toLocaleString('vi-VN')} VNĐ`
                                : task.budgetMin
                                ? `${Number(task.budgetMin).toLocaleString('vi-VN')} VNĐ`
                                : 'Thỏa thuận'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="inline-flex items-center rounded-md bg-[#312F2C] text-white px-2 py-0.5 text-[10px] font-bold uppercase">
                            {assignment.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[#71717A] text-xs font-medium bg-[#F4F4F5] p-3 rounded-xl border border-[#E4E4E7]">
                  <Info className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Người dùng chưa ứng tuyển nhận việc nào.</span>
                </div>
              )}
            </div>

            {/* Verifications Panel */}
            <div className="space-y-3">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#312F2C]">Xác Thực Danh Tính</h5>
              {selectedUser.verifications && selectedUser.verifications.length > 0 ? (
                selectedUser.verifications.map((v: any, index: number) => (
                  <div key={index} className="bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold bg-[#312F2C] text-white px-2.5 py-0.5 rounded uppercase">{v.type}</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                        v.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                        v.status === 'PENDING' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                        'bg-rose-100 text-rose-900 border-rose-300'
                      }`}>
                        {v.status}
                      </span>
                    </div>

                    {/* OCR Details if CCCD */}
                    {v.type === 'CCCD' && v.ocrFullName && (
                      <div className="text-xs grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-[#E4E4E7] text-[#71717A]">
                        <div>Họ tên OCR: <strong className="text-[#18181B]">{v.ocrFullName}</strong></div>
                        <div>Mã CCCD: <strong className="text-[#18181B] truncate max-w-[100px] block">{v.ocrCccdNumberHash || 'N/A'}</strong></div>
                        <div>Ngày sinh OCR: <strong className="text-[#18181B]">{v.ocrDob ? new Date(v.ocrDob).toLocaleDateString('vi-VN') : 'N/A'}</strong></div>
                      </div>
                    )}

                    {/* Document Images */}
                    {v.documents && v.documents.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        {v.documents[0].frontImageUrl && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-[#71717A] uppercase font-bold">Mặt trước CCCD</span>
                            <a href={formatImageUrl(v.documents[0].frontImageUrl)} target="_blank" rel="noreferrer" className="block relative aspect-video rounded-lg overflow-hidden border border-[#E4E4E7] bg-white hover:border-[#312F2C] transition-colors">
                              <img src={formatImageUrl(v.documents[0].frontImageUrl)} alt="Front Document" className="object-cover w-full h-full" />
                            </a>
                          </div>
                        )}
                        {v.documents[0].backImageUrl && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-[#71717A] uppercase font-bold">Mặt sau CCCD</span>
                            <a href={formatImageUrl(v.documents[0].backImageUrl)} target="_blank" rel="noreferrer" className="block relative aspect-video rounded-lg overflow-hidden border border-[#E4E4E7] bg-white hover:border-[#312F2C] transition-colors">
                              <img src={formatImageUrl(v.documents[0].backImageUrl)} alt="Back Document" className="object-cover w-full h-full" />
                            </a>
                          </div>
                        )}
                        {v.documents[0].selfieImageUrl && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-[#71717A] uppercase font-bold">Ảnh Chân Dung Selfie</span>
                            <a href={formatImageUrl(v.documents[0].selfieImageUrl)} target="_blank" rel="noreferrer" className="block relative aspect-video rounded-lg overflow-hidden border border-[#E4E4E7] bg-white hover:border-[#312F2C] transition-colors">
                              <img src={formatImageUrl(v.documents[0].selfieImageUrl)} alt="Selfie" className="object-cover w-full h-full" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 text-[#71717A] text-xs font-medium bg-[#F4F4F5] p-3 rounded-xl border border-[#E4E4E7]">
                  <Info className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Chưa gửi hồ sơ xác thực danh tính.</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="border-t border-[#E4E4E7] pt-4 flex gap-3">
              {selectedUser.status === 'ACTIVE' ? (
                <button
                  onClick={() => {
                    setConfirmTarget({ id: selectedUser.id, name: selectedUser.fullName, status: 'BANNED' });
                    setConfirmOpen(true);
                  }}
                  className="flex-1 bg-rose-700 hover:bg-rose-800 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer text-center shadow-sm"
                >
                  Khóa Tài Khoản
                </button>
              ) : (
                <button
                  onClick={() => {
                    setConfirmTarget({ id: selectedUser.id, name: selectedUser.fullName, status: 'ACTIVE' });
                    setConfirmOpen(true);
                  }}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer text-center shadow-sm"
                >
                  Kích Hoạt Tài Khoản
                </button>
              )}
              <button
                onClick={() => setDetailModalOpen(false)}
                className="flex-1 bg-[#312F2C] hover:bg-[#18181B] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer text-center shadow-sm"
              >
                Đóng
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
