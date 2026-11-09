import React, { useState } from 'react';
import { 
  HardDriveDownload, 
  UploadCloud, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Milk,
  Building,
  Calendar,
  Database
} from 'lucide-react';
import { exportAllData, importAllData, clearAllData } from '../utils/storage';
import { DAIRY_NAME, DAIRY_TAGLINE, DAIRY_PHONE, DAIRY_LOCATION } from '../utils/constants';
import { getTodayKolkata, formatDateIndian } from '../utils/formatters';

export default function BackupView({
  customers = [],
  deliveries = [],
  payments = [],
  adjustments = [],
  currentUser = null,
  onDataReloaded,
  showToast
}) {
  const [importStatus, setImportStatus] = useState(null);
  const [clearInput, setClearInput] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const userId = currentUser?.id || null;

  const handleDownloadBackup = () => {
    try {
      const jsonString = exportAllData(userId);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = getTodayKolkata();
      a.href = url;
      a.download = `Dr_Sanjay_Kumar_Dairy_Backup_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast("Backup file downloaded successfully!", "success");
    } catch (error) {
      showToast("Failed to generate backup: " + error.message, "error");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        const res = importAllData(content, userId);
        if (res.success) {
          showToast(`Successfully restored: ${res.stats.customers} customers, ${res.stats.deliveries} deliveries, ${res.stats.payments} payments!`, "success");
          onDataReloaded();
        } else {
          showToast("Import failed: " + res.error, "error");
        }
      } catch (err) {
        showToast("Error reading file: " + err.message, "error");
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  const handleExecuteClear = () => {
    if (clearInput !== 'CLEAR') {
      showToast("Please type CLEAR to confirm data reset", "error");
      return;
    }
    clearAllData(userId);
    setShowClearConfirm(false);
    setClearInput('');
    showToast("All data cleared successfully.", "success");
    onDataReloaded();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Database className="w-6 h-6 text-emerald-600" />
          <span>Data Storage & Offline Backup</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Your data is stored securely in your browser's persistent storage. Download backups anytime to ensure zero data loss.
        </p>
      </div>

      {/* Business Profile Summary */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
            <Milk className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">{DAIRY_NAME}</h2>
            <p className="text-xs text-slate-500">{DAIRY_TAGLINE}</p>
            <p className="text-xs text-slate-400 mt-0.5">{DAIRY_LOCATION} • {DAIRY_PHONE}</p>
          </div>
        </div>

        {/* Live System Data Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-bold uppercase text-slate-500">Total Customers</span>
            <div className="text-xl font-black text-slate-900 font-mono-numbers mt-0.5">
              {customers.length}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-bold uppercase text-slate-500">Deliveries Recorded</span>
            <div className="text-xl font-black text-slate-900 font-mono-numbers mt-0.5">
              {deliveries.length}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-bold uppercase text-slate-500">Payments Recorded</span>
            <div className="text-xl font-black text-slate-900 font-mono-numbers mt-0.5">
              {payments.length}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-bold uppercase text-slate-500">Adjustments</span>
            <div className="text-xl font-black text-slate-900 font-mono-numbers mt-0.5">
              {adjustments.length}
            </div>
          </div>
        </div>
      </div>

      {/* Backup and Restore Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export / Download Backup */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Download Data Backup</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Downloads a complete JSON backup of all customers, daily milk delivery records, payments, and balance adjustments to your computer or phone.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handleDownloadBackup}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors"
            >
              <HardDriveDownload className="w-4 h-4" />
              <span>Download Backup (.JSON)</span>
            </button>
          </div>
        </div>

        {/* Import / Restore Backup */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Restore Data From Backup</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload a previously downloaded <code className="text-emerald-700">.json</code> backup file to restore all your business records on any device.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <label className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer">
              <UploadCloud className="w-4 h-4" />
              <span>Select Backup File to Restore</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

      </div>

      {/* Danger Zone: Clear Data */}
      <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-200/80">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-900">Danger Zone: Reset All Records</h3>
            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
              Permanently delete all customer records, deliveries, and payment history from this browser. This cannot be undone unless you have a downloaded backup.
            </p>

            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                Reset System Data
              </button>
            ) : (
              <div className="mt-4 p-4 bg-white rounded-xl border border-rose-300 space-y-3">
                <p className="text-xs font-bold text-rose-900">
                  Type <span className="bg-rose-100 px-1 py-0.5 rounded text-rose-800">CLEAR</span> in the box below to confirm:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={clearInput}
                    onChange={(e) => setClearInput(e.target.value)}
                    placeholder="Type CLEAR"
                    className="px-3 py-1.5 text-xs rounded-lg border border-rose-300 font-bold uppercase focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    onClick={handleExecuteClear}
                    disabled={clearInput !== 'CLEAR'}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => {
                      setShowClearConfirm(false);
                      setClearInput('');
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
