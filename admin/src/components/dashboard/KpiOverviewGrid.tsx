import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  Briefcase, 
  CheckCircle2, 
  Wallet, 
  Flag,
  ArrowUpRight,
  TrendingUp,
  Tag,
  ShieldAlert
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

export interface KpiData {
  userCount: number;
  activeUserCount: number;
  bannedUserCount: number;
  newUsersTodayCount: number;
  taskCount: number;
  openTaskCount: number;
  inProgressTaskCount: number;
  completedTaskCount: number;
  categoryCount: number;
  pendingPayoutCount: number;
  approvedPayoutCount: number;
  openReportCount: number;
  pendingDeletionCount: number;
  totalEscrowAmount: number;
  totalPaidOutAmount: number;
}

interface KpiOverviewGridProps {
  data: KpiData;
}

export default function KpiOverviewGrid({ data }: KpiOverviewGridProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const cards = [
    {
      title: 'Tổng Người Dùng',
      value: data.userCount.toLocaleString(),
      subtext: `${data.activeUserCount} Hoạt động • ${data.bannedUserCount} Bị khóa`,
      badge: `+${data.newUsersTodayCount} hôm nay`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      href: '/users',
    },
    {
      title: 'Tổng Công Việc Đăng',
      value: data.taskCount.toLocaleString(),
      subtext: `${data.openTaskCount} Đang mở • ${data.inProgressTaskCount} Đang thực hiện`,
      badge: `${data.completedTaskCount} Đã xong`,
      icon: Briefcase,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 border-indigo-200',
      href: '/tasks',
    },
    {
      title: 'Yêu Cầu Rút Tiền',
      value: data.pendingPayoutCount.toLocaleString(),
      subtext: `${data.approvedPayoutCount} Đã duyệt / Thanh toán`,
      badge: data.pendingPayoutCount > 0 ? 'Cần duyệt' : 'Đã duyệt hết',
      icon: Wallet,
      color: data.pendingPayoutCount > 0 ? 'text-amber-600' : 'text-emerald-600',
      bgColor: data.pendingPayoutCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200',
      alert: data.pendingPayoutCount > 0,
      href: '/withdraws',
    },
    {
      title: 'Báo Cáo Vi Phạm',
      value: data.openReportCount.toLocaleString(),
      subtext: 'Báo cáo về Người dùng & Task',
      badge: data.openReportCount > 0 ? 'Cần xử lý' : 'Bình thường',
      icon: Flag,
      color: data.openReportCount > 0 ? 'text-rose-600' : 'text-zinc-600',
      bgColor: data.openReportCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-zinc-100 border-zinc-200',
      alert: data.openReportCount > 0,
      href: '/reports',
    },
    {
      title: 'Tổng Danh Mục',
      value: data.categoryCount.toLocaleString(),
      subtext: 'Phân loại dịch vụ hệ thống',
      badge: 'Đang hoạt động',
      icon: Tag,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
      href: '/categories',
    },
    {
      title: 'Tổng Tiền Ký Quỹ (Escrow)',
      value: formatCurrency(data.totalEscrowAmount),
      subtext: 'Số dư tạm giữ trên hệ thống',
      badge: 'An toàn',
      icon: TrendingUp,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 border-cyan-200',
      href: '/tasks',
    },
    {
      title: 'Tổng Tiền Đã Rút',
      value: formatCurrency(data.totalPaidOutAmount),
      subtext: 'Đã giải ngân cho người dùng',
      badge: 'Hoàn tất',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-200',
      href: '/withdraws',
    },
    {
      title: 'Yêu Cầu Xóa Tài Khoản',
      value: data.pendingDeletionCount.toLocaleString(),
      subtext: 'Yêu cầu hủy tài khoản',
      badge: data.pendingDeletionCount > 0 ? 'Cần xem xét' : 'Không có',
      icon: ShieldAlert,
      color: data.pendingDeletionCount > 0 ? 'text-red-600' : 'text-zinc-600',
      bgColor: data.pendingDeletionCount > 0 ? 'bg-red-50 border-red-200' : 'bg-zinc-100 border-zinc-200',
      alert: data.pendingDeletionCount > 0,
      href: '/deletions',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <Card key={i} className="relative overflow-hidden group bg-white border-[#E4E4E7] hover:border-[#312F2C] hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#71717A]">{card.title}</p>
                <h3 className="text-2xl font-extrabold mt-1 text-[#18181B] tracking-tight">{card.value}</h3>
              </div>
              <div className={`rounded-xl p-2.5 border ${card.bgColor} ${card.color} transition-transform group-hover:scale-110 shadow-2xs`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>

            {card.alert && (
              <div className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-bl animate-pulse" />
            )}

            <div className="mt-4 flex items-center justify-between border-t border-[#E4E4E7] pt-3 text-xs">
              <span className="text-[#71717A] font-medium truncate max-w-[150px]">{card.subtext}</span>
              <Link 
                href={card.href} 
                className="text-[#312F2C] font-bold hover:underline flex items-center gap-1 transition-colors shrink-0"
              >
                Quản lý <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
