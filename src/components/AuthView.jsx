import React, { useState, useEffect } from 'react';
import { 
  Milk, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Settings,
  KeyRound
} from 'lucide-react';
import { DAIRY_NAME, DAIRY_TAGLINE, AUTHORIZED_SELLER_EMAIL } from '../utils/constants';
import { isSupabaseConfigured } from '../utils/supabase.js';
import { 
  signInUser, 
  sendPasswordResetEmail, 
  updateUserPassword 
} from '../utils/authService.js';
import BackendSetupModal from './BackendSetupModal';

export default function AuthView({ onAuthSuccess, showToast }) {
  // Mode: 'login' | 'forgot-password' | 'update-password'
  const [mode, setMode] = useState('login');

  // Form Fields
  const [email, setEmail] = useState(AUTHORIZED_SELLER_EMAIL);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Setup Modal
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [backendConfigured, setBackendConfigured] = useState(isSupabaseConfigured());

  // Check URL hash for password recovery callback
  useEffect(() => {
    if (typeof window !== 'undefined' && 
       (window.location.hash.includes('type=recovery') || window.location.hash.includes('reset-password'))) {
      setMode('update-password');
    }
  }, []);

  const refreshBackendStatus = () => {
    setBackendConfigured(isSupabaseConfigured());
  };

  // 1. Seller Sign-In Handler
  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim().toLowerCase();

    // Enforce single-seller restriction
    if (cleanEmail !== AUTHORIZED_SELLER_EMAIL.toLowerCase()) {
      setErrorMessage(`Access denied. Only the authorized Dairy Seller (${AUTHORIZED_SELLER_EMAIL}) is permitted to log in.`);
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    if (!backendConfigured) {
      setErrorMessage("Authentication provider is not connected. Please click 'Configure Backend' to connect your Supabase project.");
      return;
    }

    setLoading(true);
    const result = await signInUser({ email: cleanEmail, password });
    setLoading(false);

    if (result.success) {
      showToast(`Welcome back, Dr. Sanjay Kumar!`, 'success');
      onAuthSuccess(result.user);
    } else {
      setErrorMessage(result.error);
    }
  };

  // 2. Forgot Password Request Handler
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail !== AUTHORIZED_SELLER_EMAIL.toLowerCase()) {
      setErrorMessage(`Password reset is only available for the authorized Dairy Seller (${AUTHORIZED_SELLER_EMAIL}).`);
      return;
    }

    setLoading(true);
    const result = await sendPasswordResetEmail(cleanEmail);
    setLoading(false);

    if (result.success) {
      setSuccessMessage(result.message);
    } else {
      setErrorMessage(result.error);
    }
  };

  // 3. Update Password Handler (after clicking recovery link)
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await updateUserPassword(newPassword);
    setLoading(false);

    if (result.success) {
      setSuccessMessage(result.message);
      showToast("Password updated successfully! You can now sign in.", "success");
      setTimeout(() => {
        setMode('login');
        setPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setSuccessMessage('');
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }, 2000);
    } else {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50/40 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      
      {/* Backend Status Alert if not connected */}
      {!backendConfigured && (
        <div className="max-w-md mx-auto w-full px-4 mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900 shadow-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Supabase Backend Unconnected</p>
              <p className="mt-0.5 text-amber-700">Connect your Supabase Project URL and Public Anon Key to enable live database authentication.</p>
              <button
                type="button"
                onClick={() => setSetupModalOpen(true)}
                className="mt-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-md transition-colors inline-flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                Configure Backend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 mb-4 ring-4 ring-emerald-100">
            <Milk className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {DAIRY_NAME}
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-emerald-700 tracking-wide">
            {DAIRY_TAGLINE}
          </p>
          
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Authorized Seller Portal</span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="mt-6 bg-white py-8 px-6 sm:px-8 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-200/80 relative">
          
          {/* Notifications */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* MODE 1: SELLER LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Seller Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4 text-emerald-600" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={AUTHORIZED_SELLER_EMAIL}
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Restricted to authorized account: <span className="font-mono text-emerald-700 font-semibold">{AUTHORIZED_SELLER_EMAIL}</span>
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot-password');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter seller password"
                    className="block w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In as Seller</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE 2: FORGOT PASSWORD */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-center mb-2">
                <KeyRound className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-900">Reset Seller Password</h3>
                <p className="text-xs text-slate-500 mt-1">
                  A secure password reset link will be sent to the authorized seller inbox.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Authorized Seller Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4 text-emerald-600" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={AUTHORIZED_SELLER_EMAIL}
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
              >
                {loading ? "Sending link..." : "Send Reset Link"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="w-full text-center text-xs font-bold text-slate-600 hover:text-slate-900 mt-2"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* MODE 3: UPDATE PASSWORD */}
          {mode === 'update-password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="text-center mb-2">
                <Lock className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-900">Set New Seller Password</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your new password for {AUTHORIZED_SELLER_EMAIL}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Password & Sign In"}
              </button>
            </form>
          )}

          {/* Security & Access Notice */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Row-Level Security Enforced
            </span>
            <button
              type="button"
              onClick={() => setSetupModalOpen(true)}
              className="hover:text-slate-600 transition-colors flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              <span>Backend Status</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          © {new Date().getFullYear()} {DAIRY_NAME}. Private Seller Management System.
        </p>
      </div>

      {/* Backend Setup Modal */}
      <BackendSetupModal
        isOpen={setupModalOpen}
        onClose={() => {
          setSetupModalOpen(false);
          refreshBackendStatus();
        }}
      />
    </div>
  );
}
