import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, IndianRupee, Calendar, FileText } from 'lucide-react';
import { getTodayKolkata, getCurrentTimeKolkata, formatINR, roundToTwo } from '../utils/formatters';

export default function AdjustmentModal({
  isOpen,
  preselectedCustomer = null,
  adjustmentToEdit = null,
  customers = [],
  onSave,
  onClose
}) {
  const [customerId, setCustomerId] = useState('');
  const [type, setType] = useState('debit'); // 'debit' (+ increases balance due), 'credit' (- decreases balance due)
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayKolkata());
  const [time, setTime] = useState(getCurrentTimeKolkata());
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (adjustmentToEdit) {
      setCustomerId(adjustmentToEdit.customerId || '');
      setType(adjustmentToEdit.type || 'debit');
      setAmount(adjustmentToEdit.amount ? adjustmentToEdit.amount.toString() : '');
      setDate(adjustmentToEdit.date || getTodayKolkata());
      setTime(adjustmentToEdit.time || getCurrentTimeKolkata());
      setReason(adjustmentToEdit.reason || '');
    } else {
      setCustomerId(preselectedCustomer?.id || customers[0]?.id || '');
      setType('debit');
      setAmount('');
      setDate(getTodayKolkata());
      setTime(getCurrentTimeKolkata());
      setReason('');
    }
    setError('');
  }, [isOpen, preselectedCustomer, adjustmentToEdit, customers.length]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerId) {
      setError("Please select a customer");
      return;
    }

    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Please enter a valid amount greater than ₹0");
      return;
    }

    if (!reason.trim()) {
      setError("Please provide a reason for this balance adjustment");
      return;
    }

    const adjustmentRecord = {
      id: adjustmentToEdit ? adjustmentToEdit.id : undefined,
      customerId,
      type,
      amount: roundToTwo(parsed),
      date,
      time,
      reason: reason.trim()
    };

    onSave(adjustmentRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {adjustmentToEdit ? 'Edit Balance Adjustment' : 'Manual Balance Adjustment'}
              </h2>
              <p className="text-xs text-slate-500">
                Record an extra fee or special waiver/discount
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Customer */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Customer <span className="text-rose-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={!!adjustmentToEdit}
              className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Adjustment Type: Debit vs Credit */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('debit')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                  type === 'debit'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                + Charge / Debit (Increases Due)
              </button>
              <button
                type="button"
                onClick={() => setType('credit')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                  type === 'credit'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                − Credit / Waiver (Reduces Due)
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="1"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm font-mono-numbers font-bold rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono-numbers rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono-numbers rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Reason / Explanation <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows="2"
              placeholder="e.g. Milk bottle / can deposit, ghee charge, festival discount..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs"
            >
              {adjustmentToEdit ? 'Save Changes' : 'Record Adjustment'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
