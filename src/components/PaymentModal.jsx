import React, { useState, useEffect } from 'react';
import { X, Wallet, IndianRupee, Calendar, Clock, CreditCard, FileText } from 'lucide-react';
import { PAYMENT_METHODS } from '../utils/constants';
import { getTodayKolkata, getCurrentTimeKolkata, formatINR, roundToTwo } from '../utils/formatters';
import { getCustomerBalance } from '../utils/calculations';

export default function PaymentModal({
  isOpen,
  preselectedCustomer = null,
  prefilledAmount = null,
  paymentToEdit = null,
  customers = [],
  deliveries = [],
  payments = [],
  adjustments = [],
  onSave,
  onClose
}) {
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayKolkata());
  const [time, setTime] = useState(getCurrentTimeKolkata());
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (paymentToEdit) {
      setCustomerId(paymentToEdit.customerId || '');
      setAmount(paymentToEdit.amount ? paymentToEdit.amount.toString() : '');
      setDate(paymentToEdit.date || getTodayKolkata());
      setTime(paymentToEdit.time || getCurrentTimeKolkata());
      setPaymentMethod(paymentToEdit.paymentMethod || 'Cash');
      setNote(paymentToEdit.note || '');
    } else {
      const targetCustId = preselectedCustomer?.id || customers[0]?.id || '';
      setCustomerId(targetCustId);
      setDate(getTodayKolkata());
      setTime(getCurrentTimeKolkata());
      setPaymentMethod('Cash');
      setNote('');

      if (prefilledAmount !== null && prefilledAmount !== undefined && prefilledAmount > 0) {
        setAmount(prefilledAmount.toString());
      } else if (targetCustId) {
        const bal = getCustomerBalance(targetCustId, deliveries, payments, adjustments);
        setAmount(bal > 0 ? bal.toString() : '');
      } else {
        setAmount('');
      }
    }
    setError('');
  }, [isOpen, preselectedCustomer, prefilledAmount, paymentToEdit]);

  if (!isOpen) return null;

  const currentCustomer = customers.find(c => c.id === customerId);
  const currentCustomerDue = currentCustomer
    ? getCustomerBalance(currentCustomer.id, deliveries, payments, adjustments)
    : 0;

  const handleCustomerChange = (newCustId) => {
    setCustomerId(newCustId);
    const bal = getCustomerBalance(newCustId, deliveries, payments, adjustments);
    if (!paymentToEdit) {
      setAmount(bal > 0 ? bal.toString() : '');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerId) {
      setError("Please select a customer");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid payment amount greater than ₹0");
      return;
    }

    const paymentRecord = {
      id: paymentToEdit ? paymentToEdit.id : undefined,
      customerId,
      date,
      time,
      amount: roundToTwo(parsedAmount),
      paymentMethod,
      note: note.trim()
    };

    onSave(paymentRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {paymentToEdit ? 'Edit Payment Record' : 'Record Customer Payment'}
              </h2>
              <p className="text-xs text-slate-500">
                Updates customer running balance immediately
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
          
          {/* Customer Selector */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Select Customer <span className="text-rose-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              disabled={!!paymentToEdit}
              className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>

            {currentCustomer && !paymentToEdit && (
              <div className="flex items-center justify-between mt-1 text-xs">
                <span className="text-slate-500">Current Outstanding Due:</span>
                <span className="font-mono-numbers font-bold text-rose-600">
                  {formatINR(currentCustomerDue)}
                </span>
              </div>
            )}
          </div>

          {/* Payment Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Payment Amount (₹) <span className="text-rose-500">*</span>
              </label>
              {!paymentToEdit && currentCustomerDue > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(currentCustomerDue.toString())}
                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  Fill Full Due: {formatINR(currentCustomerDue)}
                </button>
              )}
            </div>
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
                className="w-full pl-8 pr-3 py-2 text-base font-mono-numbers font-bold rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-200"
              />
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Payment Date
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 text-xs font-mono-numbers font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Time
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 text-xs font-mono-numbers font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Payment Method
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Note / Reference (Optional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="e.g. UPI Ref: 489201829 or Cash collected by driver"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-500 font-medium">{error}</p>
          )}

          {/* Action buttons */}
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
            >
              {paymentToEdit ? 'Save Changes' : 'Record Payment'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
