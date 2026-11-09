import React, { useState, useEffect } from 'react';
import { 
  Milk, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Phone, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  Building2, 
  Users,
  AlertCircle,
  CheckCircle2,
  Settings,
  KeyRound,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { DAIRY_NAME, DAIRY_TAGLINE } from '../utils/constants';
import { isSupabaseConfigured } from '../utils/supabase.js';
import { 
  signInUser, 
  signUpUser, 
  signInWithGoogleOAuth, 
  sendPasswordResetEmail, 
  updateUserPassword 
} from '../utils/authService.js';
import BackendSetupModal from './BackendSetupModal';

export default function AuthView({ onAuthSuccess, showToast }) {
  // Mode: 'login' | 'signup' | 'forgot-password' | 'update-password'
  const [mode, setMode] = useState('login');
  // Role: 'seller' | 'customer'
  const [role, setRole] = useState('seller');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [usualQuantityKg, setUsualQuantityKg] = useState('1.0');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);

  // Setup Modal
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [backendConfigured, setBackendConfigured] = useState(isSupabaseConfigured());

  // Check URL hash for recovery/password reset callback
  useEffect(() => {
    if (window.location.hash.includes('type=recovery') || window.location.hash.includes('reset-password')) {
      setMode('update-password');
    }
  }, []);

  const refreshBackendStatus = () => {
    setBackendConfigured(isSupabaseConfigured());
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!backendConfigured) {
      setErrorMessage("Authentication provider is not configured. Please click 'Configure Backend' to connect your Supabase project.");
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    const result = await signInUser({ email, password });
    setLoading(false);

    if (result.success) {
      showToast(`Welcome back, ${result.user.name}!`, 'success');
      onAuthSuccess(result.user);
    } else {
      setErrorMessage(result.error);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!backendConfigured) {
      setErrorMessage("Authentication provider is not configured. Please click 'Configure Backend' to connect your Supabase project.");
      return;
    }

    if (!name.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const result = await signUpUser({
      email,
      password,
      name,
      role,
      phone,
      address,
      usualQuantityKg: parseFloat(usualQuantityKg) || 1.0
    });
    setLoading(false);

    if (result.success) {
      if (result.needsEmailVerification) {
        setVerificationPending(true);
        setSuccessMessage(`Account created! A confirmation email has been sent to ${email}. Please verify your email before signing in.`);
      } else {
        showToast(`Account created successfully! Welcome, ${result.user?.user_metadata?.name || name}.`, 'success');
        if (result.session) {
          onAuthSuccess({
            id: result.user.id,
            email: result.user.email,
            name: name.trim(),
            role: role,
            phone: phone.trim(),
            address: address.trim()
          });
        } else {
          setMode('login');
          setSuccessMessage("Account created successfully! Please sign in with your credentials.");
        }
      }
    } else {
      setErrorMessage(result.error);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!backendConfigured) {
      setErrorMessage("Authentication provider is not configured. Please connect your Supabase project.");
      return;
    }

    if (!email.trim()) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    const result = await sendPasswordResetEmail(email);
    setLoading(false);

    if (result.success) {
      setSuccessMessage(result.message);
    } else {
      setErrorMessage(result.error);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const result = await updateUserPassword(newPassword);
    setLoading(false);

    if (result.success) {
      showToast("Password updated successfully! Please sign in with your new password.", "success");
      window.location.hash = '';
      setMode('login');
      setPassword(newPassword);
    } else {
      setErrorMessage(result.error);
    }
  };

  const handleGoogleOAuth = async () => {
    setErrorMessage('');
    if (!backendConfigured) {
      setErrorMessage("Authentication provider is not configured. Please connect your Supabase project to enable Google OAuth.");
      return;
    }

    setLoading(true);
    const result = await signInWithGoogleOAuth(role);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Backend Setup Modal */}
      <BackendSetupModal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        onConfigSaved={() => {
          refreshBackendStatus();
          setSetupModalOpen(false);
          showToast("Supabase backend connected successfully!", "success");
        }}
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-3 shadow-xl shadow-emerald-500/25 ring-4 ring-emerald-500/20 mb-3 items-center justify-center text-white">
            <Milk className="w-9 h-9 stroke-[2.3]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {DAIRY_NAME}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {DAIRY_TAGLINE}
          </p>
        </div>

        {/* Backend Configuration Warning Banner (Shown only when unconfigured) */}
        {!backendConfigured && (
          <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs shadow-lg backdrop-blur-md">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-amber-100 block">
                  Backend Setup Required
                </span>
                <p className="text-amber-200/80 mt-0.5 leading-relaxed">
                  Real authentication with password hashing and row isolation requires connecting your Supabase project. Passwords are never stored in browser storage.
                </p>
                <button
                  type="button"
                  onClick={() => setSetupModalOpen(true)}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-900 font-extrabold text-xs shadow-xs hover:bg-amber-400 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configure Supabase Backend (2 mins)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Auth Box Container */}
        <div className="mt-6 bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          
          {/* Top Bar for Reset Password Mode */}
          {mode === 'update-password' ? (
            <div className="mb-6">
              <h2 className="text-lg font-black text-slate-900">
                Set New Password
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your new secure password below to complete account recovery.
              </p>
            </div>
          ) : mode === 'forgot-password' ? (
            <div className="mb-6">
              <h2 className="text-lg font-black text-slate-900">
                Reset Your Password
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                We will send password reset instructions to your verified email address.
              </p>
            </div>
          ) : (
            <>
              {/* Role Selection Tabs (Seller vs Customer) */}
              <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setRole('seller');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    role === 'seller'
                      ? 'bg-white text-emerald-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Seller Portal</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('customer');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    role === 'customer'
                      ? 'bg-white text-emerald-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Customer Portal</span>
                </button>
              </div>

              {/* Mode Switch Header (Sign In vs Sign Up) */}
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {mode === 'login' 
                      ? (role === 'seller' ? 'Seller Sign In' : 'Customer Sign In') 
                      : (role === 'seller' ? 'Create Seller Account' : 'Customer Sign Up')}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {role === 'seller' 
                      ? 'Dairy management & monthly billing' 
                      : 'Check daily milk delivered & bills'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  {mode === 'login' ? 'New here? Sign Up' : 'Have account? Sign In'}
                </button>
              </div>
            </>
          )}

          {/* Social Google OAuth (Only for login and signup) */}
          {(mode === 'login' || mode === 'signup') && (
            <>
              <button
                type="button"
                onClick={handleGoogleOAuth}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm shadow-xs transition-colors mb-5 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-semibold">
                    Or with email & password
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Verification Pending Alert */}
          {verificationPending && (
            <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Verification Email Sent</span>
              </div>
              <p>
                Please check your inbox at <strong>{email}</strong> and click the link to confirm your account. After confirming, you can sign in below.
              </p>
            </div>
          )}

          {/* Error Message Display */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message Display */}
          {successMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder={role === 'seller' ? 'seller@dairy.com' : 'customer@gmail.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot-password');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : `Sign In as ${role === 'seller' ? 'Seller' : 'Customer'}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* 2. SIGN UP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder={role === 'seller' ? 'Dr. Sanjay Kumar' : 'e.g. Ramesh Sharma'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Password (min 6 characters) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Customer Specific Registration Fields */}
              {role === 'customer' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          placeholder="9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Daily Milk (kg)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={usualQuantityKg}
                        onChange={(e) => setUsualQuantityKg(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-mono-numbers focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Delivery Address
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="House No, Colony, Landmark..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Creating Account...' : 'Complete Sign Up'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD FORM */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Registered Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="your-email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>{loading ? 'Sending Request...' : 'Send Password Reset Link'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* 4. SET NEW PASSWORD FORM (RECOVERY FLOW) */}
          {mode === 'update-password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  New Password (min 6 characters) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="New secure password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Updating Password...' : 'Save New Password & Sign In'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Footer Security Badges */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Database Row-Level Security</span>
            </span>
            <button
              type="button"
              onClick={() => setSetupModalOpen(true)}
              className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              <span>Backend Config</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
