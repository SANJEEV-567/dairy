import React, { useState } from 'react';
import { 
  CreditCard, 
  Wallet, 
  Search, 
  Plus, 
  Calendar, 
  Edit2, 
  Trash2, 
  ArrowDownLeft,
  Building,
  User,
  Filter
} from 'lucide-react';
import { 
  formatINR, 
  formatDateIndian, 
  formatTimeIndian, 
  getTodayKolkata,
  getRecentMonthOptions,
  roundToTwo
} from '../utils/formatters';

export default function PaymentsView({
  customers = [],
  payments = [],
  onOpenRecordPayment,
  onEditPayment,
  onDeletePayment
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Map customer details for quick lookup
  const customerMap = {};
  customers.forEach(c => {
    customerMap[c.id] = c;
  });

  // Filter payments
  const filteredPayments = payments
    .filter(p => {
      const cust = customerMap[p.customerId];
      const custName = cust ? cust.name.toLowerCase() : '';
      const custCode = cust?.customerCode ? cust.customerCode.toLowerCase() : '';
      const matchesSearch = 
        custName.includes(searchTerm.toLowerCase()) ||
        custCode.includes(searchTerm.toLowerCase()) ||
        (p.note && p.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.paymentMethod && p.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;
      if (methodFilter !== 'all' && p.paymentMethod !== methodFilter) return false;
      if (dateFilter && p.date !== dateFilter) return false;

      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date); // newest first
      return (b.time || '').localeCompare(a.time || '');
    });

  const totalFilteredAmount = roundToTwo(filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            <span>Customer Payments Log</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Audit history of all cash collections, UPI transfers, and bank settlements
          </p>
        </div>

        <button
          onClick={() => onOpenRecordPayment(null)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Payment</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer or note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Method Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Method:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="UPI (GPay / PhonePe / Paytm)">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-slate-300 font-mono-numbers"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-xs text-rose-500 hover:underline ml-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
              Filtered Total Payments
            </span>
            <span className="text-xs text-emerald-700">
              {filteredPayments.length} transactions recorded
            </span>
          </div>
        </div>
        <div className="text-2xl font-black font-mono-numbers text-emerald-800">
          {formatINR(totalFilteredAmount)}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No payments recorded yet. Click "Record New Payment" to log customer collections.
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No payments match your current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4 sm:px-6">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Note / Reference</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPayments.map(p => {
                  const cust = customerMap[p.customerId];

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{formatDateIndian(p.date)}</div>
                        {p.time && (
                          <div className="text-xs text-slate-400">{formatTimeIndian(p.time)}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {cust ? cust.name : 'Unknown Customer'}
                        {cust?.phone && (
                          <div className="text-xs text-slate-400 font-normal">{cust.phone}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {p.paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs italic">
                        {p.note || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-numbers font-extrabold text-emerald-600 text-base">
                        {formatINR(p.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEditPayment(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Edit payment"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeletePayment(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete payment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
