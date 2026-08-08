'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle,
  Info,
  Calendar,
  Mail,
  User
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

interface DeletionRequestItem {
  id: string;
  fullName: string;
  email: string;
  reason: string | null;
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  createdAt: string;
}

export default function DeletionsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<DeletionRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals / Dialogs state
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequestItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'APPROVE' | 'REJECT' | 'DELETE' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
      };
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get('/api/deletions', { params });
      const data = res.data;
      if (data.success) {
        setRequests(data.data.requests);
        setTotal(data.data.total);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch deletion requests.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const openConfirmation = (request: DeletionRequestItem, action: 'APPROVE' | 'REJECT' | 'DELETE') => {
    setSelectedRequest(request);
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const handleAction = async () => {
    if (!selectedRequest || !confirmAction) return;

    setActionLoading(true);
    try {
      if (confirmAction === 'DELETE') {
        const res = await apiClient.delete(`/api/deletions/${selectedRequest.id}`);
        if (res.data.success) {
          setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
          toast('Xóa log yêu cầu thành công!', 'success');
        }
      } else {
        const res = await apiClient.put(`/api/deletions/${selectedRequest.id}`, { action: confirmAction });
        if (res.data.success) {
          const newStatus = confirmAction === 'APPROVE' ? 'PROCESSED' : 'REJECTED';
          setRequests(prev => prev.map(r => r.id === selectedRequest.id ? { ...r, status: newStatus } : r));
          toast(`Đã ${confirmAction === 'APPROVE' ? 'Duyệt & Soft-Delete' : 'Từ chối'} yêu cầu thành công!`, 'success');
        }
      }
      setConfirmOpen(false);
      setSelectedRequest(null);
      setConfirmAction(null);
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Có lỗi xảy ra khi thực hiện tác vụ.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#18181B]">Yêu cầu Xóa tài khoản</h2>
        <p className="text-[#71717A] text-sm mt-1 font-medium">Quản lý và phê duyệt các yêu cầu xóa tài khoản từ xa do người dùng gửi từ trang web chính sách.</p>
      </div>

      {/* Filters Card */}
      <Card className="flex flex-col sm:flex-row gap-4 items-center bg-white border-[#E4E4E7] shadow-sm">
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl py-2 px-3 text-[#18181B] text-sm focus:outline-none focus:border-[#312F2C] transition-all font-semibold"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xử lý (PENDING)</option>
            <option value="PROCESSED">Đã duyệt (PROCESSED)</option>
            <option value="REJECTED">Đã từ chối (REJECTED)</option>
          </select>
        </div>
      </Card>

      {/* Data Table Card */}
      <Card className="overflow-hidden bg-white border-[#E4E4E7] shadow-sm p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#71717A]">
            <thead className="bg-[#F4F4F5] text-[11px] uppercase font-extrabold text-[#71717A] border-b border-[#E4E4E7]">
              <tr>
                <th className="px-6 py-3.5">Người yêu cầu</th>
                <th className="px-6 py-3.5">Thông tin liên hệ</th>
                <th className="px-6 py-3.5">Lý do</th>
                <th className="px-6 py-3.5">Ngày gửi</th>
                <th className="px-6 py-3.5 text-center">Trạng thái</th>
                <th className="px-6 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7] text-[#18181B]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-[#71717A] font-medium">Đang tải dữ liệu...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-rose-600 font-bold">{error}</p>
                      <button
                        onClick={fetchRequests}
                        className="px-4 py-2 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl hover:bg-[#E4E4E7] text-[#18181B] transition-colors cursor-pointer text-xs font-bold"
                      >
                        Tải lại
                      </button>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-[#71717A] font-medium">Không tìm thấy yêu cầu xóa tài khoản nào.</td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-6 py-4 font-bold text-[#18181B]">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-[#71717A]" />
                        <span>{request.fullName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5 text-xs text-[#71717A] font-mono">
                        <Mail className="h-3.5 w-3.5 text-[#71717A]" />
                        <span>{request.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate font-medium">
                      <span className="text-[#71717A] italic">
                        {request.reason || 'Không cung cấp lý do'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-medium">
                      <div className="flex items-center space-x-1 text-[#71717A]">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(request.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold border ${
                        request.status === 'PENDING' 
                          ? 'bg-amber-50 text-amber-800 border-amber-200' 
                          : request.status === 'PROCESSED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {request.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => openConfirmation(request, 'APPROVE')}
                              title="Duyệt yêu cầu & soft-delete user"
                              className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openConfirmation(request, 'REJECT')}
                              title="Từ chối yêu cầu"
                              className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openConfirmation(request, 'DELETE')}
                          title="Xóa bản ghi log này"
                          className="p-2 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] text-[#71717A] hover:bg-[#E4E4E7] hover:text-[#18181B] transition-all cursor-pointer shadow-2xs"
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

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-900 px-6 py-4 bg-zinc-950/20 text-zinc-400 text-xs sm:text-sm">
            <div>
              Hiển thị từ <span className="font-semibold text-white">{((page - 1) * limit) + 1}</span> đến <span className="font-semibold text-white">{Math.min(page * limit, total)}</span> trong số <span className="font-semibold text-white">{total}</span> yêu cầu.
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-xl border border-zinc-850 hover:bg-zinc-900 disabled:opacity-50 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-xl border border-zinc-850 hover:bg-zinc-900 disabled:opacity-50 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmOpen}
        onClose={() => {
          if (!actionLoading) {
            setConfirmOpen(false);
            setSelectedRequest(null);
            setConfirmAction(null);
          }
        }}
        onConfirm={handleAction}
        title={
          confirmAction === 'APPROVE' 
            ? 'Xác nhận Duyệt yêu cầu xóa?' 
            : confirmAction === 'REJECT'
              ? 'Xác nhận Từ chối yêu cầu?'
              : 'Xác nhận Xóa bản ghi yêu cầu?'
        }
        description={
          confirmAction === 'APPROVE'
            ? `Hành động này sẽ duyệt yêu cầu của ${selectedRequest?.fullName}. Đồng thời, nếu người dùng này có tài khoản trong hệ thống, họ sẽ bị BANNED và vô danh hóa thông tin cá nhân. Bạn có chắc chắn muốn tiếp tục?`
            : confirmAction === 'REJECT'
              ? `Yêu cầu của ${selectedRequest?.fullName} sẽ được đánh dấu là REJECTED. Bạn có chắc chắn muốn tiếp tục?`
              : `Bản ghi yêu cầu này sẽ bị xóa vĩnh viễn khỏi danh sách quản lý của admin. Bạn có chắc chắn?`
        }
        confirmText={
          confirmAction === 'DELETE' 
            ? 'Xóa' 
            : confirmAction === 'APPROVE' 
              ? 'Duyệt & Soft-Delete' 
              : 'Từ chối'
        }
        cancelText="Hủy"
        isLoading={actionLoading}
      />
    </div>
  );
}
