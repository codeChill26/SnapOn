import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Clock, Wallet, ArrowUpRight } from 'lucide-react';
import { formatImageUrl } from '@/lib/image-utils';

interface RecentTask {
  id: string;
  title: string;
  category?: { name: string } | null;
  poster: { fullName: string };
  status: string;
  createdAt: Date;
  images: string[];
}

interface RecentWithdrawal {
  id: string;
  amount: number | string;
  bankName: string;
  status: string;
  user: { fullName: string };
}

interface RecentUser {
  id: string;
  fullName: string;
  email: string;
  status: string;
  role: string | null;
  createdAt: Date;
}

interface RecentActivityTablesProps {
  recentTasks: RecentTask[];
  recentPayouts: RecentWithdrawal[];
  recentUsers: RecentUser[];
}

export default function RecentActivityTables({
  recentTasks,
  recentPayouts,
}: RecentActivityTablesProps) {
  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Recent Tasks */}
      <Card className="p-6 bg-white border-[#E4E4E7] text-[#18181B] shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E4E4E7]">
          <h3 className="text-base font-extrabold text-[#18181B] flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#312F2C]" />
            <span>Task Mới Đăng Gần Đây</span>
          </h3>
          <Link href="/tasks" className="text-xs text-[#312F2C] font-bold hover:underline flex items-center gap-1">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#71717A]">
            <thead className="bg-[#F4F4F5] uppercase text-[10px] text-[#71717A] border-b border-[#E4E4E7]">
              <tr>
                <th className="px-3 py-2.5 font-bold">Ảnh</th>
                <th className="px-3 py-2.5 font-bold">Tiêu đề</th>
                <th className="px-3 py-2.5 font-bold">Danh mục</th>
                <th className="px-3 py-2.5 font-bold">Người đăng</th>
                <th className="px-3 py-2.5 font-bold text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {recentTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[#71717A]">No tasks created recently</td>
                </tr>
              ) : (
                recentTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-[#F4F4F5] transition-colors">
                    <td className="px-3 py-2">
                      {task.images && task.images.length > 0 ? (
                        <Image
                          src={formatImageUrl(task.images[0])}
                          width={32}
                          height={32}
                          alt={task.title}
                          className="rounded object-cover w-[32px] h-[32px] border border-[#E4E4E7] bg-[#F4F4F5]"
                        />
                      ) : (
                        <div className="w-[32px] h-[32px] rounded bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center text-[7px] text-[#71717A] font-bold">
                          No Img
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[#18181B] font-semibold truncate max-w-[140px]">{task.title}</td>
                    <td className="px-3 py-2 text-[#71717A] font-medium">{task.category?.name || 'General'}</td>
                    <td className="px-3 py-2 truncate max-w-[100px] text-[#18181B] font-medium">{task.poster.fullName}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                        task.status === 'OPEN' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        task.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        task.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        'bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Payout Requests */}
      <Card className="p-6 bg-white border-[#E4E4E7] text-[#18181B] shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E4E4E7]">
          <h3 className="text-base font-extrabold text-[#18181B] flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-600" />
            <span>Yêu Cầu Rút Tiền Gần Đây</span>
          </h3>
          <Link href="/withdraws" className="text-xs text-[#312F2C] font-bold hover:underline flex items-center gap-1">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#71717A]">
            <thead className="bg-[#F4F4F5] uppercase text-[10px] text-[#71717A] border-b border-[#E4E4E7]">
              <tr>
                <th className="px-3 py-2.5 font-bold">User</th>
                <th className="px-3 py-2.5 font-bold">Số tiền</th>
                <th className="px-3 py-2.5 font-bold">Ngân hàng</th>
                <th className="px-3 py-2.5 font-bold text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {recentPayouts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-[#71717A]">No withdrawal requests</td>
                </tr>
              ) : (
                recentPayouts.map((req) => (
                  <tr key={req.id} className="hover:bg-[#F4F4F5] transition-colors">
                    <td className="px-3 py-2.5 text-[#18181B] font-semibold truncate max-w-[120px]">{req.user.fullName}</td>
                    <td className="px-3 py-2.5 text-emerald-700 font-extrabold">{formatCurrency(req.amount)}</td>
                    <td className="px-3 py-2.5 truncate max-w-[100px] text-[#71717A] font-medium">{req.bankName}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                        req.status === 'PENDING' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        req.status === 'APPROVED' || req.status === 'PAID' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
