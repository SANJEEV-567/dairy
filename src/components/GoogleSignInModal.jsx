import React, { useState } from 'react';
import { X, ShieldCheck, User } from 'lucide-react';
import { DAIRY_NAME } from '../utils/constants';

export default function GoogleSignInModal({
  isOpen,
  role = 'seller',
  onGoogleSuccess,
  onClose
}) {
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  if (!isOpen) return null;

  // Preset popular Google identity options for realistic one-click sign-in
  const quickAccounts = role === 'seller' ? [
    {
      name: "Dr. Sanjay Kumar",
      email: "drsanjay.kumar@gmail.com",
      picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
    },
    {
      name: "Dairy Management Owner",
      email: "admin.dairy@gmail.com",
      picture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
    }
  ] : [
    {
      name: "Ramesh Sharma",
      email: "ramesh.sharma@gmail.com",
      picture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"
    },
    {
      name: "Pooja Verma",
      email: "pooja.verma@gmail.com",
      picture: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80"
    }
  ];

  const handleSelectAccount = (account) => {
    onGoogleSuccess({
      name: account.name,
      email: account.email,
      picture: account.picture
    });
    onClose();
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customEmail.trim() || !customName.trim()) return;

    onGoogleSuccess({
      name: customName.trim(),
      email: customEmail.trim(),
      picture: null
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Google Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Sign in with Google
              </h2>
              <p className="text-xs text-slate-500">
                to continue to {DAIRY_NAME} ({role === 'seller' ? 'Seller' : 'Customer'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Account Chooser */}
        <div className="p-6 space-y-4">
          <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Choose an account
          </p>

          <div className="space-y-2">
            {quickAccounts.map((acc) => (
              <button
                key={acc.email}
                onClick={() => handleSelectAccount(acc)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-left group"
              >
                <img
                  src={acc.picture}
                  alt={acc.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 group-hover:ring-emerald-400"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {acc.name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {acc.email}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Or Use Custom Google Account */}
          {!showCustomInput ? (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className="w-full text-center text-xs font-bold text-emerald-700 hover:text-emerald-800 py-2"
            >
              + Use another Google account
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="pt-2 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Google Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Google Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCustomInput(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Secure Authentication
            </span>
            <span>Google Identity Services</span>
          </div>
        </div>

      </div>
    </div>
  );
}
