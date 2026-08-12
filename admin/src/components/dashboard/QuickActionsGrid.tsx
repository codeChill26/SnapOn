import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Users, Briefcase, Tag, Wallet, Flag, Trash2, ArrowRight } from 'lucide-react';

export default function QuickActionsGrid() {
  const actions = [
    {
      title: 'Quản Lý Người Dùng',
      desc: 'Quản lý tài khoản, trạng thái khóa, phân quyền và xác minh người dùng.',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      href: '/users',
    },
    {
      title: 'Quản Lý Công Việc',
      desc: 'Theo dõi công việc đăng tuyển, người ứng tuyển, hủy việc và trạng thái.',
      icon: Briefcase,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 border-indigo-200',
      href: '/tasks',
    },
    {
      title: 'Danh Mục & Kỹ Năng',
      desc: 'Cấu hình các danh mục dịch vụ và hệ thống kỹ năng ngành nghề.',
      icon: Tag,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
      href: '/categories',
    },
    {
      title: 'Duyệt Rút Tiền',
      desc: 'Xử lý duyệt lệnh rút tiền và chuyển khoản ngân hàng.',
      icon: Wallet,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-200',
      href: '/withdraws',
    },
    {
      title: 'Xử Lý Báo Cáo Vi Phạm',
      desc: 'Điều tra khiếu nại người dùng, tranh chấp và nội dung báo cáo.',
      icon: Flag,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50 border-rose-200',
      href: '/reports',
    },
    {
      title: 'Quản Lý Xóa Tài Khoản',
      desc: 'Xem xét và xử lý các yêu cầu hủy tài khoản người dùng.',
      icon: Trash2,
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
      href: '/deletions',
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-base font-extrabold text-[#18181B] tracking-tight">Lối Tắt Quản Lý Nhanh</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((act, i) => {
          const Icon = act.icon;
          return (
            <Card key={i} className="p-5 bg-white border-[#E4E4E7] hover:border-[#312F2C] hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl border ${act.bgColor} ${act.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-[#18181B] group-hover:text-[#312F2C] transition-colors">{act.title}</h4>
                  <p className="text-xs text-[#71717A] mt-1 leading-relaxed font-medium">{act.desc}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E4E4E7] flex items-center justify-between text-xs">
                <span className="text-[#71717A] font-semibold">Thao tác nhanh</span>
                <Link
                  href={act.href}
                  className="text-[#312F2C] hover:underline font-bold flex items-center gap-1 transition-colors"
                >
                  Truy cập <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
