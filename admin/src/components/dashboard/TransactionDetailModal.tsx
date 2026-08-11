'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { 
  RawEscrowItem, 
  calculateEscrowFinancials, 
  formatCurrencyVND 
} from '@/lib/financial-math';
import { 
  FileText, 
  User, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  RotateCcw, 
  ShieldCheck, 
  ArrowRight,
  CreditCard,
  Briefcase
} from 'lucide-react';

interface TransactionDetailModalProps {
  escrow: RawEscrowItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionDetailModal({ escrow, isOpen, onClose }: TransactionDetailModalProps) {
  if (!escrow) return null;

  const calc = calculateEscrowFinancials(escrow);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chi Tiết Giao Dịch & Khấu Trừ Phí Nền Tảng"
    >
      <div className="space-y-6 text-sm text-[#18181B]">
        {/* Header Badge & ID */}
        <div className="p-4 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-[#71717A] tracking-wider">MÃ GIAO DỊCH (ID)</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold border ${
              calc.status === 'HOLDING' ? 'bg-amber-100 text-amber-900 border-amber-300' :
              calc.status === 'RELEASED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
              'bg-rose-100 text-rose-900 border-rose-300'
            }`}>
              {calc.status === 'HOLDING' && <Clock className="h-3.5 w-3.5 text-amber-700" />}
              {calc.status === 'RELEASED' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />}
              {calc.status === 'REFUNDED' && <RotateCcw className="h-3.5 w-3.5 text-rose-700" />}
              {calc.status}
            </span>
          </div>
          <p className="font-mono text-sm font-bold text-[#18181B] break-all">{calc.id}</p>
        </div>

        {/* Task & Contract Info */}
        <div className="space-y-2">
          <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#312F2C] flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-indigo-600" />
            <span>Công việc liên quan</span>
          </h5>
          <div className="p-3.5 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] font-bold text-[#18181B]">
            {calc.taskTitle}
          </div>
        </div>

        {/* Parties Involved */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Poster */}
          <div className="p-3.5 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] space-y-1">
            <div className="text-[10px] font-extrabold uppercase text-[#71717A] flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-blue-600" /> Người Thuê (Poster)
            </div>
            <p className="font-extrabold text-[#18181B]">{calc.posterName}</p>
            <p className="text-xs text-[#71717A] font-semibold">{calc.posterEmail}</p>
          </div>

          {/* Tasker */}
          <div className="p-3.5 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] space-y-1">
            <div className="text-[10px] font-extrabold uppercase text-[#71717A] flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-emerald-600" /> Người Làm (Tasker)
            </div>
            <p className="font-extrabold text-[#18181B]">{calc.taskerName}</p>
            <p className="text-xs text-[#71717A] font-semibold">{calc.taskerEmail}</p>
          </div>
        </div>

        {/* Financial Reconciliation Breakdown Card */}
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
          <h5 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-amber-700" />
            <span>Hạch Toán Phân Bổ Dòng Tiền</span>
          </h5>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-amber-200/80">
              <span className="text-[#71717A] font-bold">1. Tổng Hợp Đồng (Gross GMV 100%):</span>
              <span className="font-extrabold text-[#18181B] text-sm">{formatCurrencyVND(calc.grossAmount)}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-amber-200/80 text-amber-900">
              <span className="font-bold flex items-center gap-1">
                2. Phí Nền Tảng SnapOn (8%):
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-extrabold">Thu nhập Admin</span>
              </span>
              <span className="font-black text-amber-800 text-sm">+{formatCurrencyVND(calc.platformFee)}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 text-emerald-900">
              <span className="font-bold flex items-center gap-1">
                3. Thực Nhận Người Làm (92%):
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-extrabold">Net Tasker Payout</span>
              </span>
              <span className="font-black text-emerald-800 text-sm">{formatCurrencyVND(calc.taskerNet)}</span>
            </div>
          </div>
        </div>

        {/* Settlement Method & Timestamps */}
        <div className="p-3.5 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#71717A] font-bold flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5 text-[#312F2C]" /> Phương thức đối soát:
            </span>
            <span className="font-extrabold text-[#18181B] bg-white border border-[#E4E4E7] px-2.5 py-0.5 rounded-lg">
              Ví Nội Bộ SnapOn / PayOS VietQR
            </span>
          </div>

          {calc.createdAt && (
            <div className="flex items-center justify-between">
              <span className="text-[#71717A] font-bold">Ngày khởi tạo:</span>
              <span className="font-extrabold text-[#18181B]">{calc.createdAt.toLocaleDateString('vi-VN')} {calc.createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>

        {/* Lifecycle Stepper */}
        <div className="p-3.5 rounded-xl bg-white border border-[#E4E4E7] space-y-2">
          <div className="text-[11px] font-extrabold uppercase text-[#312F2C]">Vòng đời giao dịch (Lifecycle)</div>
          <div className="flex items-center justify-between text-[11px] font-bold text-[#71717A] bg-[#F4F4F5] p-2.5 rounded-lg">
            <span>Ký quỹ (Hold)</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#71717A]" />
            <span>Thực hiện Task</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#71717A]" />
            <span className={calc.status === 'RELEASED' ? 'text-emerald-700 font-extrabold' : ''}>
              {calc.status === 'RELEASED' ? 'Đã Giải Ngân (92%)' : calc.status === 'REFUNDED' ? 'Đã Hoàn Tiền' : 'Đang Tạm Giữ'}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#E4E4E7] pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#312F2C] hover:bg-[#18181B] text-white font-extrabold py-2.5 px-6 rounded-xl text-sm transition-colors cursor-pointer shadow-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
}
