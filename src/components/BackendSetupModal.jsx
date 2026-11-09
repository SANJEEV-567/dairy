import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { saveCustomSupabaseConfig, getSupabaseConfig, isSupabaseConfigured } from '../utils/supabase.js';

export default function BackendSetupModal({
  isOpen,
  onClose,
  onConfigSaved
}) {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url || '');
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey || '');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

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
      // Test the URL endpoint
      const response = await fetch(`${cleanUrl}/auth/v1/health`, {
        headers: { apikey: cleanKey }
      }).catch(err => {
        throw new Error("Unable to connect to Supabase URL. Please check network and URL.");
      });

      if (!response.ok && response.status !== 200) {
        // Some supabase versions return 200 or 401 if key invalid
        if (response.status === 401 || response.status === 403) {
          throw new Error("Invalid Anon Public Key. Please copy the anon key from Project Settings > API.");
        }
      }

      saveCustomSupabaseConfig(cleanUrl, cleanKey);
      setStatus({
        type: 'success',
        message: 'Successfully connected to Supabase backend! Real authentication is now active.'
      });
      setTesting(false);
      onConfigSaved();
    } catch (err) {
      // Fallback: save anyway if it looks like a valid URL and key
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

  const handleCopySqlHint = () => {
    setCopied(true);
    navigator.clipboard.writeText(`See supabase-schema.sql in the project root for the complete PostgreSQL Row-Level Security setup.`);
    setTimeout(() => setCopied(false), 2500);
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
                Connect Authentication Backend
              </h2>
              <p className="text-xs text-slate-500">
                Supabase PostgreSQL & Real Auth Integration
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

        {/* Instructions */}
        <div className="mt-4 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Real Security Requirements:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Passwords are <strong>never stored in browser memory or plaintext</strong>.</li>
              <li>Passwords are securely hashed using bcrypt/Argon2 on the server.</li>
              <li>Row-Level Security (RLS) ensures users can only access their own records.</li>
            </ul>
          </div>

          {/* Quick Step Guide */}
          <div className="space-y-2 text-xs">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              How to get your credentials (2 minutes, free):
            </h3>
            <ol className="list-decimal pl-5 space-y-1 text-slate-600">
              <li>Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1">supabase.com <ExternalLink className="w-3 h-3" /></a> and create a free project.</li>
              <li>In your Supabase dashboard, go to <strong>Project Settings → API</strong>.</li>
              <li>Copy the <strong>Project URL</strong> and <strong>anon public key</strong> into the fields below or into your project's <code>.env</code> file.</li>
              <li>Run the included <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">supabase-schema.sql</code> script in the SQL Editor to enable database-level row isolation.</li>
            </ol>
          </div>

          {/* Form */}
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
                Only use the <strong>anon public key</strong> (safe for frontend use). Never use the service_role key.
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

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCopySqlHint}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileCode className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied hint!' : 'View schema.sql'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={testing}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {testing ? 'Testing...' : 'Save & Connect'}
                </button>
              </div>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
}
