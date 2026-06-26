'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { formatImageUrl } from '@/lib/image-utils';
import { 
  DollarSign, 
  User, 
  MapPin, 
  Wallet, 
  Info, 
  Briefcase 
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

interface TaskDetailModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function TaskDetailModal({ taskId, isOpen, onClose, onRefresh }: TaskDetailModalProps) {
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Cancel flow state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Delete flow state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails(taskId);
    } else {
      setSelectedTask(null);
    }
  }, [isOpen, taskId]);

  const fetchTaskDetails = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await apiClient.get(`/api/tasks/${id}`);
      const data = res.data;
      if (data.success) {
        setSelectedTask(data.data);
      }
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to load task details.', 'error');
      onClose();
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenCancel = () => {
    setCancelReason('');
    setCancelError(null);
    setCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelError(null);
    setCancelSubmitting(true);

    try {
      const res = await apiClient.post(`/api/tasks/${selectedTask.id}/cancel`, {
        reason: cancelReason,
      });
      const data = res.data;

      if (data.success) {
        toast('Task listing successfully cancelled.', 'success');
        setCancelModalOpen(false);
        onClose();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      setCancelError(err.message || 'Operation failed');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const executeDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await apiClient.delete(`/api/tasks/${selectedTask.id}`);
      const data = res.data;
      if (data.success) {
        toast('Task permanently deleted from the database.', 'success');
        setDeleteConfirmOpen(false);
        onClose();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to delete task.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Task Detailed Review"
      >
        {detailLoading ? (
          <div className="py-8 text-center text-zinc-550">Loading task details...</div>
        ) : !selectedTask ? (
          <div className="py-8 text-center text-zinc-550">Failed to load task info.</div>
        ) : (
          <div className="space-y-6 text-sm">
            {/* Title */}
            <div>
              <h4 className="text-lg font-bold text-white leading-tight">{selectedTask.title}</h4>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs font-semibold px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 uppercase">
                  {selectedTask.taskType}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 uppercase">
                  {selectedTask.category?.name || 'General'}
                </span>
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold border ${
                  selectedTask.status === 'OPEN' ? 'bg-blue-950/40 text-blue-300 border-blue-800/40' :
                  selectedTask.status === 'IN_PROGRESS' ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' :
                  selectedTask.status === 'COMPLETED' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                  'bg-red-950/40 text-red-300 border-red-850/40'
                }`}>
                  {selectedTask.status}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Description</h5>
              <p className="text-zinc-300 leading-relaxed bg-zinc-900/30 p-3 rounded-lg border border-zinc-900/80 whitespace-pre-wrap">
                {selectedTask.description || 'No description provided.'}
              </p>
            </div>

            {/* Task Image Gallery */}
            {selectedTask.images && selectedTask.images.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Task Attachments / Images</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedTask.images.map((img: string, idx: number) => (
                    <a
                      key={idx}
                      href={formatImageUrl(img)}
                      target="_blank"
                      rel="noreferrer"
                      className="block relative aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors"
                    >
                      <Image
                        src={formatImageUrl(img)}
                        fill
                        alt={`Attachment ${idx + 1}`}
                        className="object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 border-t border-b border-zinc-900 py-4">
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Budget Range</div>
                <div className="font-semibold text-emerald-400 flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    {selectedTask.budgetMin ? `${Number(selectedTask.budgetMin).toLocaleString('vi-VN')} VND` : '0'}
                    {selectedTask.budgetMax ? ` - ${Number(selectedTask.budgetMax).toLocaleString('vi-VN')} VND` : ''}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Final Bid Price</div>
                <div className="font-semibold text-white">
                  {selectedTask.finalPrice ? `${Number(selectedTask.finalPrice).toLocaleString('vi-VN')} VND` : 'No final price'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Employment Details</div>
                <div className="text-zinc-300">
                  {selectedTask.employmentType} ({selectedTask.salaryUnit})
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Allow Insurance</div>
                <div className="text-zinc-300">
                  {selectedTask.allowInsurance ? 'Yes' : 'No'}
                </div>
              </div>
            </div>

            {/* Required Skills */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Required Skills</h5>
              <div className="flex flex-wrap gap-2">
                {selectedTask.requiredSkills && selectedTask.requiredSkills.length > 0 ? (
                  selectedTask.requiredSkills.map((rs: any) => (
                    <span key={rs.skill.id} className="rounded bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-400 border border-zinc-800">
                      {rs.skill.name}
                    </span>
                  ))
                ) : (
                  <span className="text-zinc-550 text-xs italic">No skills required</span>
                )}
              </div>
            </div>

            {/* Poster Details */}
            <div className="space-y-2 bg-zinc-900/20 border border-zinc-900 rounded-xl p-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-indigo-500" />
                <span>Client Poster details</span>
              </h5>
              <div className="flex justify-between items-center text-sm">
                <div>
                  <div className="font-semibold text-white">{selectedTask.poster.fullName}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{selectedTask.poster.email}</div>
                </div>
                <div className="text-xs text-zinc-400">
                  Phone: {selectedTask.poster.phone || 'N/A'}
                </div>
              </div>
            </div>

            {/* Locations */}
            {selectedTask.locations && selectedTask.locations.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-rose-500" />
                  <span>Job Address</span>
                </h5>
                <p className="text-zinc-300 text-xs">{selectedTask.locations[0].address || 'No address details'}</p>
              </div>
            )}

            {/* Assigned Workers Section */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-550 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
                <span>Assigned Workers</span>
              </h5>
              
              {selectedTask.assignedTask && selectedTask.assignedTask.length > 0 ? (
                <div className="space-y-3">
                  {selectedTask.assignedTask.map((assignment: any) => {
                    const worker = assignment.tasker;
                    const bidPrice = assignment.application?.bidPrice;
                    const acceptedDate = selectedTask.updatedAt 
                      ? new Date(selectedTask.updatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'N/A';
                    const isCompleted = assignment.status === 'COMPLETED' ? 'Yes' : 'No';

                    return (
                      <div key={assignment.id} className="bg-zinc-900/35 border border-zinc-900 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0">
                            <img
                              src={formatImageUrl(worker.avatarUrl) || '/default-avatar.png'}
                              alt={`${worker.fullName}'s Avatar`}
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/default-avatar.png';
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span>{worker.fullName}</span>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                                assignment.status === 'ACTIVE' || assignment.status === 'ASSIGNED' ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40' :
                                assignment.status === 'IN_PROGRESS' ? 'bg-blue-950/40 text-blue-300 border-blue-800/40' :
                                assignment.status === 'COMPLETED' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                                'bg-red-950/40 text-red-300 border-red-800/40'
                              }`}>
                                {assignment.status}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-500 mt-0.5">{worker.email}</div>
                            <div className="text-xs text-zinc-500">{worker.phone || 'No phone number'}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-900/50 text-[11px] text-zinc-400">
                          <div>
                            <span className="text-zinc-500 block">Bid Price</span>
                            <span className="text-white font-medium">
                              {bidPrice ? `${Number(bidPrice).toLocaleString('vi-VN')} VND` : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-550 block">Assigned Date</span>
                            <span className="text-white font-medium">{acceptedDate}</span>
                          </div>
                          <div>
                            <span className="text-zinc-550 block">Completed</span>
                            <span className={`${isCompleted === 'Yes' ? 'text-emerald-400' : 'text-zinc-450'} font-medium`}>
                              {isCompleted}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-zinc-500 text-xs italic bg-zinc-900/10 p-3 rounded border border-zinc-900">
                  <Info className="h-4 w-4 text-indigo-500" />
                  <span>No workers have been assigned yet.</span>
                </div>
              )}
            </div>

            {/* Escrow details */}
            {selectedTask.escrow && (
              <div className="space-y-2 bg-emerald-950/10 border border-emerald-900/20 rounded-xl p-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" />
                  <span>Escrow Account Transaction</span>
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Escrow Amount: <strong className="text-white">{Number(selectedTask.escrow.amount).toLocaleString('vi-VN')} VND</strong></div>
                  <div>Platform Fee: <strong className="text-white">{Number(selectedTask.escrow.platformFeeAmount).toLocaleString('vi-VN')} VND</strong></div>
                  <div>Insurance Fee: <strong className="text-white">{Number(selectedTask.escrow.insuranceFeeAmount).toLocaleString('vi-VN')} VND</strong></div>
                  <div>Escrow Status: <strong className="text-emerald-400 uppercase">{selectedTask.escrow.status}</strong></div>
                </div>
              </div>
            )}

            {/* Cancel Details */}
            {selectedTask.status === 'CANCELLED' && (
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl flex items-start gap-2">
                <Info className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-300">
                  <p className="font-semibold text-white">Task was Cancelled by Admin</p>
                  <p className="mt-1">Reason: "{selectedTask.closed_reason || 'No cancellation details'}"</p>
                  {selectedTask.users_tasks_closed_by_idTousers && (
                    <p className="mt-1 text-[10px] text-zinc-550">Processed by: {selectedTask.users_tasks_closed_by_idTousers.fullName}</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-zinc-900 pt-4 flex gap-3">
              {selectedTask.status !== 'CANCELLED' && selectedTask.status !== 'COMPLETED' && (
                <button
                  onClick={handleOpenCancel}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer text-center"
                >
                  Cancel Task
                </button>
              )}
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="bg-red-950 border border-red-900/40 hover:bg-red-900 text-red-200 font-semibold py-2.5 px-4 rounded-xl text-sm transition-all cursor-pointer text-center"
              >
                Delete permanent
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer text-center"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Reason Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Task Listing"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4 text-sm">
          {cancelError && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200">
              {cancelError}
            </div>
          )}

          <div className="p-3 bg-amber-950/20 border border-amber-900/30 text-amber-300 rounded-xl flex items-start gap-2">
            <Info className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span className="text-xs">
              Cancelling a task will change its status to <strong>CANCELLED</strong>. This action is logged.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Cancellation Reason
            </label>
            <textarea
              required
              rows={4}
              placeholder="Provide a detailed reason for cancelling this task (e.g., policy violation, spam, user request)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-zinc-900">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 py-2.5 px-4 rounded-xl font-semibold text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={cancelSubmitting}
              className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 py-2.5 px-4 rounded-xl font-semibold text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {cancelSubmitting ? 'Processing...' : 'Confirm Cancel'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        isLoading={deleteLoading}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Delete Task Permanently"
        description={selectedTask ? `Are you sure you want to permanently delete the task "${selectedTask.title}"? This will delete all bids, applications, address records, and histories related to this task. This action cannot be undone.` : ''}
        confirmText="Confirm Delete"
      />
    </>
  );
}
