'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info as InfoIcon } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Floating container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-slide-in text-sm ${
              t.type === 'success'
                ? 'bg-emerald-950/85 text-emerald-200 border-emerald-800/40'
                : t.type === 'error'
                ? 'bg-red-950/85 text-red-200 border-red-800/40'
                : 'bg-zinc-900/85 text-zinc-200 border-zinc-800/40'
            }`}
          >
            {/* Icon */}
            {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
            {t.type === 'error' && <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />}
            {t.type === 'info' && <InfoIcon className="h-5 w-5 text-indigo-400 shrink-0" />}

            {/* Message */}
            <div className="flex-1 font-medium">{t.message}</div>

            {/* Close Button */}
            <button
              onClick={() => dismiss(t.id)}
              className="text-zinc-400 hover:text-white shrink-0 rounded p-0.5 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
