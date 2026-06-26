'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  User,
  Briefcase,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

interface ReportItem {
  id: string;
  reason: string;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'REJECTED';
  reporter: {
    fullName: string;
    email: string;
  };
  targetUser: {
    fullName: string;
    email: string;
  } | null;
  task: {
    id: string;
    title: string;
  } | null;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Confirmation state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; status: 'REVIEWED' | 'RESOLVED' | 'REJECTED' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
      };
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get('/api/reports', { params });
      const data = res.data;
      if (data.success) {
        setReports(data.data.reports);
        setTotal(data.data.total);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch reports.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleViewDetails = async (id: string) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    setSelectedReport(null);
    try {
      const res = await apiClient.get(`/api/reports/${id}`);
      const data = res.data;
      if (data.success) {
        setSelectedReport(data.data);
      }
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to load report details.', 'error');
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'REVIEWED' | 'RESOLVED' | 'REJECTED') => {
    setActionLoading(true);
    try {
      const res = await apiClient.put(`/api/reports/${id}`, { status: newStatus });
      const data = res.data;
      if (data.success) {
        // Update list
        setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        // Update detail modal
        if (selectedReport && selectedReport.id === id) {
          setSelectedReport({ ...selectedReport, status: newStatus });
        }
        toast(`Report status updated to ${newStatus} successfully!`, 'success');
        setConfirmOpen(false);
        setConfirmTarget(null);
      }
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to update report status.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Manage Reports</h2>
        <p className="text-zinc-400 mt-1">Audit abuse and policy violation reports filed by users.</p>
      </div>

      {/* Filters Card */}
      <Card className="flex flex-col sm:flex-row gap-4 items-center">
        {/* Status Filter */}
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Report Description</th>
                <th className="px-6 py-3.5 font-semibold">Reporter</th>
                <th className="px-6 py-3.5 font-semibold">Reported Target</th>
                <th className="px-6 py-3.5 font-semibold text-center">Status</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">Loading reports...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-red-400">{error}</p>
                      <button
                        onClick={fetchReports}
                        className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 text-zinc-200 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
                      >
                        Retry Load
                      </button>
                    </div>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">No reports found matching query.</td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-zinc-900/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white truncate max-w-[200px]" title={report.reason}>
                        {report.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{report.reporter.fullName}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{report.reporter.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {report.targetUser ? (
                        <div>
                          <div className="font-medium text-zinc-300 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-zinc-500" />
                            <span>{report.targetUser.fullName}</span>
                          </div>
                          <div className="text-xs text-zinc-500 pl-5 mt-0.5">{report.targetUser.email}</div>
                        </div>
                      ) : report.task ? (
                        <div className="text-xs text-zinc-300 flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-zinc-500" />
                          <span>Task: <strong className="text-white truncate max-w-[120px] inline-block align-bottom">{report.task.title}</strong></span>
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-xs italic">Platform abuse</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                        report.status === 'PENDING' ? 'bg-amber-950/40 text-amber-300 border-amber-800/40 animate-pulse' :
                        report.status === 'REVIEWED' ? 'bg-blue-950/40 text-blue-300 border-blue-800/40' :
                        report.status === 'RESOLVED' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                        'bg-red-950/40 text-red-300 border-red-800/40'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewDetails(report.id)}
                        className="rounded-lg p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/60 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        title="View Report details"
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
          <div className="flex items-center justify-between border-t border-zinc-900 px-6 py-4">
            <div className="text-xs text-zinc-555">
              Showing page <span className="font-semibold text-white">{page}</span> of{' '}
              <span className="font-semibold text-white">{totalPages}</span> ({total} reports)
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

      {/* Report Details Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Abuse Ticket Audit"
      >
        {detailLoading ? (
          <div className="py-8 text-center text-zinc-500">Loading ticket details...</div>
        ) : !selectedReport ? (
          <div className="py-8 text-center text-zinc-500">Failed to load report info.</div>
        ) : (
          <div className="space-y-6 text-sm">
            {/* Reason details */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Violation Reason Description</span>
              </h5>
              <p className="text-zinc-200 leading-relaxed bg-zinc-900/35 border border-zinc-900 p-3 rounded-lg">
                "{selectedReport.reason}"
              </p>
            </div>

            {/* Reporter Profile */}
            <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-4 space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Reporter User</h5>
              <div>
                <div className="font-semibold text-white">{selectedReport.reporter.fullName}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{selectedReport.reporter.email}</div>
                {selectedReport.reporter.phone && <div className="text-xs text-zinc-500">Phone: {selectedReport.reporter.phone}</div>}
              </div>
            </div>

            {/* Target Profile */}
            {selectedReport.targetUser && (
              <div className="bg-red-950/5 border border-red-900/10 rounded-xl p-4 space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-red-400">Reported Target User</h5>
                <div>
                  <div className="font-semibold text-white">{selectedReport.targetUser.fullName}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{selectedReport.targetUser.email}</div>
                  {selectedReport.targetUser.phone && <div className="text-xs text-zinc-500">Phone: {selectedReport.targetUser.phone}</div>}
                </div>
              </div>
            )}

            {/* Target Task */}
            {selectedReport.task && (
              <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-4 space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Reported Task Listing</h5>
                <div>
                  <div className="font-semibold text-white">{selectedReport.task.title}</div>
                  <div className="text-xs text-zinc-500 mt-1 flex justify-between">
                    <span>Task Type: {selectedReport.task.taskType}</span>
                    <span>Status: <strong>{selectedReport.task.status}</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* Ticket status */}
            <div className="flex justify-between items-center bg-zinc-900/30 p-3 rounded-lg border border-zinc-900 text-xs">
              <span className="text-zinc-500">Current ticket status</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium border ${
                selectedReport.status === 'PENDING' ? 'bg-amber-950/40 text-amber-300 border-amber-800/40 animate-pulse' :
                selectedReport.status === 'REVIEWED' ? 'bg-blue-950/40 text-blue-300 border-blue-800/40' :
                selectedReport.status === 'RESOLVED' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                'bg-red-950/40 text-red-300 border-red-800/40'
              }`}>
                {selectedReport.status}
              </span>
            </div>

            {/* Actions */}
            <div className="border-t border-zinc-900 pt-4 flex flex-wrap gap-2">
              {selectedReport.status === 'PENDING' && (
                <button
                  onClick={() => {
                    setConfirmTarget({ id: selectedReport.id, status: 'REVIEWED' });
                    setConfirmOpen(true);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  Mark Under Review
                </button>
              )}
              {selectedReport.status !== 'RESOLVED' && (
                <button
                  onClick={() => {
                    setConfirmTarget({ id: selectedReport.id, status: 'RESOLVED' });
                    setConfirmOpen(true);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  Resolve ticket
                </button>
              )}
              {selectedReport.status !== 'REJECTED' && (
                <button
                  onClick={() => {
                    setConfirmTarget({ id: selectedReport.id, status: 'REJECTED' });
                    setConfirmOpen(true);
                  }}
                  className="bg-red-950 border border-red-900/40 hover:bg-red-900 text-red-200 font-semibold py-2.5 px-3 rounded-xl text-xs transition-all cursor-pointer text-center animate-pulse"
                >
                  Reject ticket
                </button>
              )}
              <button
                onClick={() => setDetailModalOpen(false)}
                className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer text-center"
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
          await handleUpdateStatus(confirmTarget.id, confirmTarget.status);
        }}
        title={
          confirmTarget?.status === 'REVIEWED' ? 'Mark Report Under Review' :
          confirmTarget?.status === 'RESOLVED' ? 'Resolve Report Ticket' :
          'Reject Report Ticket'
        }
        description={
          confirmTarget
            ? confirmTarget.status === 'REVIEWED'
              ? 'Are you sure you want to mark this abuse ticket as reviewed and active under audit?'
              : confirmTarget.status === 'RESOLVED'
              ? 'Are you sure you want to mark this ticket as resolved? This marks the report as closed.'
              : 'Are you sure you want to reject this ticket? It will status transition to rejected.'
            : ''
        }
        confirmText={
          confirmTarget?.status === 'REVIEWED' ? 'Mark Reviewed' :
          confirmTarget?.status === 'RESOLVED' ? 'Confirm Resolve' :
          'Confirm Reject'
        }
      />
    </div>
  );
}
