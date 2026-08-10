import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-lg transform rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto text-[#18181B]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3 mb-4">
          <h3 className="text-lg font-bold text-[#18181B]">{title}</h3>
          <button 
            onClick={onClose} 
            className="rounded-lg p-1 text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="text-[#18181B]">{children}</div>
      </div>
    </div>
  );
}
