import React from 'react';
import Link from 'next/link';
import { Wallet, Flag, ShieldAlert, ArrowRight } from 'lucide-react';

interface SystemAlertsPanelProps {
  pendingPayouts: number;
  pendingReports: number;
  pendingDeletions: number;
}

export default function SystemAlertsPanel({
  pendingPayouts,
  pendingReports,
  pendingDeletions,
}: SystemAlertsPanelProps) {
  const alerts = [];

  if (pendingPayouts > 10) {
    alerts.push({
      type: 'KHẨN CẤP',
      title: 'Số Lượng Yêu Cầu Rút Tiền Đang Cao',
      message: `Hiện đang có ${pendingPayouts} yêu cầu rút tiền chờ duyệt. Hãy kiểm tra xử lý sớm để đảm bảo trải nghiệm người dùng.`,
      icon: Wallet,
      color: 'bg-rose-50 border-rose-300 text-rose-900',
      btnColor: 'bg-rose-600 hover:bg-rose-700 text-white',
      href: '/withdraws',
    });
  } else if (pendingPayouts > 0) {
    alerts.push({
      type: 'CẢNH BÁO',
      title: 'Yêu Cầu Rút Tiền Chờ Duyệt',
      message: `Có ${pendingPayouts} yêu cầu rút tiền đang chờ Quản trị viên phê duyệt.`,
      icon: Wallet,
      color: 'bg-amber-50 border-amber-300 text-amber-900',
      btnColor: 'bg-amber-600 hover:bg-amber-700 text-white',
      href: '/withdraws',
    });
  }

  if (pendingReports > 5) {
    alerts.push({
      type: 'CẢNH BÁO',
      title: 'Báo Cáo Vi Phạm Tích Tụ',
      message: `Có ${pendingReports} báo cáo vi phạm từ người dùng đang chờ kiểm duyệt.`,
      icon: Flag,
      color: 'bg-amber-50 border-amber-300 text-amber-900',
      btnColor: 'bg-amber-600 hover:bg-amber-700 text-white',
      href: '/reports',
    });
  }

  if (pendingDeletions > 0) {
    alerts.push({
      type: 'THÔNG BÁO',
      title: 'Yêu Cầu Xóa Tài Khoản',
      message: `Có ${pendingDeletions} yêu cầu hủy tài khoản từ người dùng cần xem xét.`,
      icon: ShieldAlert,
      color: 'bg-purple-50 border-purple-300 text-purple-900',
      btnColor: 'bg-purple-600 hover:bg-purple-700 text-white',
      href: '/deletions',
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => {
        const Icon = alert.icon;
        return (
          <div key={index} className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs ${alert.color}`}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white/80 shrink-0 mt-0.5 shadow-2xs">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-black/10 text-[#18181B]">
                    {alert.type}
                  </span>
                  <h4 className="text-sm font-extrabold">{alert.title}</h4>
                </div>
                <p className="text-xs opacity-90 mt-1 font-medium">{alert.message}</p>
              </div>
            </div>

            <Link
              href={alert.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 transition-colors shadow-2xs ${alert.btnColor}`}
            >
              <span>Xem & Xử Lý</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
