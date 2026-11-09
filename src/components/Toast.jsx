import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const type = toast.type || 'success';
  const isSuccess = type === 'success';
  const isInfo = type === 'info';

  const containerClasses = isSuccess
    ? 'bg-emerald-900/95 text-emerald-50 border-emerald-700 shadow-emerald-950/20'
    : isInfo
    ? 'bg-sky-900/95 text-sky-50 border-sky-700 shadow-sky-950/20'
    : 'bg-rose-900/95 text-rose-50 border-rose-700 shadow-rose-950/20';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full px-4 animate-in fade-in slide-in-from-bottom-5 duration-300 no-print">
      <div
        className={`flex items-start gap-3 p-4 rounded-xl shadow-xl border ${containerClasses} backdrop-blur-sm`}
      >
        {isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        ) : isInfo ? (
          <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 text-sm font-medium leading-relaxed">
          {toast.message}
        </div>
        <button
          onClick={onClose}
          className="text-slate-300 hover:text-white transition-colors p-1 -mr-1"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
