'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { 
  RawEscrowItem, 
  calculateEscrowFinancials, 
  calculateAggregateFinancials, 
  formatCurrencyVND 
} from '@/lib/financial-math';
import TransactionDetailModal from '@/components/dashboard/TransactionDetailModal';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  ShieldCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  Calendar,
  Eye,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

interface FinancialLedgerPanelProps {
  escrows: RawEscrowItem[];
}

type TimeRangeOption = 'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'THIS_MONTH';

export default function FinancialLedgerPanel({ escrows }: FinancialLedgerPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('ALL');
  const [selectedEscrow, setSelectedEscrow] = useState<RawEscrowItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Pagination State (30 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 30;

  // Filter escrows by Time Range
  const timeFilteredEscrows = useMemo(() => {
    if (timeRange === 'ALL') return escrows;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return escrows.filter(e => {
      if (!e.createdAt) return true;
      const createdDate = new Date(e.createdAt);

      if (timeRange === 'TODAY') {
        return createdDate >= todayStart;
      }
      if (timeRange === '7DAYS') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return createdDate >= sevenDaysAgo;
      }
      if (timeRange === '30DAYS') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return createdDate >= thirtyDaysAgo;
      }
      if (timeRange === 'THIS_MONTH') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return createdDate >= monthStart;
      }
      return true;
    });
  }, [escrows, timeRange]);

  // Filter by Status & Search Term
  const finalFilteredEscrows = useMemo(() => {
    return timeFilteredEscrows.filter(item => {
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

      const calc = calculateEscrowFinancials(item);
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        calc.taskTitle.toLowerCase().includes(query) ||
        calc.posterName.toLowerCase().includes(query) ||
        calc.taskerName.toLowerCase().includes(query) ||
        calc.id.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [timeFilteredEscrows, statusFilter, searchTerm]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, timeRange]);

  // Calculate Total Pages & Slice Data for Page 30 Items
  const totalPages = Math.ceil(finalFilteredEscrows.length / PAGE_SIZE) || 1;
  const paginatedEscrows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return finalFilteredEscrows.slice(start, start + PAGE_SIZE);
  }, [finalFilteredEscrows, currentPage]);

  // Calculate Aggregated KPI Totals
  const totals = useMemo(() => {
    return calculateAggregateFinancials(finalFilteredEscrows);
  }, [finalFilteredEscrows]);

  // Export CSV Helper
  const handleExportCSV = () => {
    const headers = [
      'ID Giao Dịch',
      'Tên Công Việc',
      'Người Thuê (Poster)',
      'Email Poster',
      'Người Làm (Tasker)',
      'Email Tasker',
      'Gross GMV (VNĐ)',
      'Phí Nền Tảng 8% (VNĐ)',
      'Thực Nhận Tasker 92% (VNĐ)',
      'Trạng Thái Ký Quỹ',
      'Thời Gian Tạo'
    ];

    const rows = finalFilteredEscrows.map(item => {
      const calc = calculateEscrowFinancials(item);
      return [
        `"${calc.id}"`,
        `"${calc.taskTitle}"`,
        `"${calc.posterName}"`,
        `"${calc.posterEmail}"`,
        `"${calc.taskerName}"`,
        `"${calc.taskerEmail}"`,
        calc.grossAmount,
        calc.platformFee,
        calc.taskerNet,
        calc.status,
        item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'N/A'
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SnapOn_Financial_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectRow = (escrow: RawEscrowItem) => {
    setSelectedEscrow(escrow);
    setIsDetailOpen(true);
  };

  return (
    <>
      <Card className="p-6 bg-white border-[#E4E4E7] shadow-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E4E4E7] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#312F2C] text-white rounded-xl shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#18181B] tracking-tight flex items-center gap-2">
                Bảng Kế Toán Ký Quỹ & Doanh Thu SnapOn (8%)
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                  Audited Ledger
                </span>
              </h3>
              <p className="text-[#71717A] text-xs font-semibold mt-0.5">
                Bảng hạch toán toán học đối soát 100% dòng tiền Gross GMV, Doanh Thu Phí 8% SnapOn và Thực Nhận 92% Tasker.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            {/* Time Filter Select */}
            <div className="flex items-center gap-1.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl px-3 py-1.5 text-xs font-bold text-[#18181B]">
              <Calendar className="h-3.5 w-3.5 text-[#71717A]" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRangeOption)}
                className="bg-transparent focus:outline-none cursor-pointer font-bold"
              >
                <option value="ALL">Tất cả thời gian</option>
                <option value="TODAY">Hôm nay</option>
                <option value="7DAYS">7 ngày qua</option>
                <option value="30DAYS">30 ngày qua</option>
                <option value="THIS_MONTH">Tháng này</option>
              </select>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="bg-[#312F2C] hover:bg-[#18181B] text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>Xuất Báo Cáo CSV</span>
            </button>
          </div>
        </div>

        {/* Reconciled KPI Financial Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total GMV Volume */}
          <div className="p-4 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase text-[#71717A]">Gross GMV (100%)</span>
              <Wallet className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-lg font-black text-[#18181B]">
              {formatCurrencyVND(totals.totalGMV)}
            </p>
            <p className="text-[10px] text-[#71717A] font-bold">Tổng giá trị giao dịch ký quỹ</p>
          </div>

          {/* Card 2: 8% Platform Revenue */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase text-amber-900">Phí Nền Tảng (8%)</span>
              <TrendingUp className="h-4 w-4 text-amber-700" />
            </div>
            <p className="text-lg font-black text-amber-900">
              {formatCurrencyVND(totals.totalPlatformFee)}
            </p>
            <p className="text-[10px] text-amber-800 font-bold">Doanh thu phí SnapOn</p>
          </div>

          {/* Card 3: 92% Tasker Net Earnings */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase text-emerald-900">Thực Nhận Tasker (92%)</span>
              <DollarSign className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="text-lg font-black text-emerald-900">
              {formatCurrencyVND(totals.totalTaskerNet)}
            </p>
            <p className="text-[10px] text-emerald-800 font-bold">Thu nhập thực nhận người làm</p>
          </div>

          {/* Card 4: Escrow Held */}
          <div className="p-4 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase text-[#71717A]">Đang Đóng Băng</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-lg font-black text-[#18181B]">
              {formatCurrencyVND(totals.totalHeldEscrow)}
            </p>
            <p className="text-[10px] text-[#71717A] font-bold">{totals.holdingCount} hợp đồng HOLDING</p>
          </div>

          {/* Card 5: Released Payouts */}
          <div className="p-4 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase text-[#71717A]">Đã Giải Ngân</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-lg font-black text-[#18181B]">
              {formatCurrencyVND(totals.totalReleasedPayouts)}
            </p>
            <p className="text-[10px] text-[#71717A] font-bold">{totals.releasedCount} hợp đồng RELEASED</p>
          </div>
        </div>

        {/* Transaction Allocation Rules Banner */}
        <div className="p-3.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-[#18181B] gap-2 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Quy tắc toán học đối soát: <strong className="font-black">Gross GMV = Phí Nền Tảng (8%) + Thực Nhận Tasker (92%)</strong>
            </span>
          </div>
          <span className="text-[11px] text-[#71717A] bg-white px-2.5 py-1 rounded-lg border border-[#E4E4E7] font-bold">
            Phân bổ 30 dòng / trang
          </span>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#71717A]" />
            <input
              type="text"
              placeholder="Tìm theo tên task, người thuê, người làm hoặc ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-[#18181B] placeholder-[#71717A] focus:outline-none focus:border-[#312F2C] transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-extrabold text-[#71717A] shrink-0">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#F4F4F5] border border-[#E4E4E7] text-[#18181B] font-bold text-xs rounded-xl py-2 px-3 focus:outline-none focus:border-[#312F2C] w-full sm:w-auto cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="HOLDING">Đang tạm giữ (HOLDING)</option>
              <option value="RELEASED">Đã giải ngân (RELEASED)</option>
              <option value="REFUNDED">Đã hoàn tiền (REFUNDED)</option>
            </select>
          </div>
        </div>

        {/* Excel Schema Table View */}
        <div className="overflow-x-auto rounded-xl border border-[#E4E4E7] shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#312F2C] text-white uppercase text-[11px] font-extrabold tracking-wider border-b border-[#312F2C]">
                <th className="px-4 py-3 border-r border-zinc-700 text-center w-12">#</th>
                <th className="px-4 py-3 border-r border-zinc-700">Mã Giao Dịch ID</th>
                <th className="px-4 py-3 border-r border-zinc-700">Tên Công Việc</th>
                <th className="px-4 py-3 border-r border-zinc-700">Người Thuê (Poster)</th>
                <th className="px-4 py-3 border-r border-zinc-700">Người Làm (Tasker)</th>
                <th className="px-4 py-3 border-r border-zinc-700 text-right">Gross GMV (100%)</th>
                <th className="px-4 py-3 border-r border-zinc-700 text-right bg-amber-900/60 text-amber-200">Phí Nền Tảng (8%)</th>
                <th className="px-4 py-3 border-r border-zinc-700 text-right bg-emerald-900/60 text-emerald-200">Thực Nhận (92%)</th>
                <th className="px-4 py-3 text-center">Trạng Thái</th>
                <th className="px-4 py-3 text-center">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7] font-medium text-[#18181B] bg-white">
              {paginatedEscrows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-[#71717A] font-semibold bg-[#FAFAFA]">
                    <div className="flex flex-col items-center gap-1.5">
                      <Info className="h-5 w-5 text-[#71717A]" />
                      <span>Không tìm thấy giao dịch ký quỹ nào phù hợp với bộ lọc.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEscrows.map((item, idx) => {
                  const globalIdx = (currentPage - 1) * PAGE_SIZE + idx + 1;
                  const calc = calculateEscrowFinancials(item);
                  const isEven = idx % 2 === 0;

                  return (
                    <tr 
                      key={calc.id} 
                      onClick={() => handleSelectRow(item)}
                      className={`${isEven ? 'bg-white' : 'bg-[#FAFAFA]'} hover:bg-zinc-100 transition-colors cursor-pointer`}
                    >
                      <td className="px-4 py-3 border-r border-[#E4E4E7] text-center font-mono text-[#71717A] font-bold">
                        {globalIdx}
                      </td>
                      <td className="px-4 py-3 border-r border-[#E4E4E7] font-mono text-[11px] text-[#71717A] font-bold">
                        {calc.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-4 border-r border-[#E4E4E7] font-bold text-[#18181B] max-w-xs truncate">
                        {calc.taskTitle}
                      </td>
                      <td className="px-4 py-3 border-r border-[#E4E4E7]">
                        <div className="font-bold text-[#18181B]">{calc.posterName}</div>
                        <div className="text-[10px] text-[#71717A] font-mono">{calc.posterEmail}</div>
                      </td>
                      <td className="px-4 py-3 border-r border-[#E4E4E7]">
                        <div className="font-bold text-[#18181B]">{calc.taskerName}</div>
                        <div className="text-[10px] text-[#71717A] font-mono">{calc.taskerEmail}</div>
                      </td>
                      <td className="px-4 py-3 border-r border-[#E4E4E7] text-right font-extrabold text-[#18181B]">
                        {formatCurrencyVND(calc.grossAmount)}
                      </td>
                      <td className="px-4 py-3 border-r border-[#E4E4E7] text-right font-black text-amber-800 bg-amber-50/60">
                        +{formatCurrencyVND(calc.platformFee)}
                      </td>
                      <td className="px-4 py-3 border-r border-[#E4E4E7] text-right font-black text-emerald-800 bg-emerald-50/60">
                        {formatCurrencyVND(calc.taskerNet)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                          calc.status === 'HOLDING' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                          calc.status === 'RELEASED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                          'bg-rose-100 text-rose-900 border-rose-300'
                        }`}>
                          {calc.status === 'HOLDING' && <Clock className="h-3 w-3 text-amber-700" />}
                          {calc.status === 'RELEASED' && <CheckCircle2 className="h-3 w-3 text-emerald-700" />}
                          {calc.status === 'REFUNDED' && <RotateCcw className="h-3 w-3 text-rose-700" />}
                          {calc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleSelectRow(item); }}
                          className="p-1.5 rounded-lg bg-white border border-[#E4E4E7] text-[#312F2C] hover:bg-[#312F2C] hover:text-white transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS (30 rows per page) */}
        {finalFilteredEscrows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#E4E4E7]">
            <div className="text-xs font-bold text-[#71717A]">
              Hiển thị <span className="text-[#18181B] font-black">{(currentPage - 1) * PAGE_SIZE + 1}</span> - <span className="text-[#18181B] font-black">{Math.min(currentPage * PAGE_SIZE, finalFilteredEscrows.length)}</span> trên tổng số <span className="text-[#18181B] font-black">{finalFilteredEscrows.length}</span> giao dịch
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-[#F4F4F5] border border-[#E4E4E7] text-[#18181B] hover:bg-[#312F2C] hover:text-white disabled:opacity-40 disabled:hover:bg-[#F4F4F5] disabled:hover:text-[#18181B] transition-all cursor-pointer"
                title="Trang đầu"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-[#F4F4F5] border border-[#E4E4E7] text-[#18181B] hover:bg-[#312F2C] hover:text-white disabled:opacity-40 disabled:hover:bg-[#F4F4F5] disabled:hover:text-[#18181B] transition-all cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-3 py-1 text-xs font-extrabold bg-[#312F2C] text-white rounded-lg">
                Trang {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-[#F4F4F5] border border-[#E4E4E7] text-[#18181B] hover:bg-[#312F2C] hover:text-white disabled:opacity-40 disabled:hover:bg-[#F4F4F5] disabled:hover:text-[#18181B] transition-all cursor-pointer"
                title="Trang sau"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-[#F4F4F5] border border-[#E4E4E7] text-[#18181B] hover:bg-[#312F2C] hover:text-white disabled:opacity-40 disabled:hover:bg-[#F4F4F5] disabled:hover:text-[#18181B] transition-all cursor-pointer"
                title="Trang cuối"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        escrow={selectedEscrow}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedEscrow(null);
        }}
      />
    </>
  );
}
