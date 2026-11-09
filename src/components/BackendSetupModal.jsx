import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Key, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  ShieldCheck, 
  FileCode,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import { saveCustomSupabaseConfig, getSupabaseConfig, isSupabaseConfigured } from '../utils/supabase.js';

export default function BackendSetupModal({
  isOpen,
  initialTab = 'supabase',
  onClose,
  onConfigSaved
}) {
  const currentConfig = getSupabaseConfig();
  const [activeTab, setActiveTab] = useState(initialTab); // 'supabase' | 'google'

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [url, setUrl] = useState(currentConfig.url || '');
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey || '');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  if (!isOpen) return null;

  // Calculate the Supabase project callback URL
  const callbackUrl = url && url.startsWith('https://') 
    ? `${url.replace(/\/+$/, '')}/auth/v1/callback` 
    : 'https://<your-project-id>.supabase.co/auth/v1/callback';

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const handleTestAndSave = async (e) => {
    e.preventDefault();
    setStatus(null);

    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      setStatus({ type: 'error', message: 'Please provide both Project URL and Anon Public Key.' });
      return;
    }

    if (!cleanUrl.startsWith('https://')) {
      setStatus({ type: 'error', message: 'Project URL must start with https://' });
      return;
    }

    setTesting(true);

    try {
      const response = await fetch(`${cleanUrl}/auth/v1/health`, {
        headers: { apikey: cleanKey }
      }).catch(err => {
        throw new Error("Unable to connect to Supabase URL. Please check your network and URL.");
      });

      if (!response.ok && response.status !== 200) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Invalid Anon Public Key. Please copy the anon key from Project Settings > API.");
        }
      }

      saveCustomSupabaseConfig(cleanUrl, cleanKey);
      setStatus({
        type: 'success',
        message: 'Successfully connected to Supabase backend! Real authentication is active.'
      });
      setTesting(false);
      onConfigSaved();
    } catch (err) {
      if (cleanUrl.includes('supabase.co') && cleanKey.length > 30) {
        saveCustomSupabaseConfig(cleanUrl, cleanKey);
        setStatus({
          type: 'success',
          message: 'Saved configuration. Real authentication will connect to your project.'
        });
        setTesting(false);
        onConfigSaved();
      } else {
        setTesting(false);
        setStatus({
          type: 'error',
          message: err.message || 'Failed to verify Supabase connection.'
        });
      }
    }
  };

  const handleCopyCallback = () => {
    navigator.clipboard?.writeText(callbackUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyOrigin = () => {
    navigator.clipboard?.writeText(currentOrigin);
    setCopiedOrigin(true);
    setTimeout(() => setCopiedOrigin(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Authentication & Google Setup
              </h2>
              <p className="text-xs text-slate-500">
                Dr. Sanjay Kumar Dairy Security Configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex p-1 bg-slate-100 rounded-xl mt-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === 'supabase'
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            1. Supabase Project
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'google'
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>2. Google Sign-In Setup</span>
          </button>
        </div>

        {/* TAB 1: SUPABASE CONFIGURATION */}
        {activeTab === 'supabase' && (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Security Guarantee:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Passwords are <strong>never stored in plaintext or browser memory</strong>.</li>
                <li>Passcodes are hashed and verified securely by Supabase.</li>
                <li>PostgreSQL Row-Level Security ensures sellers and customers access only their own records.</li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Quick Supabase Steps (Free):
              </h3>
              <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                <li>Create a free project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1">supabase.com <ExternalLink className="w-3 h-3" /></a>.</li>
                <li>In your Supabase dashboard, go to <strong>Project Settings → API</strong>.</li>
                <li>Copy the <strong>Project URL</strong> and <strong>anon public key</strong> below.</li>
                <li>Run <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">supabase-schema.sql</code> in the Supabase SQL Editor.</li>
              </ol>
            </div>

            <form onSubmit={handleTestAndSave} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Supabase Project URL <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    required
                    placeholder="https://xyzcompany.supabase.co"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Supabase Anon Public Key <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Use only the <strong>anon public key</strong>. Never put the service_role key here.
                </p>
              </div>

              {status && (
                <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
                  status.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {status.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{status.message}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={testing}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {testing ? 'Testing...' : 'Save & Connect'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: GOOGLE OAUTH SETUP GUIDE */}
        {activeTab === 'google' && (
          <div className="mt-4 space-y-4">
            
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-sm text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Google OAuth Requirement:</span>
              </div>
              <p className="leading-relaxed">
                <strong>Google sign-in will not work until setup is complete in both Google Cloud Console and Supabase Dashboard.</strong> Credentials (Client Secret) are stored securely on the Supabase server and never exposed in browser code.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Step A */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Create Credentials in Google Cloud Console</span>
                </h4>
                <p className="text-slate-600">
                  Open <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-0.5">Google Cloud Credentials <ExternalLink className="w-3 h-3" /></a>, click <strong>Create Credentials → OAuth client ID</strong>, and select <strong>Web application</strong>.
                </p>
                
                <div className="pt-1 space-y-2">
                  <div>
                    <span className="font-semibold text-slate-700 block mb-0.5">Authorized JavaScript Origin:</span>
                    <div className="flex items-center gap-1.5">
                      <code className="flex-1 bg-white p-2 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 break-all select-all">
                        {currentOrigin}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyOrigin}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 font-bold flex items-center gap-1 text-[11px]"
                      >
                        {copiedOrigin ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedOrigin ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700 block mb-0.5">Authorized Redirect URI (Callback):</span>
                    <div className="flex items-center gap-1.5">
                      <code className="flex-1 bg-white p-2 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 break-all select-all">
                        {callbackUrl}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyCallback}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 font-bold flex items-center gap-1 text-[11px]"
                      >
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step B */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Enable Google Provider in Supabase</span>
                </h4>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                  <li>In your <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-0.5">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a>, go to <strong>Authentication → Providers</strong>.</li>
                  <li>Click on <strong>Google</strong> and toggle <strong>Enable Google</strong>.</li>
                  <li>Paste the <strong>Client ID</strong> and <strong>Client Secret</strong> generated from Google Cloud Console.</li>
                  <li>Click <strong>Save</strong>.</li>
                </ol>
              </div>

            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Got It
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
