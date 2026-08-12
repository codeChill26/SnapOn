'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { formatImageUrl } from '@/lib/image-utils';
import { 
  DollarSign, 
  User, 
  MapPin, 
  Wallet, 
  Info, 
  Briefcase 
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

interface TaskDetailModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function TaskDetailModal({ taskId, isOpen, onClose, onRefresh }: TaskDetailModalProps) {
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Cancel flow state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Delete flow state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails(taskId);
    } else {
      setSelectedTask(null);
    }
  }, [isOpen, taskId]);

  const fetchTaskDetails = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await apiClient.get(`/api/tasks/${id}`);
      const data = res.data;
      if (data.success) {
        setSelectedTask(data.data);
      }
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to load task details.', 'error');
      onClose();
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenCancel = () => {
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
        onClose();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      setCancelError(err.message || 'Operation failed');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const executeDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await apiClient.delete(`/api/tasks/${selectedTask.id}`);
      const data = res.data;
      if (data.success) {
        toast('Task permanently deleted from the database.', 'success');
        setDeleteConfirmOpen(false);
        onClose();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to delete task.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Chi Tiết Công Việc"
      >
        {detailLoading ? (
          <div className="py-8 text-center text-[#71717A] font-semibold">Đang tải chi tiết công việc...</div>
        ) : !selectedTask ? (
          <div className="py-8 text-center text-[#71717A] font-semibold">Không thể tải thông tin công việc.</div>
        ) : (
          <div className="space-y-6 text-sm text-[#18181B]">
            {/* Title & Badges */}
            <div>
              <h4 className="text-xl font-extrabold text-[#18181B] leading-tight">{selectedTask.title}</h4>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className="text-xs font-bold px-3 py-1 bg-[#312F2C] text-white rounded-lg uppercase shadow-2xs">
                  {selectedTask.taskType}
                </span>
                <span className="text-xs font-bold px-3 py-1 bg-[#312F2C] text-white rounded-lg uppercase shadow-2xs">
                  {selectedTask.category?.name || 'Chung'}
                </span>
                <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-extrabold border ${
                  selectedTask.status === 'OPEN' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  selectedTask.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                  selectedTask.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                  'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {selectedTask.status === 'OPEN' ? 'ĐANG MỞ' : selectedTask.status === 'IN_PROGRESS' ? 'ĐANG LÀM' : selectedTask.status === 'COMPLETED' ? 'ĐÃ XONG' : selectedTask.status}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#312F2C]">Mô tả công việc</h5>
              <p className="text-[#18181B] font-medium leading-relaxed bg-[#F4F4F5] p-3.5 rounded-xl border border-[#E4E4E7] whitespace-pre-wrap">
                {selectedTask.description || 'Không có mô tả.'}
              </p>
            </div>

            {/* Task Image Gallery */}
            {selectedTask.images && selectedTask.images.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#312F2C]">Hình ảnh & Tệp đính kèm</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedTask.images.map((img: string, idx: number) => (
                    <a
                      key={idx}
                      href={formatImageUrl(img)}
                      target="_blank"
                      rel="noreferrer"
                      className="block relative aspect-square rounded-xl overflow-hidden border border-[#E4E4E7] bg-[#F4F4F5] hover:border-[#312F2C] transition-colors shadow-2xs"
                    >
                      <Image
                        src={formatImageUrl(img)}
                        fill
                        alt={`Ảnh đính kèm ${idx + 1}`}
                        className="object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 border-t border-b border-[#E4E4E7] py-4">
              <div className="space-y-1">
                <div className="text-[11px] text-[#71717A] uppercase font-bold">Ngân sách dự kiến</div>
                <div className="font-extrabold text-emerald-700 flex items-center gap-1 text-base">
                  <DollarSign className="h-4.5 w-4.5 text-emerald-600" />
                  <span>
                    {selectedTask.budgetMin ? `${Number(selectedTask.budgetMin).toLocaleString('vi-VN')} VND` : '0'}
                    {selectedTask.budgetMax ? ` - ${Number(selectedTask.budgetMax).toLocaleString('vi-VN')} VND` : ''}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-[#71717A] uppercase font-bold">Giá chốt nhận việc</div>
                <div className="font-extrabold text-[#18181B] text-base">
                  {selectedTask.finalPrice ? `${Number(selectedTask.finalPrice).toLocaleString('vi-VN')} VND` : 'Chưa chốt giá'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-[#71717A] uppercase font-bold">Hình thức làm việc</div>
                <div className="text-[#18181B] font-bold text-sm">
                  {selectedTask.employmentType} ({selectedTask.salaryUnit})
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-[#71717A] uppercase font-bold">Có bảo hiểm</div>
                <div className="text-[#18181B] font-bold text-sm">
                  {selectedTask.allowInsurance ? 'Có' : 'Không'}
                </div>
              </div>
            </div>

            {/* Required Skills */}
            <div className="space-y-2">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#312F2C]">Kỹ năng yêu cầu</h5>
              <div className="flex flex-wrap gap-2">
                {selectedTask.requiredSkills && selectedTask.requiredSkills.length > 0 ? (
                  selectedTask.requiredSkills.map((rs: any) => (
                    <span key={rs.skill.id} className="rounded-lg bg-[#312F2C] px-3 py-1 text-xs font-bold text-white shadow-2xs">
                      {rs.skill.name}
                    </span>
                  ))
                ) : (
                  <span className="text-[#71717A] text-xs italic font-medium">Không yêu cầu kỹ năng đặc thù</span>
                )}
              </div>
            </div>

            {/* Poster Details */}
            <div className="space-y-2 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl p-4">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#312F2C] flex items-center gap-1.5">
                <User className="h-4 w-4 text-indigo-600" />
                <span>Thông tin Người đăng tuyển</span>
              </h5>
              <div className="flex justify-between items-center text-sm">
                <div>
                  <div className="font-extrabold text-[#18181B] text-base">{selectedTask.poster.fullName}</div>
                  <div className="text-xs text-[#71717A] font-semibold mt-0.5">{selectedTask.poster.email}</div>
                </div>
                <div className="text-xs text-[#18181B] font-bold bg-white px-3 py-1 rounded-lg border border-[#E4E4E7]">
                  SĐT: {selectedTask.poster.phone || 'Chưa cập nhật'}
                </div>
              </div>
            </div>

            {/* Locations */}
            {selectedTask.locations && selectedTask.locations.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#312F2C] flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-rose-600" />
                  <span>Địa điểm thực hiện</span>
                </h5>
                <p className="text-[#18181B] font-semibold text-xs bg-[#F4F4F5] p-3 rounded-xl border border-[#E4E4E7]">{selectedTask.locations[0].address || 'Chưa có thông tin địa chỉ'}</p>
              </div>
            )}

            {/* Assigned Workers Section */}
            <div className="space-y-3">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#312F2C] flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-indigo-600" />
                <span>Người nhận việc được giao</span>
              </h5>
              
              {selectedTask.assignedTask && selectedTask.assignedTask.length > 0 ? (
                <div className="space-y-3">
                  {selectedTask.assignedTask.map((assignment: any) => {
                    const worker = assignment.tasker;
                    const bidPrice = assignment.application?.bidPrice;
                    const acceptedDate = selectedTask.updatedAt 
                      ? new Date(selectedTask.updatedAt).toLocaleDateString('vi-VN')
                      : 'Chưa có';
                    const isCompleted = assignment.status === 'COMPLETED' ? 'Có' : 'Chưa';

                    return (
                      <div key={assignment.id} className="bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full overflow-hidden border border-[#E4E4E7] bg-white shrink-0 shadow-2xs">
                            <img
                              src={formatImageUrl(worker.avatarUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(worker.fullName || 'User')}`}
                              alt={`${worker.fullName}'s Avatar`}
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(worker.fullName || 'User')}`;
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold text-[#18181B] flex items-center gap-2">
                              <span>{worker.fullName}</span>
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                assignment.status === 'ACTIVE' || assignment.status === 'ASSIGNED' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                assignment.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                assignment.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {assignment.status}
                              </span>
                            </div>
                            <div className="text-xs text-[#71717A] font-semibold mt-0.5">{worker.email}</div>
                            <div className="text-xs text-[#71717A] font-medium">{worker.phone || 'Chưa có SĐT'}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-[#E4E4E7] text-[11px] text-[#71717A]">
                          <div>
                            <span className="text-[#71717A] font-semibold block">Giá ứng tuyển</span>
                            <span className="text-[#18181B] font-extrabold">
                              {bidPrice ? `${Number(bidPrice).toLocaleString('vi-VN')} VND` : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#71717A] font-semibold block">Ngày nhận việc</span>
                            <span className="text-[#18181B] font-bold">{acceptedDate}</span>
                          </div>
                          <div>
                            <span className="text-[#71717A] font-semibold block">Hoàn thành</span>
                            <span className={`${isCompleted === 'Có' ? 'text-emerald-700 font-extrabold' : 'text-[#71717A] font-bold'}`}>
                              {isCompleted}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[#71717A] text-xs font-semibold bg-[#F4F4F5] p-3.5 rounded-xl border border-[#E4E4E7]">
                  <Info className="h-4 w-4 text-indigo-600" />
                  <span>Chưa có người nhận việc nào được giao.</span>
                </div>
              )}
            </div>

            {/* Escrow details */}
            {selectedTask.escrow && (
              <div className="space-y-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900">
                <h5 className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Wallet className="h-4 w-4" />
                  <span>Giao dịch Ký quỹ Escrow</span>
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                  <div>Số tiền ký quỹ: <strong className="text-[#18181B] font-extrabold">{Number(selectedTask.escrow.amount).toLocaleString('vi-VN')} VND</strong></div>
                  <div>Phí nền tảng (8%): <strong className="text-[#18181B] font-extrabold">{Number(selectedTask.escrow.platformFeeAmount).toLocaleString('vi-VN')} VND</strong></div>
                  <div>Phí bảo hiểm: <strong className="text-[#18181B] font-extrabold">{Number(selectedTask.escrow.insuranceFeeAmount).toLocaleString('vi-VN')} VND</strong></div>
                  <div>Trạng thái Escrow: <strong className="text-emerald-700 font-extrabold uppercase">{selectedTask.escrow.status}</strong></div>
                </div>
              </div>
            )}

            {/* Cancel Details */}
            {selectedTask.status === 'CANCELLED' && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
                <Info className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900 font-medium">
                  <p className="font-extrabold text-rose-800 text-sm">Công việc đã bị Hủy bởi Quản trị viên</p>
                  <p className="mt-1">Lý do: "{selectedTask.closed_reason || 'Không có chi tiết lý do'}"</p>
                  {selectedTask.users_tasks_closed_by_idTousers && (
                    <p className="mt-1 text-[11px] text-rose-700 font-bold">Người xử lý: {selectedTask.users_tasks_closed_by_idTousers.fullName}</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-[#E4E4E7] pt-4 flex gap-3">
              {selectedTask.status !== 'CANCELLED' && selectedTask.status !== 'COMPLETED' && (
                <button
                  onClick={handleOpenCancel}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer text-center shadow-sm"
                >
                  Hủy Công Việc
                </button>
              )}
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="bg-rose-700 hover:bg-rose-800 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all cursor-pointer text-center shadow-sm"
              >
                Xóa vĩnh viễn
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-[#312F2C] hover:bg-[#18181B] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer text-center shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Reason Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Xác Nhận Hủy Công Việc"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4 text-sm text-[#18181B]">
          {cancelError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold">
              {cancelError}
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-start gap-2">
            <Info className="h-4.5 w-4.5 text-amber-700 shrink-0 mt-0.5" />
            <span className="text-xs font-semibold">
              Hủy công việc sẽ chuyển trạng thái sang <strong>CANCELLED</strong>. Thao tác này sẽ được lưu nhật ký.
            </span>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#312F2C] mb-2">
              Lý do hủy công việc
            </label>
            <textarea
              required
              rows={4}
              placeholder="Nhập lý do chi tiết hủy công việc này (ví dụ: vi phạm chính sách, thông tin rác, người dùng yêu cầu)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl py-2.5 px-3 text-[#18181B] placeholder-[#71717A] focus:outline-none focus:border-[#312F2C] transition-all text-sm font-semibold"
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-[#E4E4E7]">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="flex-1 bg-[#F4F4F5] border border-[#E4E4E7] hover:bg-[#E4E4E7] py-2.5 px-4 rounded-xl font-bold text-[#312F2C] transition-colors cursor-pointer"
            >
              Quay lại
            </button>
            <button
              type="submit"
              disabled={cancelSubmitting}
              className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 py-2.5 px-4 rounded-xl font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {cancelSubmitting ? 'Đang xử lý...' : 'Xác nhận Hủy'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        isLoading={deleteLoading}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Xóa Vĩnh Viễn Công Việc"
        description={selectedTask ? `Bạn có chắc chắn muốn xóa vĩnh viễn công việc "${selectedTask.title}"? Thao tác này sẽ xóa mọi đề xuất, ứng tuyển, địa chỉ và lịch sử liên quan. Thao tác này không thể hoàn tác.` : ''}
        confirmText="Xác nhận Xóa"
      />
    </>
  );
}
