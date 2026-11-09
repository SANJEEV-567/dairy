import React, { useState } from 'react';
import { 
  BookOpenText, 
  Search, 
  Filter, 
  Calendar, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Edit2, 
  Trash2, 
  Milk, 
  Wallet, 
  SlidersHorizontal,
  ChevronDown,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { 
  formatINR, 
  formatKg, 
  formatDateIndian, 
  formatTimeIndian, 
  getRecentMonthOptions 
} from '../utils/formatters';
import { calculateCustomerLedger } from '../utils/calculations';

export default function CustomerLedgerView({
  customers = [],
  deliveries = [],
  payments = [],
  adjustments = [],
  selectedCustomerId = null,
  onSelectCustomer,
  onOpenRecordDelivery,
  onOpenRecordPayment,
  onOpenAddAdjustment,
  onEditTransaction,
  onDeleteTransaction
}) {
  // If no customer selected, default to the first customer
  const currentCustomerId = selectedCustomerId || (customers[0]?.id || null);
  const currentCustomer = customers.find(c => c.id === currentCustomerId);

  // Month or date range filter
  const [filterType, setFilterType] = useState('month'); // 'month' or 'range' or 'all'
  const monthOptions = getRecentMonthOptions(12);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'delivery', 'payment', 'adjustment'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = oldest first, 'desc' = newest first

  // Calculate ledger for this customer
  const ledgerOptions = {
    month: filterType === 'month' ? selectedMonth : null,
    startDate: filterType === 'range' ? startDate : null,
    endDate: filterType === 'range' ? endDate : null
  };

  const ledgerData = currentCustomer
    ? calculateCustomerLedger(
        currentCustomer.id,
        deliveries,
        payments,
        adjustments,
        ledgerOptions
      )
    : { transactions: [], currentBalance: 0 };

  // Filter transactions by type if requested
  const displayTransactions = ledgerData.transactions.filter(t => {
    if (typeFilter === 'all') return true;
    return t.type === typeFilter;
  });

  const sortedDisplayTransactions = sortOrder === 'desc'
    ? [...displayTransactions].reverse()
    : displayTransactions;

  // Period totals
  const periodTotalDeliveriesKg = displayTransactions
    .filter(t => t.type === 'delivery')
    .reduce((sum, t) => sum + (t.quantityKg || 0), 0);

  const periodTotalCharges = displayTransactions
    .filter(t => t.type === 'delivery' || (t.type === 'adjustment' && t.effect === 'debit'))
    .reduce((sum, t) => sum + t.amount, 0);

  const periodTotalPayments = displayTransactions
    .filter(t => t.type === 'payment' || (t.type === 'adjustment' && t.effect === 'credit'))
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Customer Selector & Ledger Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpenText className="w-6 h-6 text-emerald-600" />
            <span>Customer Transaction Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Complete running balance statement: dated milk deliveries, payments received, and balance adjustments
          </p>
        </div>

        {/* Customer Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-600 uppercase shrink-0">
            Select Customer:
          </label>
          <div className="relative min-w-[220px]">
            <select
              value={currentCustomerId || ''}
              onChange={(e) => onSelectCustomer(e.target.value)}
              className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''} {c.status === 'inactive' ? '[Inactive]' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!currentCustomer ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-semibold">Please add or select a customer to view their ledger.</p>
        </div>
      ) : (
        <>
          {/* Customer Profile & Current Running Balance Summary */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 sm:p-6 rounded-2xl shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight">{currentCustomer.name}</h2>
                  {currentCustomer.status === 'inactive' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                  {currentCustomer.phone && <span>📞 {currentCustomer.phone}</span>}
                  {currentCustomer.address && <span>📍 {currentCustomer.address}</span>}
                  <span>🥛 Usual: {formatKg(currentCustomer.usualQuantityKg)} @ {formatINR(currentCustomer.usualPricePerKg)}/kg</span>
                </div>
              </div>

              {/* Net Balance Pill */}
              <div className="bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-xl border border-white/10 text-right self-start sm:self-auto">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-300 block">
                  Current Net Balance Due
                </span>
                <div className="text-2xl sm:text-3xl font-black font-mono-numbers text-emerald-400 mt-0.5">
                  {formatINR(ledgerData.currentBalance)}
                </div>
                <span className="text-[10px] text-slate-300 block">
                  {ledgerData.currentBalance > 0
                    ? 'Customer owes this amount'
                    : ledgerData.currentBalance < 0
                    ? 'Advance payment credit'
                    : 'Account fully settled'}
                </span>
              </div>
            </div>

            {/* Quick Action buttons right inside ledger */}
            <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
              <button
                onClick={() => onOpenRecordDelivery(currentCustomer)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Milk className="w-3.5 h-3.5" />
                <span>+ Add Milk Delivery</span>
              </button>
              <button
                onClick={() => onOpenRecordPayment(currentCustomer)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-900 flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Record Payment</span>
              </button>
              <button
                onClick={() => onOpenAddAdjustment(currentCustomer)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/20 text-white border border-white/20 flex items-center gap-1.5 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>+ Adjust Balance</span>
              </button>
            </div>
          </div>

          {/* Filtering Strip */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Filter Mode */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase mr-1">Filter:</span>
              
              <button
                onClick={() => setFilterType('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  filterType === 'month'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                By Month
              </button>

              <button
                onClick={() => setFilterType('range')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  filterType === 'range'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Date Range
              </button>

              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  filterType === 'all'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Time
              </button>
            </div>

            {/* Sub Filter Inputs */}
            <div className="flex flex-wrap items-center gap-3">
              {filterType === 'month' && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {monthOptions.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.label} {m.isCurrent ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {filterType === 'range' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-300 font-mono-numbers"
                    placeholder="Start Date"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-300 font-mono-numbers"
                    placeholder="End Date"
                  />
                </div>
              )}

              {/* Transaction Type Filter */}
              <div className="flex items-center gap-1 border-l pl-3 border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none"
                >
                  <option value="all">All Entries</option>
                  <option value="delivery">Deliveries Only</option>
                  <option value="payment">Payments Only</option>
                  <option value="adjustment">Adjustments Only</option>
                </select>
              </div>
            </div>

          </div>

          {/* Period Summary Totals Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500">
                Filtered Deliveries (kg)
              </span>
              <div className="text-xl font-black text-slate-900 font-mono-numbers mt-0.5">
                {formatKg(periodTotalDeliveriesKg)}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500">
                Total Charges (Debit)
              </span>
              <div className="text-xl font-black text-rose-600 font-mono-numbers mt-0.5">
                {formatINR(periodTotalCharges)}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500">
                Payments Received (Credit)
              </span>
              <div className="text-xl font-black text-emerald-600 font-mono-numbers mt-0.5">
                {formatINR(periodTotalPayments)}
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Transaction History ({displayTransactions.length} records)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Order:</span>
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  {sortOrder === 'asc' ? 'Oldest First (1 → 30)' : 'Newest First (30 → 1)'}
                </button>
              </div>
            </div>

            {sortedDisplayTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No transactions recorded for this customer in the selected time period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="py-3 px-4 sm:px-6">Date & Time</th>
                      <th className="py-3 px-4">Transaction Details</th>
                      <th className="py-3 px-4 text-right">Debit (+) Charge</th>
                      <th className="py-3 px-4 text-right">Credit (−) Payment</th>
                      <th className="py-3 px-4 text-right">Running Balance</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {sortedDisplayTransactions.map((tx) => {
                      const isDebit = tx.effect === 'debit';
                      const isPayment = tx.type === 'payment';
                      const isDelivery = tx.type === 'delivery';
                      const isAdjustment = tx.type === 'adjustment';

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                          
                          {/* Date & Time */}
                          <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                            <div className="font-bold text-slate-900">
                              {formatDateIndian(tx.date)}
                            </div>
                            {tx.time && (
                              <div className="text-[11px] text-slate-400">
                                {formatTimeIndian(tx.time)}
                              </div>
                            )}
                          </td>

                          {/* Transaction Details */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              {isDelivery && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Milk className="w-3 h-3" />
                                  <span>Milk Delivery</span>
                                </span>
                              )}
                              {isPayment && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Wallet className="w-3 h-3" />
                                  <span>Payment Received</span>
                                </span>
                              )}
                              {isAdjustment && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  <SlidersHorizontal className="w-3 h-3" />
                                  <span>{isDebit ? 'Debit Adj' : 'Credit Adj'}</span>
                                </span>
                              )}

                              {isDelivery && (
                                <span className="font-mono-numbers font-semibold text-slate-800 text-xs">
                                  {formatKg(tx.quantityKg)} @ {formatINR(tx.pricePerKg)}/kg
                                </span>
                              )}

                              {isPayment && tx.paymentMethod && (
                                <span className="text-xs text-slate-600 font-medium">
                                  via {tx.paymentMethod}
                                </span>
                              )}
                            </div>

                            {/* Note */}
                            {tx.note && (
                              <div className="text-xs text-slate-500 mt-1 italic pl-1">
                                "{tx.note}"
                              </div>
                            )}
                          </td>

                          {/* Debit (+) Charge */}
                          <td className="py-3.5 px-4 text-right font-mono-numbers font-bold">
                            {isDebit ? (
                              <span className="text-rose-600">
                                +{formatINR(tx.amount)}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* Credit (−) Payment */}
                          <td className="py-3.5 px-4 text-right font-mono-numbers font-bold">
                            {!isDebit ? (
                              <span className="text-emerald-600">
                                -{formatINR(tx.amount)}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* Running Balance */}
                          <td className="py-3.5 px-4 text-right font-mono-numbers font-extrabold text-slate-900">
                            {formatINR(tx.runningBalance)}
                          </td>

                          {/* Edit / Delete Actions */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => onEditTransaction(tx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                title="Edit this transaction"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteTransaction(tx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete this record"
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
        </>
      )}

    </div>
  );
}
