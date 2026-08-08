import React from 'react';
import { Card } from '@/components/ui/Card';
import { Activity, CheckCircle2, AlertTriangle, XCircle, Database, ShieldAlert, Flag, Wallet } from 'lucide-react';

interface PlatformHealthPanelProps {
  pendingPayouts: number;
  pendingReports: number;
  pendingDeletions: number;
  dbStatus: 'connected' | 'error';
}

export default function PlatformHealthPanel({
  pendingPayouts,
  pendingReports,
  pendingDeletions,
  dbStatus,
}: PlatformHealthPanelProps) {
  const getHealthLevel = () => {
    if (dbStatus === 'error' || pendingPayouts > 10 || pendingReports > 10) return 'RED';
    if (pendingPayouts > 5 || pendingReports > 5 || pendingDeletions > 0) return 'YELLOW';
    return 'GREEN';
  };

  const health = getHealthLevel();

  const healthBadge = {
    GREEN: { label: 'Optimal System Health', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2 },
    YELLOW: { label: 'Attention Required', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: AlertTriangle },
    RED: { label: 'Critical Action Needed', color: 'bg-rose-100 text-rose-800 border-rose-300', icon: XCircle },
  }[health];

  const StatusIcon = healthBadge.icon;

  const indicators = [
    {
      label: 'Database Connection',
      value: dbStatus === 'connected' ? 'Connected' : 'Error',
      status: dbStatus === 'connected' ? 'GREEN' : 'RED',
      icon: Database,
    },
    {
      label: 'Pending Withdrawals',
      value: `${pendingPayouts} Queue`,
      status: pendingPayouts > 10 ? 'RED' : pendingPayouts > 5 ? 'YELLOW' : 'GREEN',
      icon: Wallet,
    },
    {
      label: 'Open User Reports',
      value: `${pendingReports} Pending`,
      status: pendingReports > 10 ? 'RED' : pendingReports > 5 ? 'YELLOW' : 'GREEN',
      icon: Flag,
    },
    {
      label: 'Account Deletions',
      value: `${pendingDeletions} Pending`,
      status: pendingDeletions > 5 ? 'RED' : pendingDeletions > 0 ? 'YELLOW' : 'GREEN',
      icon: ShieldAlert,
    },
  ];

  return (
    <Card className="p-6 space-y-6 bg-white border-[#E4E4E7] text-[#18181B] shadow-sm">
      <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#312F2C]" />
          <h3 className="text-lg font-bold text-[#18181B] tracking-tight">Sức Khỏe Hệ Thống (Health)</h3>
        </div>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${healthBadge.color}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          <span>{healthBadge.label}</span>
        </div>
      </div>

      <div className="space-y-3">
        {indicators.map((ind, i) => {
          const Icon = ind.icon;
          const statusDot = {
            GREEN: 'bg-emerald-500 shadow-emerald-500/50',
            YELLOW: 'bg-amber-500 shadow-amber-500/50',
            RED: 'bg-rose-500 shadow-rose-500/50 animate-pulse',
          }[ind.status];

          return (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] hover:border-[#D4D4D8] transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white border border-[#E4E4E7] text-[#312F2C] shadow-2xs">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#71717A]">{ind.label}</p>
                  <p className="text-xs font-extrabold text-[#18181B] mt-0.5">{ind.value}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${statusDot} shadow-xs`} />
                <span className="text-[10px] uppercase font-bold text-[#71717A]">{ind.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
