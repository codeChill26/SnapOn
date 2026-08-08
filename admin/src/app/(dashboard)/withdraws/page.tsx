'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  CheckCircle,
  XCircle,
  Wallet,
  Building,
  User
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

interface WithdrawItem {
  id: string;
  amount: string;
  bankName: string;
  bankAccountNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  user: {
    fullName: string;
    email: string;
  };
}

export default function WithdrawsPage() {
  const { toast } = useToast();
  const [withdraws, setWithdraws] = useState<WithdrawItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Confirmation state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; status: 'APPROVED' | 'REJECTED'; amount: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchWithdraws = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
      };
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get('/api/withdraws', { params });
      const data = res.data;
      if (data.success) {
        setWithdraws(data.data.withdraws);
        setTotal(data.data.total);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch withdrawal requests.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter]);

  useEffect(() => {
    fetchWithdraws();
  }, [fetchWithdraws]);

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleViewDetails = async (id: string) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    setSelectedRequest(null);
    try {
      const res = await apiClient.get(`/api/withdraws/${id}`);
      const data = res.data;
      if (data.success) {
        setSelectedRequest(data.data);
      }
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to load withdrawal details.', 'error');
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleProcessRequest = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setActionLoading(true);
    try {
      const res = await apiClient.put(`/api/withdraws/${id}`, { status: newStatus });
      const data = res.data;

      if (data.success) {
        toast(`Withdrawal request ${newStatus.toLowerCase()} successfully!`, 'success');
        // Update list local status
        setWithdraws(prev => prev.map(w => w.id === id ? { ...w, status: newStatus } : w));
        setDetailModalOpen(false);
        setConfirmOpen(false);
        setConfirmTarget(null);
        fetchWithdraws();
      }
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to process request.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#18181B]">Withdrawal Payouts</h2>
        <p className="text-[#71717A] text-sm mt-1 font-medium">Audit, approve, and resolve user payout balance withdrawals.</p>
      </div>

      {/* Filters Card */}
      <Card className="flex flex-col sm:flex-row gap-4 items-center bg-white border-[#E4E4E7] shadow-sm">
        {/* Status Filter */}
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl py-2 px-3 text-[#18181B] text-sm focus:outline-none focus:border-[#312F2C] transition-all font-semibold"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
      </Card>

      {/* Data Table Card */}
      <Card className="overflow-hidden bg-white border-[#E4E4E7] shadow-sm p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#71717A]">
            <thead className="bg-[#F4F4F5] text-[11px] uppercase font-extrabold text-[#71717A] border-b border-[#E4E4E7]">
              <tr>
                <th className="px-6 py-3.5">User details</th>
                <th className="px-6 py-3.5">Withdrawal Amount</th>
                <th className="px-6 py-3.5">Bank Destination</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7] text-[#18181B]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-[#71717A] font-medium">Loading withdrawals...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-rose-600 font-bold">{error}</p>
                      <button
                        onClick={fetchWithdraws}
                        className="px-4 py-2 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl hover:bg-[#E4E4E7] text-[#18181B] transition-colors cursor-pointer text-xs font-bold"
                      >
                        Retry Load
                      </button>
                    </div>
                  </td>
                </tr>
              ) : withdraws.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-[#71717A] font-medium">No payout requests found.</td>
                </tr>
              ) : (
                withdraws.map((req) => (
                  <tr key={req.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#18181B]">{req.user.fullName}</div>
                      <div className="text-xs text-[#71717A] font-mono mt-0.5">{req.user.email}</div>
                    </td>
                    <td className="px-6 py-4 text-emerald-700 font-extrabold text-base">
                      {Number(req.amount).toLocaleString('vi-VN')} VND
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[#18181B] flex items-center gap-1.5">
                        <Building className="h-4 w-4 text-[#71717A]" />
                        <span>{req.bankName}</span>
                      </div>
                      <div className="text-xs text-[#71717A] font-mono pl-5 mt-0.5">Acc: {req.bankAccountNumber}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold border ${
                        req.status === 'PENDING' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        req.status === 'APPROVED' || req.status === 'PAID' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewDetails(req.id)}
                        className="rounded-xl p-2 bg-[#F4F4F5] border border-[#E4E4E7] hover:bg-[#E4E4E7] text-[#18181B] transition-colors cursor-pointer shadow-2xs"
                        title="View details & Resolve"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#E4E4E7] px-6 py-4 bg-[#F4F4F5]">
            <div className="text-xs text-[#71717A] font-medium">
              Showing page <span className="font-bold text-[#18181B]">{page}</span> of{' '}
              <span className="font-bold text-[#18181B]">{totalPages}</span> ({total} requests)
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-xl border border-[#E4E4E7] bg-white p-2 text-[#18181B] hover:bg-[#E4E4E7] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-xl border border-[#E4E4E7] bg-white p-2 text-[#18181B] hover:bg-[#E4E4E7] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Withdrawal Request Audit"
      >
        {detailLoading ? (
          <div className="py-8 text-center text-zinc-500">Loading request details...</div>
        ) : !selectedRequest ? (
          <div className="py-8 text-center text-zinc-500">Failed to load request info.</div>
        ) : (
          <div className="space-y-6 text-sm">
            {/* Payout sum */}
            <div className="flex flex-col items-center bg-zinc-900/40 border border-zinc-900 py-6 rounded-2xl">
              <span className="text-xs uppercase text-zinc-505 font-semibold">Payout Amount Requested</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                <span>{Number(selectedRequest.amount).toLocaleString('vi-VN')} VND</span>
              </div>
            </div>

            {/* Payout Details Grid */}
            <div className="grid grid-cols-2 gap-4 border-t border-b border-zinc-900 py-4">
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Bank Name</div>
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-zinc-500" />
                  <span>{selectedRequest.bankName}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Account Number</div>
                <div className="font-mono text-white text-sm font-semibold">
                  {selectedRequest.bankAccountNumber}
                </div>
              </div>
            </div>

            {/* User details */}
            <div className="bg-zinc-900/25 border border-zinc-900 rounded-xl p-4 space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-indigo-500" />
                <span>Requesting User Details</span>
              </h5>
              <div>
                <div className="font-semibold text-white">{selectedRequest.user.fullName}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{selectedRequest.user.email}</div>
              </div>
              <div className="border-t border-zinc-800/60 pt-2 flex justify-between items-center text-xs text-zinc-400">
                <span>Current Wallet Balance:</span>
                <strong className="text-emerald-450">
                  {Number(selectedRequest.user.wallet?.balance || 0).toLocaleString('vi-VN')} VND
                </strong>
              </div>
            </div>

            {/* Ticket status */}
            <div className="flex justify-between items-center bg-zinc-900/30 p-3 rounded-lg border border-zinc-900 text-xs">
              <span className="text-zinc-500">Request status</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium border ${
                selectedRequest.status === 'PENDING' ? 'bg-amber-950/40 text-amber-300 border-amber-800/40 animate-pulse' :
                selectedRequest.status === 'APPROVED' || selectedRequest.status === 'PAID' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                'bg-red-950/40 text-red-300 border-red-800/40'
              }`}>
                {selectedRequest.status}
              </span>
            </div>

            {/* Actions */}
            <div className="border-t border-zinc-900 pt-4 flex gap-3">
              {selectedRequest.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => {
                      setConfirmTarget({
                        id: selectedRequest.id,
                        status: 'APPROVED',
                        amount: Number(selectedRequest.amount).toLocaleString('vi-VN'),
                        name: selectedRequest.user.fullName
                      });
                      setConfirmOpen(true);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Approve & Pay</span>
                  </button>
                  <button
                    onClick={() => {
                      setConfirmTarget({
                        id: selectedRequest.id,
                        status: 'REJECTED',
                        amount: Number(selectedRequest.amount).toLocaleString('vi-VN'),
                        name: selectedRequest.user.fullName
                      });
                      setConfirmOpen(true);
                    }}
                    className="flex-1 bg-red-950 border border-red-900/45 hover:bg-red-900 text-red-200 font-semibold py-2.5 px-4 rounded-xl text-sm transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Reject</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setDetailModalOpen(false)}
                className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold py-2 px-4 rounded-xl text-sm transition-colors cursor-pointer text-center"
              >
                Close Audit
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Action Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmOpen}
        isLoading={actionLoading}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
        onConfirm={async () => {
          if (!confirmTarget) return;
          await handleProcessRequest(confirmTarget.id, confirmTarget.status);
        }}
        title={confirmTarget?.status === 'APPROVED' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
        description={
          confirmTarget
            ? confirmTarget.status === 'APPROVED'
              ? `Are you sure you want to APPROVE the payout request of ${confirmTarget.amount} VND for "${confirmTarget.name}"? This action will mark the request as APPROVED and initiate payment transaction.`
              : `Are you sure you want to REJECT the payout request of ${confirmTarget.amount} VND for "${confirmTarget.name}"? Their wallet funds will not be deducted/will be returned.`
            : ''
        }
        confirmText={confirmTarget?.status === 'APPROVED' ? 'Confirm Approve' : 'Confirm Reject'}
      />
    </div>
  );
}
