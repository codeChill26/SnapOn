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
        <div className="flex items-start gap-3 p-3 bg-red-950/20 border border-red-900/30 text-red-300 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-white">Warning: Destructive Operation</p>
            <p className="mt-1 text-zinc-400">{description}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-3 border-t border-zinc-900">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-50 py-2.5 px-4 rounded-xl font-semibold text-zinc-300 transition-colors cursor-pointer text-center text-sm"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 py-2.5 px-4 rounded-xl font-semibold text-white transition-colors cursor-pointer text-center flex items-center justify-center gap-2 text-sm"
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
