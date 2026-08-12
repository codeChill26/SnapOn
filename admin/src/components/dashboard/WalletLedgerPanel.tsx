'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { 
  Wallet, 
  CreditCard, 
  Download, 
  Search, 
  Calendar, 
  Users, 
  ArrowUpRight,
  Info,
  Eye,
  X,
  ShieldAlert,
  CheckCircle2,
  Briefcase,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { formatCurrencyVND } from '@/lib/financial-math';

export interface WalletTransactionItem {
  id: string;
  type: string;
  amount: number;
  status: string;
  order_code: string | null;
  created_at: string | Date;
}

export interface UserWalletLedgerItem {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string | null;
  balance: number;
  availableBalance: number;
  lockedBalance: number;
  lastDepositAmount: number;
  lastDepositOrderCode: string | null;
  lastDepositAt: string | Date | null;
  transactions: WalletTransactionItem[];
}

interface WalletLedgerPanelProps {
  walletItems: UserWalletLedgerItem[];
}

type TimeRangeOption = 'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'THIS_MONTH';

export default function WalletLedgerPanel({ walletItems }: WalletLedgerPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('ALL');
  const [selectedUserWallet, setSelectedUserWallet] = useState<UserWalletLedgerItem | null>(null);

  // Pagination State (30 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 30;

  // Filter by Time Range
  const timeFilteredItems = useMemo(() => {
    if (timeRange === 'ALL') return walletItems;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return walletItems.filter(item => {
      if (!item.lastDepositAt) return false;
      const depositDate = new Date(item.lastDepositAt);

      if (timeRange === 'TODAY') {
        return depositDate >= todayStart;
      }
      if (timeRange === '7DAYS') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return depositDate >= sevenDaysAgo;
      }
      if (timeRange === '30DAYS') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return depositDate >= thirtyDaysAgo;
      }
      if (timeRange === 'THIS_MONTH') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return depositDate >= monthStart;
      }
      return true;
    });
  }, [walletItems, timeRange]);

  // Filter by Search Term
  const finalFilteredItems = useMemo(() => {
    return timeFilteredItems.filter(item => {
      const query = searchTerm.toLowerCase();
      return (
        item.fullName.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        (item.phone && item.phone.includes(query)) ||
        (item.lastDepositOrderCode && item.lastDepositOrderCode.toLowerCase().includes(query))
      );
    });
  }, [timeFilteredItems, searchTerm]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, timeRange]);

  // Calculate Total Pages & Slice Data for Page 30 Items
  const totalPages = Math.ceil(finalFilteredItems.length / PAGE_SIZE) || 1;
  const paginatedWalletItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return finalFilteredItems.slice(start, start + PAGE_SIZE);
  }, [finalFilteredItems, currentPage]);

  // Calculate Aggregations
  const aggregates = useMemo(() => {
    let totalDeposited = 0;
    let totalAvailable = 0;
    let totalLocked = 0;

    for (const item of finalFilteredItems) {
      totalDeposited += item.lastDepositAmount;
      totalAvailable += item.availableBalance;
      totalLocked += item.lockedBalance;
    }

    return {
      totalDeposited,
      totalAvailable,
      totalLocked,
      totalUserCount: finalFilteredItems.length,
    };
  }, [finalFilteredItems]);

  // Export CSV Helper
  const handleExportCSV = () => {
    const headers = [
      'Họ Và Tên',
      'Email',
      'Số Điện Thoại',
      'Vai Trò',
      'Số Tiền Nạp Gần Nhất (VNĐ)',
      'Mã Đơn PayOS (#OrderCode)',
      'Số Dư Khả Dụng (VNĐ)',
      'Số Dư Đóng Băng (VNĐ)',
      'Tổng Số Dư Ví (VNĐ)',
      'Thời Gian Nạp'
    ];

    const rows = finalFilteredItems.map(item => [
      `"${item.fullName}"`,
      `"${item.email}"`,
      `"${item.phone || 'N/A'}"`,
      item.role || 'USER',
      item.lastDepositAmount,
      item.lastDepositOrderCode ? `#${item.lastDepositOrderCode}` : 'N/A',
      item.availableBalance,
      item.lockedBalance,
      item.balance,
      item.lastDepositAt ? new Date(item.lastDepositAt).toLocaleDateString('vi-VN') : 'N/A'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SnapOn_PayOS_Wallet_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for Selected User Modal Transactions Aggregations
  const userModalStats = useMemo(() => {
    if (!selectedUserWallet || !selectedUserWallet.transactions) {
      return { totalDeposited: 0, totalJobEarnings: 0, totalHolds: 0, totalRefunds: 0, calculatedSum: 0 };
    }

    let totalDeposited = 0;
    let totalJobEarnings = 0;
    let totalHolds = 0;
    let totalRefunds = 0;

    for (const tx of selectedUserWallet.transactions) {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'DEPOSIT') totalDeposited += amt;
      else if (tx.type === 'ESCROW_RELEASE') totalJobEarnings += amt;
      else if (tx.type === 'ESCROW_HOLD') totalHolds += amt;
      else if (tx.type === 'REFUND') totalRefunds += amt;
    }

    const calculatedSum = totalDeposited + totalJobEarnings + totalRefunds - totalHolds;

    return {
      totalDeposited,
      totalJobEarnings,
      totalHolds,
      totalRefunds,
      calculatedSum: Math.max(0, calculatedSum),
    };
  }, [selectedUserWallet]);

  return (
    <Card className="p-6 bg-white border-[#E4E4E7] shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E4E4E7] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#312F2C] text-white rounded-xl shadow-xs">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[#18181B] tracking-tight flex items-center gap-2">
              Bảng Quản Lý Nạp Tiền PayOS & Số Dư Ví Người Dùng
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 uppercase">
                PayOS Gateway Sync
              </span>
            </h3>
            <p className="text-[#71717A] text-xs font-semibold mt-0.5">
              Theo dõi chi tiết nạp PayOS (+), trừ ký quỹ (-), hoàn tiền (+), thực nhận task (+) đối soát 100% chính xác từng đồng.
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
            <span>Xuất Báo Cáo Ví (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Wallet Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Deposited */}
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-blue-900">Tổng Tiền Nạp PayOS</span>
            <ArrowUpRight className="h-4 w-4 text-blue-700" />
          </div>
          <p className="text-lg font-black text-blue-950">
            {formatCurrencyVND(aggregates.totalDeposited)}
          </p>
          <p className="text-[10px] text-blue-800 font-bold">Thực nạp từ cổng VietQR PayOS</p>
        </div>

        {/* Card 2: Total Available Balance */}
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-emerald-900">Tổng Số Dư Khả Dụng</span>
            <Wallet className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="text-lg font-black text-emerald-950">
            {formatCurrencyVND(aggregates.totalAvailable)}
          </p>
          <p className="text-[10px] text-emerald-800 font-bold">Sẵn sàng thuê việc / thanh toán</p>
        </div>

        {/* Card 3: Total Locked Escrow */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-amber-900">Tổng Đóng Băng Ký Quỹ</span>
            <ShieldAlert className="h-4 w-4 text-amber-700" />
          </div>
          <p className="text-lg font-black text-amber-950">
            {formatCurrencyVND(aggregates.totalLocked)}
          </p>
          <p className="text-[10px] text-amber-800 font-bold">Đang giữ hợp đồng làm việc</p>
        </div>

        {/* Card 4: Depositing Accounts Count */}
        <div className="p-4 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-[#71717A]">Số Tài Khoản Nạp Tiền</span>
            <Users className="h-4 w-4 text-[#312F2C]" />
          </div>
          <p className="text-lg font-black text-[#18181B]">
            {aggregates.totalUserCount} <span className="text-xs font-bold text-[#71717A]">người dùng</span>
          </p>
          <p className="text-[10px] text-[#71717A] font-bold">Khởi tạo ví thành công</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#71717A]" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, sđt hoặc mã PayOS (#OrderCode)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-[#18181B] placeholder-[#71717A] focus:outline-none focus:border-[#312F2C] transition-all"
          />
        </div>
        <span className="text-xs font-bold text-[#71717A] bg-[#F4F4F5] px-3 py-1.5 rounded-xl border border-[#E4E4E7] shrink-0">
          Phân bổ 30 tài khoản / trang (Tổng {finalFilteredItems.length})
        </span>
      </div>

      {/* Excel Schema Wallet Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E4E4E7] shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#312F2C] text-white uppercase text-[11px] font-extrabold tracking-wider border-b border-[#312F2C]">
              <th className="px-4 py-3 border-r border-zinc-700 text-center w-12">#</th>
              <th className="px-4 py-3 border-r border-zinc-700">Thông Tin Người Dùng</th>
              <th className="px-4 py-3 border-r border-zinc-700 text-center">Vai Trò</th>
              <th className="px-4 py-3 border-r border-zinc-700">Mã PayOS Order</th>
              <th className="px-4 py-3 border-r border-zinc-700 text-right bg-blue-900/60 text-blue-200">Tiền Nạp PayOS</th>
              <th className="px-4 py-3 border-r border-zinc-700 text-right">Số Dư Khả Dụng</th>
              <th className="px-4 py-3 border-r border-zinc-700 text-right">Đóng Băng Ký Quỹ</th>
              <th className="px-4 py-3 border-r border-zinc-700 text-right font-black">Tổng Số Dư Ví</th>
              <th className="px-4 py-3 border-r border-zinc-700 text-center">Nguồn Tăng Số Dư</th>
              <th className="px-4 py-3 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4E4E7] font-medium text-[#18181B] bg-white">
            {paginatedWalletItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-8 text-center text-[#71717A] font-semibold bg-[#FAFAFA]">
                  <div className="flex flex-col items-center gap-1.5">
                    <Info className="h-5 w-5 text-[#71717A]" />
                    <span>Không tìm thấy giao dịch nạp tiền hoặc số dư phù hợp.</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedWalletItems.map((item, idx) => {
                const globalIdx = (currentPage - 1) * PAGE_SIZE + idx + 1;
                const isEven = idx % 2 === 0;
                
                const taskerEarnings = item.transactions
                  ? item.transactions
                      .filter(tx => tx.type === 'ESCROW_RELEASE')
                      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
                  : 0;

                const hasTaskEarnings = taskerEarnings > 0;

                return (
                  <tr key={item.userId} className={`${isEven ? 'bg-white' : 'bg-[#FAFAFA]'} hover:bg-zinc-100 transition-colors`}>
                    <td className="px-4 py-3 border-r border-[#E4E4E7] text-center font-mono text-[#71717A] font-bold">
                      {globalIdx}
                    </td>
                    <td className="px-4 py-3 border-r border-[#E4E4E7]">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full overflow-hidden border border-[#E4E4E7] bg-[#F4F4F5] shrink-0">
                          <img
                            src={item.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(item.fullName)}`}
                            alt={item.fullName}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div>
                          <div className="font-extrabold text-[#18181B]">{item.fullName}</div>
                          <div className="text-[10px] text-[#71717A] font-mono">{item.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-r border-[#E4E4E7] text-center">
                      <span className="inline-flex items-center rounded-md bg-[#312F2C] text-white px-2 py-0.5 text-[10px] font-bold uppercase">
                        {item.role || 'USER'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-[#E4E4E7] font-mono text-[11px] text-[#71717A] font-bold">
                      {item.lastDepositOrderCode ? `#${item.lastDepositOrderCode}` : 'Ví Nội Bộ'}
                    </td>
                    <td className="px-4 py-3 border-r border-[#E4E4E7] text-right font-black text-blue-700 bg-blue-50/60">
                      +{formatCurrencyVND(item.lastDepositAmount)}
                    </td>
                    <td className="px-4 py-3 border-r border-[#E4E4E7] text-right font-extrabold text-emerald-800">
                      {formatCurrencyVND(item.availableBalance)}
                    </td>
                    <td className="px-4 py-3 border-r border-[#E4E4E7] text-right font-extrabold text-amber-800">
                      {formatCurrencyVND(item.lockedBalance)}
                    </td>
                    <td className="px-4 py-3 border-r border-[#E4E4E7] text-right font-black text-[#18181B] text-sm">
                      {formatCurrencyVND(item.balance)}
                    </td>
                    <td className="px-4 py-3 border-r border-[#E4E4E7] text-center">
                      {hasTaskEarnings ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs" title={`Đã nhận +${formatCurrencyVND(taskerEarnings)} từ làm task`}>
                          <TrendingUp className="h-3 w-3 text-emerald-700" />
                          +{formatCurrencyVND(taskerEarnings)} (Tasker)
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#71717A] font-semibold">Tiền nạp PayOS</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedUserWallet(item)}
                        className="bg-[#312F2C] hover:bg-[#18181B] text-white p-1.5 rounded-lg transition-all shadow-2xs flex items-center justify-center mx-auto cursor-pointer"
                        title="Xem toàn bộ nhật ký nạp PayOS, trừ ký quỹ & thu nhập Tasker"
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
      {finalFilteredItems.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#E4E4E7]">
          <div className="text-xs font-bold text-[#71717A]">
            Hiển thị <span className="text-[#18181B] font-black">{(currentPage - 1) * PAGE_SIZE + 1}</span> - <span className="text-[#18181B] font-black">{Math.min(currentPage * PAGE_SIZE, finalFilteredItems.length)}</span> trên tổng số <span className="text-[#18181B] font-black">{finalFilteredItems.length}</span> tài khoản ví
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

      {/* FULL USER WALLET TRANSACTIONS HISTORY MODAL */}
      {selectedUserWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-[#E4E4E7] rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden border border-[#E4E4E7] bg-[#F4F4F5]">
                  <img
                    src={selectedUserWallet.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedUserWallet.fullName)}`}
                    alt={selectedUserWallet.fullName}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-[#18181B] flex items-center gap-2">
                    Sổ Kế Toán Biến Động Số Dư Đối Soát Chính Xác
                    <span className="text-[10px] bg-[#312F2C] text-white font-bold px-2 py-0.5 rounded-full uppercase">
                      {selectedUserWallet.role || 'USER'}
                    </span>
                  </h4>
                  <p className="text-xs text-[#71717A] font-semibold">{selectedUserWallet.fullName} ({selectedUserWallet.email})</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserWallet(null)}
                className="p-2 rounded-xl text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Wallet Balance KPI Summary */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <div className="text-[10px] font-extrabold uppercase text-blue-800">Tiền Nạp PayOS</div>
                <div className="text-sm font-black text-blue-950 mt-0.5">
                  {formatCurrencyVND(userModalStats.totalDeposited)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] font-extrabold uppercase text-emerald-800">Thu Nhập Làm Task (92%)</div>
                <div className="text-sm font-black text-emerald-950 mt-0.5">
                  +{formatCurrencyVND(userModalStats.totalJobEarnings)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-[10px] font-extrabold uppercase text-amber-800">Đóng Băng Ký Quỹ</div>
                <div className="text-sm font-black text-amber-950 mt-0.5">
                  {formatCurrencyVND(selectedUserWallet.lockedBalance)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7]">
                <div className="text-[10px] font-extrabold uppercase text-[#71717A]">Tổng Số Dư Thực Tế</div>
                <div className="text-sm font-black text-[#18181B] mt-0.5">
                  {formatCurrencyVND(userModalStats.calculatedSum)}
                </div>
              </div>
            </div>

            {/* Reconciliation Formula Banner */}
            <div className="p-3 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] text-xs space-y-1">
              <div className="font-extrabold text-[#312F2C] flex items-center gap-1.5">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Đối soát cộng trừ chuỗi giao dịch chính xác 100%:</span>
              </div>
              <p className="text-[11px] text-[#71717A] font-semibold leading-relaxed">
                <strong className="text-blue-700">PayOS (+{formatCurrencyVND(userModalStats.totalDeposited)})</strong>
                {userModalStats.totalJobEarnings > 0 && <span> + <strong className="text-emerald-700">Làm Task (+{formatCurrencyVND(userModalStats.totalJobEarnings)})</strong></span>}
                {userModalStats.totalHolds > 0 && <span> - <strong className="text-amber-800">Trừ Ký Quỹ (-{formatCurrencyVND(userModalStats.totalHolds)})</strong></span>}
                {userModalStats.totalRefunds > 0 && <span> + <strong className="text-purple-700">Hoàn Tiền (+{formatCurrencyVND(userModalStats.totalRefunds)})</strong></span>}
                {' = '}<strong className="text-[#18181B]">Số Dư Ví Thực Tế ({formatCurrencyVND(userModalStats.calculatedSum)})</strong>.
              </p>
            </div>

            {/* Detailed Transactions List */}
            <div className="space-y-2">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#312F2C] flex items-center justify-between">
                <span>Chi Tiết Nhật Ký Giao Dịch ({selectedUserWallet.transactions?.length || 0})</span>
                <span className="text-[10px] text-[#71717A] font-semibold">Minh bạch 100% dòng tiền nạp, ký quỹ & thu nhập task</span>
              </h5>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-[#E4E4E7]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#312F2C] text-white text-[10px] uppercase font-extrabold tracking-wider sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5">Loại Giao Dịch</th>
                      <th className="px-3 py-2.5">Nội Dung / Mã Đơn</th>
                      <th className="px-3 py-2.5 text-right">Biến Động Số Tiền</th>
                      <th className="px-3 py-2.5 text-center">Trạng Thái</th>
                      <th className="px-3 py-2.5 text-right">Thời Gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7] font-medium text-[#18181B] bg-white">
                    {!selectedUserWallet.transactions || selectedUserWallet.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-[#71717A] text-xs font-semibold bg-[#FAFAFA]">
                          Chưa có nhật ký giao dịch biến động ví.
                        </td>
                      </tr>
                    ) : (
                      selectedUserWallet.transactions.map((tx) => {
                        const isMinus = tx.type === 'ESCROW_HOLD';
                        const isIncome = tx.type === 'DEPOSIT' || tx.type === 'ESCROW_RELEASE' || tx.type === 'REFUND';
                        
                        return (
                          <tr key={tx.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                                tx.type === 'DEPOSIT' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                                tx.type === 'ESCROW_RELEASE' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold shadow-2xs' :
                                tx.type === 'ESCROW_HOLD' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                'bg-purple-100 text-purple-900 border border-purple-300'
                              }`}>
                                {tx.type === 'DEPOSIT' ? 'Nạp Tiền PayOS' :
                                 tx.type === 'ESCROW_HOLD' ? 'Ký Quỹ Bài Đăng' :
                                 tx.type === 'ESCROW_RELEASE' ? 'Thực Nhận Làm Task (92%)' :
                                 tx.type === 'REFUND' ? 'Hoàn Tiền Ký Quỹ' : tx.type}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-bold text-[11px] text-[#312F2C]">
                              {tx.order_code ? (
                                <span className="font-mono text-blue-700">PayOS #{tx.order_code}</span>
                              ) : (
                                <span className="flex items-center gap-1 text-[#18181B]">
                                  <Briefcase className="h-3 w-3 text-indigo-600 shrink-0" />
                                  <span>{tx.type === 'ESCROW_RELEASE' ? 'Nhận tiền hoàn thành công việc (92%)' : 'Giao dịch hợp đồng Task'}</span>
                                </span>
                              )}
                            </td>
                            <td className={`px-3 py-2.5 text-right font-black ${
                              isMinus ? 'text-amber-800 bg-amber-50/50' : 'text-emerald-700 bg-emerald-50/50'
                            }`}>
                              {isMinus ? '-' : '+'}{formatCurrencyVND(tx.amount)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                {tx.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-[10px] text-[#71717A]">
                              {new Date(tx.created_at).toLocaleString('vi-VN')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-[#E4E4E7]">
              <button
                onClick={() => setSelectedUserWallet(null)}
                className="bg-[#312F2C] hover:bg-[#18181B] text-white font-extrabold px-5 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
