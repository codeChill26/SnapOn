'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Scale,
  CheckCircle,
  Undo2,
  BadgeCheck,
  User,
  Briefcase,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

type ViewMode = 'DISPUTED' | 'REFUND_MANUAL';
type ResolveAction = 'RELEASE' | 'REFUND' | 'MARK_REFUNDED';

interface EscrowItem {
  id: string;
  amount: string;
  platformFeeAmount: string;
  discountAmount: string;
  status: string;
  orderCode: number | null;
  disputeReason: string | null;
  createdAt: string;
  task: { id: string; title: string };
  poster: { id: string; fullName: string; email: string };
  tasker: { id: string; fullName: string; email: string };
}

const ACTION_LABEL: Record<ResolveAction, string> = {
  RELEASE: 'Trả tiền cho người làm',
  REFUND: 'Hoàn tiền cho người thuê',
  MARK_REFUNDED: 'Đã hoàn tiền thủ công xong',
};

export default function DisputesPage() {
  const { toast } = useToast();
  const [view, setView] = useState<ViewMode>('DISPUTED');
  const [escrows, setEscrows] = useState<EscrowItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ escrow: EscrowItem; action: ResolveAction } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEscrows = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await apiClient.get('/api/disputes', {
        params: { page: page.toString(), limit: limit.toString(), view },
      });
      const data = res.data;
      if (data.success) {
        setEscrows(data.data.escrows);
        setTotal(data.data.total);
      }
    } catch (err: any) {
      console.error(err);
      if (!silent) setError(err.message || 'Failed to fetch disputes.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, limit, view]);

  useEffect(() => {
    fetchEscrows();
  }, [fetchEscrows]);

  // Near real-time refresh
  useEffect(() => {
    const id = setInterval(() => fetchEscrows(true), 15000);
    return () => clearInterval(id);
  }, [fetchEscrows]);

  const handleResolve = async (escrowId: string, action: ResolveAction) => {
    setActionLoading(true);
    try {
      const res = await apiClient.put(`/api/disputes/${escrowId}`, { action });
      if (res.data.success) {
        toast(`${ACTION_LABEL[action]} — thành công!`, 'success');
        setConfirmOpen(false);
        setConfirmTarget(null);
        fetchEscrows();
      }
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Xử lý thất bại.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const fmt = (v: string | number) => Number(v).toLocaleString('vi-VN');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Escrow Disputes</h2>
        <p className="text-zinc-400 mt-1">
          Phân xử tranh chấp ký quỹ và theo dõi các khoản cần hoàn tiền thủ công (PayOS).
        </p>
      </div>

      {/* View switch */}
      <Card className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex gap-2">
          <button
            onClick={() => { setView('DISPUTED'); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              view === 'DISPUTED'
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5"><Scale className="h-4 w-4" /> Tranh chấp</span>
          </button>
          <button
            onClick={() => { setView('REFUND_MANUAL'); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              view === 'REFUND_MANUAL'
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5"><Undo2 className="h-4 w-4" /> Cần hoàn tiền thủ công</span>
          </button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Công việc</th>
                <th className="px-6 py-3.5 font-semibold">Người thuê / Người làm</th>
                <th className="px-6 py-3.5 font-semibold">Số tiền</th>
                <th className="px-6 py-3.5 font-semibold">Lý do khiếu nại</th>
                <th className="px-6 py-3.5 font-semibold text-right">Xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-zinc-300">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-zinc-500">Đang tải...</td></tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-red-400">{error}</p>
                      <button
                        onClick={() => fetchEscrows()}
                        className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 text-zinc-200 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
                      >
                        Thử lại
                      </button>
                    </div>
                  </td>
                </tr>
              ) : escrows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">
                    {view === 'DISPUTED' ? 'Không có tranh chấp nào.' : 'Không có khoản nào cần hoàn tiền thủ công.'}
                  </td>
                </tr>
              ) : (
                escrows.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-900/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4 text-zinc-500" />
                        <span>{e.task?.title || '—'}</span>
                      </div>
                      {e.orderCode && (
                        <div className="text-xs text-zinc-500 font-mono mt-0.5">PayOS #{e.orderCode}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <span className="text-zinc-500">Thuê:</span>{' '}
                        <span className="text-white font-medium">{e.poster?.fullName}</span>
                      </div>
                      <div className="text-xs mt-0.5">
                        <span className="text-zinc-500">Làm:</span>{' '}
                        <span className="text-white font-medium">{e.tasker?.fullName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-emerald-400 font-semibold">{fmt(e.amount)} VND</div>
                      <div className="text-xs text-zinc-500 mt-0.5">Phí sàn: {fmt(e.platformFeeAmount)} VND</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-xs text-zinc-400 line-clamp-3">{e.disputeReason || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {view === 'DISPUTED' ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setConfirmTarget({ escrow: e, action: 'RELEASE' }); setConfirmOpen(true); }}
                            className="rounded-lg px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                            title="Trả tiền cho người làm"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Trả worker</span>
                          </button>
                          <button
                            onClick={() => { setConfirmTarget({ escrow: e, action: 'REFUND' }); setConfirmOpen(true); }}
                            className="rounded-lg px-3 py-1.5 bg-red-950 border border-red-900/45 hover:bg-red-900 text-red-200 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                            title="Hoàn tiền cho người thuê"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            <span>Hoàn poster</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setConfirmTarget({ escrow: e, action: 'MARK_REFUNDED' }); setConfirmOpen(true); }}
                          className="rounded-lg px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          title="Đánh dấu đã chuyển khoản hoàn tiền xong"
                        >
                          <BadgeCheck className="h-3.5 w-3.5" />
                          <span>Đã hoàn xong</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-900 px-6 py-4">
            <div className="text-xs text-zinc-500">
              Trang <span className="font-semibold text-white">{page}</span> /{' '}
              <span className="font-semibold text-white">{totalPages}</span> ({total} bản ghi)
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmationDialog
        isOpen={confirmOpen}
        isLoading={actionLoading}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={async () => {
          if (!confirmTarget) return;
          await handleResolve(confirmTarget.escrow.id, confirmTarget.action);
        }}
        title={confirmTarget ? ACTION_LABEL[confirmTarget.action] : ''}
        description={
          confirmTarget
            ? confirmTarget.action === 'RELEASE'
              ? `Trả ${fmt(Number(confirmTarget.escrow.amount) - Number(confirmTarget.escrow.platformFeeAmount))} VND tiền công cho "${confirmTarget.escrow.tasker?.fullName}" (đã trừ phí sàn)? Task sẽ được đánh dấu hoàn thành.`
              : confirmTarget.action === 'REFUND'
              ? `Hoàn ${fmt(confirmTarget.escrow.amount)} VND cho người thuê "${confirmTarget.escrow.poster?.fullName}"? ${confirmTarget.escrow.orderCode ? 'Khoản này thanh toán qua PayOS — sau khi xác nhận, cần chuyển khoản hoàn tiền thủ công (sẽ hiện trong tab "Cần hoàn tiền thủ công").' : ''}`
              : `Xác nhận đã chuyển khoản hoàn ${fmt(confirmTarget.escrow.amount)} VND cho "${confirmTarget.escrow.poster?.fullName}"? Bản ghi sẽ rời khỏi danh sách chờ hoàn tiền.`
            : ''
        }
        confirmText="Xác nhận"
      />
    </div>
  );
}
