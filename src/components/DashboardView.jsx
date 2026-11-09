import React, { useState } from 'react';
import { 
  Milk, 
  IndianRupee, 
  Wallet, 
  AlertCircle, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  UserPlus, 
  PlusCircle, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  Ban,
  Search,
  BookOpen
} from 'lucide-react';
import { formatINR, formatKg, formatDateIndian, getTodayKolkata, formatTimeIndian } from '../utils/formatters';
import { getDailyDashboardMetrics } from '../utils/calculations';

export default function DashboardView({
  customers = [],
  deliveries = [],
  payments = [],
  adjustments = [],
  onOpenAddCustomer,
  onOpenRecordDelivery,
  onOpenRecordPayment,
  onOpenCustomerLedger,
  onNavigateTab
}) {
  const [selectedDate, setSelectedDate] = useState(getTodayKolkata());
  const [searchTerm, setSearchTerm] = useState('');

  // Daily metrics for selected date
  const metrics = getDailyDashboardMetrics(
    selectedDate,
    customers,
    deliveries,
    payments,
    adjustments
  );

  const isToday = selectedDate === getTodayKolkata();

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

  const filteredCustomerSummary = metrics.customerSummary.filter(item => {
    const nameMatch = item.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = item.customer.phone && item.customer.phone.includes(searchTerm);
    return nameMatch || phoneMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header & Date Controller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Daily Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time daily milk supply, collections, and live customer balances
          </p>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl self-start sm:self-auto border border-slate-200">
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

          {!isToday && (
            <button
              onClick={() => setSelectedDate(getTodayKolkata())}
              className="ml-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* 4 Highlighted Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total Milk Delivered */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500">
              Milk Delivered ({isToday ? "Today" : formatDateIndian(selectedDate)})
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Milk className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-numbers">
              {formatKg(metrics.totalMilkDeliveredTodayKg)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Quantity delivered in kg
            </p>
          </div>
        </div>

        {/* Metric 2: Total Charges Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500">
              Milk Sales Value
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-numbers">
              {formatINR(metrics.totalChargesToday)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Daily delivery charges
            </p>
          </div>
        </div>

        {/* Metric 3: Payments Received Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500">
              Payments Received
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono-numbers">
              {formatINR(metrics.paymentsReceivedToday)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Collected on {formatDateIndian(selectedDate)}
            </p>
          </div>
        </div>

        {/* Metric 4: Total Outstanding Balance Due */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500">
              Total Current Due
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono-numbers">
              {formatINR(metrics.totalOutstandingDue)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pending across active customers
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-100">
        <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider mr-2">
          Quick Actions:
        </span>
        <button
          onClick={() => onNavigateTab('daily-entry')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Quick Daily Entry Sheet</span>
        </button>
        <button
          onClick={onOpenAddCustomer}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300/80 rounded-xl text-sm font-bold shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4 text-emerald-600" />
          <span>Add New Customer</span>
        </button>
        <button
          onClick={() => onOpenRecordPayment(null)}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300/80 rounded-xl text-sm font-bold shadow-xs transition-colors"
        >
          <Wallet className="w-4 h-4 text-emerald-600" />
          <span>Record Payment</span>
        </button>
        <button
          onClick={() => onNavigateTab('billing')}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300/80 rounded-xl text-sm font-bold shadow-xs transition-colors"
        >
          <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          <span>Monthly Bills</span>
        </button>
      </div>

      {/* Customer-by-Customer Delivery & Balance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Customer Daily Delivery & Balance Summary
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing records for {formatDateIndian(selectedDate)}
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {customers.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <Milk className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Welcome to Dr. Sanjay Kumar Dairy
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              No customers have been added yet. Add your customer once with their usual milk quantity and rate to begin daily recording.
            </p>
            <button
              onClick={onOpenAddCustomer}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-700/20 transition-all"
            >
              <UserPlus className="w-5 h-5" />
              <span>Add Your First Customer</span>
            </button>
          </div>
        ) : filteredCustomerSummary.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No customers match your search "{searchTerm}".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <th className="py-3.5 px-4 sm:px-6">Customer</th>
                  <th className="py-3.5 px-4">Usual Setting</th>
                  <th className="py-3.5 px-4">Delivery ({formatDateIndian(selectedDate)})</th>
                  <th className="py-3.5 px-4 text-right">Daily Charge</th>
                  <th className="py-3.5 px-4 text-right">Running Due</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCustomerSummary.map(({ customer, balance, hasDelivery, delivery }) => {
                  const isInactive = customer.status === 'inactive';

                  return (
                    <tr 
                      key={customer.id} 
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isInactive ? 'opacity-60 bg-slate-50/40' : ''
                      }`}
                    >
                      {/* Customer Info */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{customer.name}</span>
                          {isInactive && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {customer.phone ? customer.phone : 'No phone'}{customer.address ? ` • ${customer.address}` : ''}
                        </div>
                      </td>

                      {/* Usual Setting */}
                      <td className="py-4 px-4 text-slate-600">
                        <div className="text-xs">
                          <span className="font-semibold text-slate-800 font-mono-numbers">
                            {formatKg(customer.usualQuantityKg)}
                          </span>
                          {' @ '}
                          <span className="font-semibold text-slate-800 font-mono-numbers">
                            {formatINR(customer.usualPricePerKg)}/kg
                          </span>
                        </div>
                      </td>

                      {/* Delivery Status for selected Date */}
                      <td className="py-4 px-4">
                        {hasDelivery ? (
                          delivery.quantityKg === 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Ban className="w-3.5 h-3.5" />
                              <span>No Delivery (0 kg)</span>
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="font-mono-numbers">{formatKg(delivery.quantityKg)}</span>
                                <span className="text-[11px] text-emerald-600/80">(@ {formatINR(delivery.pricePerKg)}/kg)</span>
                              </span>
                              {delivery.time && (
                                <div className="text-[11px] text-slate-400 pl-1">
                                  Time: {formatTimeIndian(delivery.time)}
                                </div>
                              )}
                            </div>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Not recorded</span>
                          </span>
                        )}
                      </td>

                      {/* Day Charge */}
                      <td className="py-4 px-4 text-right font-mono-numbers font-bold text-slate-800">
                        {hasDelivery ? formatINR(delivery.charge) : "-"}
                      </td>

                      {/* Running Balance Due */}
                      <td className="py-4 px-4 text-right">
                        <span
                          className={`font-mono-numbers font-bold text-sm ${
                            balance > 0
                              ? 'text-rose-600'
                              : balance < 0
                              ? 'text-emerald-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {formatINR(balance)}
                        </span>
                        {balance > 0 && (
                          <div className="text-[10px] text-rose-500 font-semibold uppercase">
                            Due
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenRecordDelivery(customer, selectedDate, delivery)}
                            className="px-2.5 py-1.5 text-xs font-bold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                            title={hasDelivery ? "Edit delivery record" : "Record delivery"}
                          >
                            {hasDelivery ? "Edit Milk" : "Record Milk"}
                          </button>

                          <button
                            onClick={() => onOpenRecordPayment(customer)}
                            className="px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                            title="Record payment"
                          >
                            Pay
                          </button>

                          <button
                            onClick={() => onOpenCustomerLedger(customer)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View customer ledger"
                          >
                            <BookOpen className="w-4 h-4" />
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
