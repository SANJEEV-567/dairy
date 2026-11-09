import React, { useState } from 'react';
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
  Sparkles,
  Building2,
  Users
} from 'lucide-react';
import { DAIRY_NAME, DAIRY_TAGLINE } from '../utils/constants';
import { loginWithEmail, registerAccount, loginWithGoogleAuth } from '../utils/auth';
import GoogleSignInModal from './GoogleSignInModal';

export default function AuthView({ onAuthSuccess, showToast }) {
  // Role selector: 'seller' | 'customer'
  const [role, setRole] = useState('seller');
  // Mode: 'login' | 'register'
  const [mode, setMode] = useState('login');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [usualQuantityKg, setUsualQuantityKg] = useState('1.5');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Google Modal
  const [googleModalOpen, setGoogleModalOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    if (mode === 'login') {
      const res = loginWithEmail(email, password, role);
      setIsLoading(false);
      if (res.success) {
        showToast(`Welcome back, ${res.user.name}! Signed in as ${role === 'seller' ? 'Dairy Seller' : 'Customer'}.`, 'success');
        onAuthSuccess(res.user);
      } else {
        setErrorMessage(res.error);
      }
    } else {
      // Register
      if (!name.trim()) {
        setIsLoading(false);
        setErrorMessage("Please enter your full name");
        return;
      }
      if (password.length < 6) {
        setIsLoading(false);
        setErrorMessage("Password must be at least 6 characters");
        return;
      }

      const res = registerAccount({
        name,
        email,
        password,
        role,
        phone,
        address,
        usualQuantityKg: parseFloat(usualQuantityKg) || 1.0,
        usualPricePerKg: 60
      });

      setIsLoading(false);
      if (res.success) {
        showToast(`Account created successfully! Welcome, ${res.user.name}.`, 'success');
        onAuthSuccess(res.user);
      } else {
        setErrorMessage(res.error);
      }
    }
  };

  const handleGoogleSuccess = (googleData) => {
    const res = loginWithGoogleAuth(googleData, role);
    if (res.success) {
      showToast(`Signed in with Google as ${res.user.name} (${role === 'seller' ? 'Seller' : 'Customer'})`, 'success');
      onAuthSuccess(res.user);
    } else {
      setErrorMessage(res.error || "Google authentication failed");
    }
  };

  // Quick fill helper for testing/reviewing
  const handleQuickFillSeller = () => {
    setRole('seller');
    setMode('login');
    setEmail('drsanjay@dairy.com');
    setPassword('dairy123');
    setErrorMessage('');
  };

  const handleQuickFillCustomer = () => {
    setRole('customer');
    setMode('login');
    setEmail('ramesh.sharma@gmail.com');
    setPassword('customer123');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      
      {/* Background Decorative Dairy Milk Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Google Sign-in Modal */}
      <GoogleSignInModal
        isOpen={googleModalOpen}
        role={role}
        onGoogleSuccess={handleGoogleSuccess}
        onClose={() => setGoogleModalOpen(false)}
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-3 shadow-xl shadow-emerald-500/25 ring-4 ring-emerald-500/20 mb-4 items-center justify-center text-white">
            <Milk className="w-9 h-9 stroke-[2.3]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {DAIRY_NAME}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {DAIRY_TAGLINE}
          </p>
        </div>

        {/* Auth Box */}
        <div className="mt-8 bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          
          {/* Role Selection Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setRole('seller');
                setErrorMessage('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                role === 'seller'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Seller Login</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('customer');
                setErrorMessage('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                role === 'customer'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Customer Login</span>
            </button>
          </div>

          {/* Mode Switch (Sign In vs Register) */}
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {mode === 'login' 
                  ? (role === 'seller' ? 'Seller Sign In' : 'Customer Sign In') 
                  : (role === 'seller' ? 'Register Seller' : 'New Customer Sign Up')}
              </h2>
              <p className="text-xs text-slate-500">
                {role === 'seller' 
                  ? 'Access dairy management & billing system' 
                  : 'View daily milk delivery history & bills'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setErrorMessage('');
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              {mode === 'login' ? 'Create Account' : 'Already have account?'}
            </button>
          </div>

          {/* Continue with Google Button */}
          <button
            type="button"
            onClick={() => setGoogleModalOpen(true)}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm shadow-xs transition-colors mb-5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold">
                Or with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Name (Only in Register mode) */}
            {mode === 'register' && (
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
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder={role === 'seller' ? 'drsanjay@dairy.com' : 'customer@gmail.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Customer Extra Registration Details */}
            {mode === 'register' && role === 'customer' && (
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
                      Daily Milk Qty (kg)
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
                      placeholder="House No, Street, Colony..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase text-slate-600">
                  Password <span className="text-rose-500">*</span>
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (role === 'seller') {
                        setPassword('dairy123');
                        setEmail('drsanjay@dairy.com');
                        showToast("Filled default seller password: dairy123", "success");
                      } else {
                        showToast("For customer password reset, contact Dr. Sanjay Kumar Dairy.", "info");
                      }
                    }}
                    className="text-[11px] text-emerald-700 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {errorMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{mode === 'login' ? `Sign In as ${role === 'seller' ? 'Seller' : 'Customer'}` : 'Complete Registration'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50/80 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-4 rounded-b-3xl">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Test Credentials:
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleQuickFillSeller}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-[11px] font-bold text-slate-700 text-left transition-colors"
              >
                🥛 Fill Seller Login
                <span className="block text-[10px] text-slate-400 font-normal">drsanjay@dairy.com</span>
              </button>
              <button
                type="button"
                onClick={handleQuickFillCustomer}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-[11px] font-bold text-slate-700 text-left transition-colors"
              >
                👤 Fill Customer Login
                <span className="block text-[10px] text-slate-400 font-normal">ramesh.sharma@gmail.com</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
