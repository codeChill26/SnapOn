import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel',
  isLoading = false,
}: ConfirmationDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        {/* Warning Icon & Description */}
        <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-rose-950">Warning: Destructive Operation</p>
            <p className="mt-1 text-rose-800 text-xs leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-3 border-t border-[#E4E4E7]">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="flex-1 bg-[#F4F4F5] border border-[#E4E4E7] hover:bg-[#E4E4E7] disabled:opacity-50 py-2.5 px-4 rounded-xl font-bold text-[#18181B] transition-colors cursor-pointer text-center text-sm"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/50 py-2.5 px-4 rounded-xl font-bold text-white transition-colors cursor-pointer text-center flex items-center justify-center gap-2 text-sm shadow-xs"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
