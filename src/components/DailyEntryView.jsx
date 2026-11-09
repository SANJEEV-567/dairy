import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Clock, 
  Milk, 
  Ban, 
  Save, 
  RotateCcw,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  getTodayKolkata, 
  getCurrentTimeKolkata, 
  formatDateIndian, 
  formatINR, 
  formatKg, 
  roundToTwo 
} from '../utils/formatters';
import { getCustomerBalance } from '../utils/calculations';

export default function DailyEntryView({
  customers = [],
  deliveries = [],
  payments = [],
  adjustments = [],
  onSaveDelivery,
  onBatchSaveDeliveries,
  onNavigateTab
}) {
  const [selectedDate, setSelectedDate] = useState(getTodayKolkata());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local state for each row's draft entry: customerId -> { quantityKg, pricePerKg, time, note, isModified }
  const [drafts, setDrafts] = useState({});

  // Active customers only
  const activeCustomers = customers.filter(c => c.status !== 'inactive');

  // Existing deliveries for selected date
  const dayDeliveriesMap = {};
  deliveries
    .filter(d => d.date === selectedDate)
    .forEach(d => {
      dayDeliveriesMap[d.customerId] = d;
    });

  // Initialize drafts whenever selectedDate or activeCustomers change
  useEffect(() => {
    const newDrafts = {};
    const defaultTime = getCurrentTimeKolkata();

    activeCustomers.forEach(c => {
      const existing = dayDeliveriesMap[c.id];
      if (existing) {
        newDrafts[c.id] = {
          quantityKg: existing.quantityKg.toString(),
          pricePerKg: existing.pricePerKg.toString(),
          time: existing.time || defaultTime,
          note: existing.note || '',
          saved: true,
          deliveryId: existing.id
        };
      } else {
        newDrafts[c.id] = {
          quantityKg: (c.usualQuantityKg || 1).toString(),
          pricePerKg: (c.usualPricePerKg || 60).toString(),
          time: defaultTime,
          note: '',
          saved: false,
          deliveryId: null
        };
      }
    });

    setDrafts(newDrafts);
  }, [selectedDate, customers.length, deliveries.length]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleDraftChange = (customerId, field, value) => {
    setDrafts(prev => ({
      ...prev,
      [customerId]: {
        ...prev[customerId],
        [field]: value,
        saved: false
      }
    }));
  };

  const handleSetZeroDelivery = (customerId) => {
    setDrafts(prev => ({
      ...prev,
      [customerId]: {
        ...prev[customerId],
        quantityKg: '0',
        note: prev[customerId]?.note ? prev[customerId].note : 'No delivery (0 kg)',
        saved: false
      }
    }));
  };

  const handleResetToUsual = (customer) => {
    setDrafts(prev => ({
      ...prev,
      [customer.id]: {
        ...prev[customer.id],
        quantityKg: (customer.usualQuantityKg || 1).toString(),
        pricePerKg: (customer.usualPricePerKg || 60).toString(),
        note: '',
        saved: false
      }
    }));
  };

  const handleSaveRow = (customer) => {
    const draft = drafts[customer.id];
    if (!draft) return;

    const qty = parseFloat(draft.quantityKg);
    const price = parseFloat(draft.pricePerKg);

    if (isNaN(qty) || qty < 0) {
      alert("Please enter a valid milk quantity (>= 0 kg)");
      return;
    }
    if (isNaN(price) || price < 0) {
      alert("Please enter a valid price per kg (₹ >= 0)");
      return;
    }

    const charge = roundToTwo(qty * price);

    const deliveryRecord = {
      id: draft.deliveryId || undefined,
      customerId: customer.id,
      date: selectedDate,
      time: draft.time || getCurrentTimeKolkata(),
      quantityKg: qty,
      pricePerKg: price,
      charge: charge,
      note: draft.note || ''
    };

    onSaveDelivery(deliveryRecord);

    setDrafts(prev => ({
      ...prev,
      [customer.id]: {
        ...prev[customer.id],
        saved: true
      }
    }));
  };

  // Batch Save all unrecorded rows
  const handleBatchSaveAll = () => {
    const recordsToSave = [];
    activeCustomers.forEach(c => {
      const draft = drafts[c.id];
      if (draft && !draft.saved) {
        const qty = parseFloat(draft.quantityKg) || 0;
        const price = parseFloat(draft.pricePerKg) || 0;
        recordsToSave.push({
          id: draft.deliveryId || undefined,
          customerId: c.id,
          date: selectedDate,
          time: draft.time || getCurrentTimeKolkata(),
          quantityKg: qty,
          pricePerKg: price,
          charge: roundToTwo(qty * price),
          note: draft.note || ''
        });
      }
    });

    if (recordsToSave.length === 0) {
      alert("All active customer records for this date are already saved.");
      return;
    }

    onBatchSaveDeliveries(recordsToSave);
  };

  // Filter customers by search term
  const filteredCustomers = activeCustomers.filter(c => {
    return c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm));
  });

  // Calculate day totals from recorded deliveries
  const recordedDeliveriesForDay = deliveries.filter(d => d.date === selectedDate);
  const totalRecordedKg = roundToTwo(
    recordedDeliveriesForDay.reduce((sum, d) => sum + Number(d.quantityKg || 0), 0)
  );
  const totalRecordedCharge = roundToTwo(
    recordedDeliveriesForDay.reduce((sum, d) => sum + Number(d.charge || 0), 0)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Date & Batch Control Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Daily Milk Entry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Quick entry sheet for all active customers. Calculates daily charge automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Navigator */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-2">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {selectedDate !== getTodayKolkata() && (
              <button
                onClick={() => setSelectedDate(getTodayKolkata())}
                className="ml-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
              >
                Today
              </button>
            )}
          </div>

          {/* Batch Save Button */}
          {activeCustomers.length > 0 && (
            <button
              onClick={handleBatchSaveAll}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save All Pending Entries</span>
            </button>
          )}
        </div>
      </div>

      {/* Daily Progress & Totals Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Active Customers
          </span>
          <div className="text-xl font-black text-slate-900 font-mono-numbers mt-0.5">
            {activeCustomers.length}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Recorded for Date
          </span>
          <div className="text-xl font-black text-emerald-600 font-mono-numbers mt-0.5">
            {recordedDeliveriesForDay.length} / {activeCustomers.length}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Milk Delivered
          </span>
          <div className="text-xl font-black text-slate-900 font-mono-numbers mt-0.5">
            {formatKg(totalRecordedKg)}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Daily Charge
          </span>
          <div className="text-xl font-black text-slate-900 font-mono-numbers mt-0.5">
            {formatINR(totalRecordedCharge)}
          </div>
        </div>
      </div>

      {/* Customer List & Quick Inputs */}
      {activeCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Active Customers Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Please add or activate customers first to record daily milk deliveries.
          </p>
          <button
            onClick={() => onNavigateTab('customers')}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
          >
            Go to Customers Page
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search active customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredCustomers.length} active customers
            </span>
          </div>

          {/* Cards / Entry rows */}
          <div className="grid grid-cols-1 gap-4">
            {filteredCustomers.map(customer => {
              const draft = drafts[customer.id] || {
                quantityKg: (customer.usualQuantityKg || 1).toString(),
                pricePerKg: (customer.usualPricePerKg || 60).toString(),
                time: getCurrentTimeKolkata(),
                note: '',
                saved: false
              };

              const qty = parseFloat(draft.quantityKg) || 0;
              const rate = parseFloat(draft.pricePerKg) || 0;
              const calculatedCharge = roundToTwo(qty * rate);

              const currentCustomerBalance = getCustomerBalance(
                customer.id,
                deliveries,
                payments,
                adjustments
              );

              const isZero = qty === 0;

              return (
                <div
                  key={customer.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 p-4 sm:p-5 shadow-xs ${
                    draft.saved
                      ? 'border-emerald-300 bg-emerald-50/15'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left: Customer Info & Status */}
                    <div className="min-w-[200px] lg:w-1/4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">
                          {customer.name}
                        </span>
                        {draft.saved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Saved</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                        <span>Usual: {formatKg(customer.usualQuantityKg)} @ {formatINR(customer.usualPricePerKg)}/kg</span>
                      </div>

                      <div className="mt-1 text-xs">
                        <span className="text-slate-500">Current Due: </span>
                        <span className={`font-mono-numbers font-bold ${
                          currentCustomerBalance > 0 ? 'text-rose-600' : 'text-slate-700'
                        }`}>
                          {formatINR(currentCustomerBalance)}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Entry Inputs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                      
                      {/* Quantity in kg */}
                      <div>
                        <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                          Milk Quantity (kg)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={draft.quantityKg}
                            onChange={(e) => handleDraftChange(customer.id, 'quantityKg', e.target.value)}
                            className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 font-mono-numbers font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="0.00"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            kg
                          </span>
                        </div>
                      </div>

                      {/* Price per kg in ₹ */}
                      <div>
                        <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
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
                            value={draft.pricePerKg}
                            onChange={(e) => handleDraftChange(customer.id, 'pricePerKg', e.target.value)}
                            className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 font-mono-numbers font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="60"
                          />
                        </div>
                      </div>

                      {/* Time */}
                      <div>
                        <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                          Delivery Time
                        </label>
                        <div className="relative">
                          <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="time"
                            value={draft.time}
                            onChange={(e) => handleDraftChange(customer.id, 'time', e.target.value)}
                            className="w-full pl-7 pr-2 py-2 rounded-xl border border-slate-300 font-mono-numbers text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Live Auto-Calculated Charge */}
                      <div>
                        <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                          Daily Charge
                        </label>
                        <div className="py-2 px-3 rounded-xl bg-slate-100 border border-slate-200 font-mono-numbers font-black text-slate-900 text-sm flex items-center justify-between">
                          <span>{formatINR(calculatedCharge)}</span>
                          {isZero && (
                            <span className="text-[10px] text-amber-700 font-bold uppercase">
                              0 kg
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick actions & Save */}
                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      
                      {/* Quick No-Delivery (0 kg) button */}
                      <button
                        type="button"
                        onClick={() => handleSetZeroDelivery(customer.id)}
                        className={`p-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1 ${
                          isZero
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Mark No Delivery / 0 kg (adds ₹0 charge)"
                      >
                        <Ban className="w-3.5 h-3.5 text-amber-600" />
                        <span className="hidden sm:inline">0 kg</span>
                      </button>

                      {/* Reset to usual button */}
                      <button
                        type="button"
                        onClick={() => handleResetToUsual(customer)}
                        className="p-2 rounded-xl text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                        title="Reset to customer usual setting"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      {/* Save Button */}
                      <button
                        type="button"
                        onClick={() => handleSaveRow(customer)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0 ${
                          draft.saved
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        <Save className="w-4 h-4" />
                        <span>{draft.saved ? 'Update' : 'Save'}</span>
                      </button>
                    </div>

                  </div>

                  {/* Optional Note field */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">Note:</span>
                    <input
                      type="text"
                      placeholder="Optional delivery note (e.g., extra morning milk, festival bonus)..."
                      value={draft.note}
                      onChange={(e) => handleDraftChange(customer.id, 'note', e.target.value)}
                      className="text-xs text-slate-700 bg-transparent flex-1 focus:outline-none placeholder:text-slate-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
