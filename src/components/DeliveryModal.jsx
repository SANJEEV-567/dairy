import React, { useState, useEffect } from 'react';
import { X, Milk, Calendar, Clock, IndianRupee, Ban, FileText } from 'lucide-react';
import { getTodayKolkata, getCurrentTimeKolkata, formatINR, roundToTwo } from '../utils/formatters';

export default function DeliveryModal({
  isOpen,
  customer = null,
  date = null,
  deliveryToEdit = null,
  customers = [],
  onSave,
  onClose
}) {
  const [customerId, setCustomerId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(getTodayKolkata());
  const [deliveryTime, setDeliveryTime] = useState(getCurrentTimeKolkata());
  const [quantityKg, setQuantityKg] = useState('1.0');
  const [pricePerKg, setPricePerKg] = useState('60');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (deliveryToEdit) {
      setCustomerId(deliveryToEdit.customerId || '');
      setDeliveryDate(deliveryToEdit.date || getTodayKolkata());
      setDeliveryTime(deliveryToEdit.time || getCurrentTimeKolkata());
      setQuantityKg(deliveryToEdit.quantityKg !== undefined ? deliveryToEdit.quantityKg.toString() : '1.0');
      setPricePerKg(deliveryToEdit.pricePerKg !== undefined ? deliveryToEdit.pricePerKg.toString() : '60');
      setNote(deliveryToEdit.note || '');
    } else {
      const targetCustomer = customer || customers[0];
      setCustomerId(targetCustomer?.id || '');
      setDeliveryDate(date || getTodayKolkata());
      setDeliveryTime(getCurrentTimeKolkata());
      setQuantityKg(targetCustomer?.usualQuantityKg ? targetCustomer.usualQuantityKg.toString() : '1.0');
      setPricePerKg(targetCustomer?.usualPricePerKg ? targetCustomer.usualPricePerKg.toString() : '60');
      setNote('');
    }
    setError('');
  }, [isOpen, customer, date, deliveryToEdit, customers.length]);

  if (!isOpen) return null;

  const currentCustomer = customers.find(c => c.id === customerId);

  const handleCustomerChange = (newId) => {
    setCustomerId(newId);
    const cust = customers.find(c => c.id === newId);
    if (cust && !deliveryToEdit) {
      setQuantityKg(cust.usualQuantityKg ? cust.usualQuantityKg.toString() : '1.0');
      setPricePerKg(cust.usualPricePerKg ? cust.usualPricePerKg.toString() : '60');
    }
  };

  const qty = parseFloat(quantityKg) || 0;
  const rate = parseFloat(pricePerKg) || 0;
  const liveCharge = roundToTwo(qty * rate);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerId) {
      setError("Please select a customer");
      return;
    }

    if (isNaN(qty) || qty < 0) {
      setError("Quantity must be a valid number >= 0");
      return;
    }

    if (isNaN(rate) || rate < 0) {
      setError("Price per kg must be a valid number >= 0");
      return;
    }

    const deliveryRecord = {
      id: deliveryToEdit ? deliveryToEdit.id : undefined,
      customerId,
      date: deliveryDate,
      time: deliveryTime,
      quantityKg: roundToTwo(qty),
      pricePerKg: roundToTwo(rate),
      charge: liveCharge,
      note: note.trim()
    };

    onSave(deliveryRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Milk className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {deliveryToEdit ? 'Edit Milk Delivery' : 'Record Milk Delivery'}
              </h2>
              <p className="text-xs text-slate-500">
                Calculates daily charge and updates ledger balance immediately
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
              onChange={(e) => handleCustomerChange(e.target.value)}
              disabled={!!deliveryToEdit || !!customer}
              className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Date</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 text-xs font-mono-numbers rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Time</label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="time"
                  required
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 text-xs font-mono-numbers rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Quantity and Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase text-slate-600">
                  Quantity (kg)
                </label>
                <button
                  type="button"
                  onClick={() => setQuantityKg('0')}
                  className="text-[10px] text-amber-700 font-bold hover:underline"
                >
                  Set 0 kg
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  required
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-sm font-mono-numbers font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  kg
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Rate (₹/kg)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm font-mono-numbers font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Live Calculated Charge Banner */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Calculated Charge (Quantity × Rate):
            </span>
            <span className="font-mono-numbers font-black text-slate-900 text-base">
              {formatINR(liveCharge)}
            </span>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Extra morning milk, bottle returned..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
            >
              {deliveryToEdit ? 'Save Changes' : 'Record Delivery'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
