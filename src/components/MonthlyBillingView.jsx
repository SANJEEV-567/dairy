import React, { useState } from 'react';
import { 
  Receipt, 
  Printer, 
  Share2, 
  Wallet, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Search, 
  Edit3, 
  RefreshCw,
  Milk,
  Building,
  Phone,
  FileCheck
} from 'lucide-react';
import { 
  DAIRY_NAME, 
  DAIRY_TAGLINE, 
  DAIRY_PHONE, 
  DAIRY_LOCATION, 
  BILL_STATUS 
} from '../utils/constants';
import { 
  formatINR, 
  formatKg, 
  formatDateIndian, 
  formatDateShort, 
  formatTimeIndian, 
  formatMonthYear, 
  getRecentMonthOptions, 
  getTodayKolkata 
} from '../utils/formatters';
import { generateMonthlyBill } from '../utils/calculations';

export default function MonthlyBillingView({
  customers = [],
  deliveries = [],
  payments = [],
  adjustments = [],
  statusOverrides = [],
  onOpenRecordPayment,
  onSaveStatusOverride,
  onRemoveStatusOverride
}) {
  const monthOptions = getRecentMonthOptions(12);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || null);
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'list'
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState(BILL_STATUS.PAID);
  const [overrideReason, setOverrideReason] = useState('');

  const effectiveCustomerId = selectedCustomerId && customers.some(c => c.id === selectedCustomerId)
    ? selectedCustomerId
    : customers[0]?.id || null;

  const currentCustomer = customers.find(c => c.id === effectiveCustomerId);

  // Generate bill for currently selected customer
  const currentBill = currentCustomer
    ? generateMonthlyBill(
        currentCustomer,
        selectedMonth,
        deliveries,
        payments,
        adjustments,
        statusOverrides
      )
    : null;

  // Generate bills for all customers for list view
  const allBills = customers.map(c => 
    generateMonthlyBill(
      c,
      selectedMonth,
      deliveries,
      payments,
      adjustments,
      statusOverrides
    )
  );

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = (bill) => {
    if (!bill) return;
    let cleanPhone = bill.customerPhone ? bill.customerPhone.replace(/\D/g, '') : '';
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = `91${cleanPhone.slice(1)}`;
    }
    
    const message = 
`*${DAIRY_NAME}*
*Monthly Milk Bill - ${formatMonthYear(bill.monthStr)}*
--------------------------------
Customer: ${bill.customerName}
Bill Date: ${formatDateIndian(getTodayKolkata())}

Total Milk Delivered: ${formatKg(bill.totalKg)}
Current Month Charges: ${formatINR(bill.totalMilkCharges)}
Previous Balance: ${formatINR(bill.previousOutstandingBalance)}
Payments Received: ${formatINR(bill.totalPaymentsInMonth)}
--------------------------------
*TOTAL AMOUNT DUE: ${formatINR(bill.finalAmountDue)}*
Status: ${bill.status}
--------------------------------
Thank you for your business!`;

    const encoded = encodeURIComponent(message);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleOpenOverrideModal = () => {
    if (!currentBill) return;
    setOverrideStatus(currentBill.status);
    setOverrideReason(currentBill.overrideReason || '');
    setOverrideModalOpen(true);
  };

  const handleSaveOverride = (e) => {
    e.preventDefault();
    if (!currentCustomer) return;
    onSaveStatusOverride({
      customerId: currentCustomer.id,
      month: selectedMonth,
      status: overrideStatus,
      reason: overrideReason.trim() || 'Manual status override by seller'
    });
    setOverrideModalOpen(false);
  };

  const handleResetOverride = () => {
    if (!currentCustomer) return;
    onRemoveStatusOverride(currentCustomer.id, selectedMonth);
    setOverrideModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header & Month Filter (Hidden in Print) */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>Monthly Customer Bills & Invoices</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Generates immutable monthly statements using exact saved delivery rates and quantities
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Dropdown */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer pr-2"
            >
              {monthOptions.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label} {m.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'single'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Detailed Bill
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Customers Summary
            </button>
          </div>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 no-print">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-semibold">No customers added yet to generate bills.</p>
        </div>
      ) : viewMode === 'list' ? (
        
        /* All Customers Summary List */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden no-print">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Monthly Bills Overview for {formatMonthYear(selectedMonth)}
            </h2>
            <span className="text-xs text-slate-500">
              {allBills.length} Customers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4 sm:px-6">Customer</th>
                  <th className="py-3 px-4 text-right">Milk Delivered</th>
                  <th className="py-3 px-4 text-right">Month Charges</th>
                  <th className="py-3 px-4 text-right">Prev Balance</th>
                  <th className="py-3 px-4 text-right">Payments Recd</th>
                  <th className="py-3 px-4 text-right">Amount Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 sm:px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {allBills.map(bill => {
                  return (
                    <tr key={bill.customerId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900">
                        {bill.customerName}
                        {bill.customerPhone && (
                          <div className="text-xs text-slate-400 font-normal">
                            {bill.customerPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-numbers text-slate-800">
                        {formatKg(bill.totalKg)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-numbers text-slate-800">
                        {formatINR(bill.totalMilkCharges)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-numbers text-slate-500">
                        {formatINR(bill.previousOutstandingBalance)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-numbers text-emerald-600 font-semibold">
                        {formatINR(bill.totalPaymentsInMonth)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-numbers font-black text-rose-600">
                        {formatINR(bill.finalAmountDue)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            bill.status === BILL_STATUS.PAID
                              ? 'bg-emerald-100 text-emerald-800'
                              : bill.status === BILL_STATUS.PARTIALLY_PAID
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {bill.status}
                          {bill.isOverridden && (
                            <span className="text-[10px] italic"> (Manual)</span>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedCustomerId(bill.customerId);
                              setViewMode('single');
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                          >
                            View Bill
                          </button>
                          <button
                            onClick={() => handleShareWhatsApp(bill)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg transition-colors"
                            title="Share on WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* Single Customer Detailed Bill View */
        <div className="space-y-6">
          
          {/* Customer Selection Row & Print Bar (Hidden in Print) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-600 uppercase">Customer:</label>
              <select
                value={effectiveCustomerId || ''}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {currentBill && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Print button */}
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Invoice</span>
                </button>

                {/* WhatsApp Share */}
                <button
                  onClick={() => handleShareWhatsApp(currentBill)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </button>

                {/* Record payment for this bill */}
                <button
                  onClick={() => onOpenRecordPayment(currentCustomer, currentBill.finalAmountDue)}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Record Payment</span>
                </button>

                {/* Status Override / Correction */}
                <button
                  onClick={handleOpenOverrideModal}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  title="Override or correct payment status"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Status Action</span>
                </button>
              </div>
            )}
          </div>

          {/* Printable Invoice Container */}
          {currentBill && (
            <div className="printable-bill bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-md max-w-4xl mx-auto">
              
              {/* Invoice Header */}
              <div className="border-b-2 border-slate-900 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                        <Milk className="w-6 h-6" />
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                        {DAIRY_NAME}
                      </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                      {DAIRY_TAGLINE}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {DAIRY_LOCATION} • Phone: {DAIRY_PHONE}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <span className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider rounded-md mb-2">
                      Milk Bill / Invoice
                    </span>
                    <div className="text-xs text-slate-500 font-mono-numbers">
                      Invoice No: <span className="font-bold text-slate-900">DSK-{currentBill.monthStr.replace('-', '')}-{currentBill.customerId.slice(-4).toUpperCase()}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Bill Date: <span className="font-semibold text-slate-900">{formatDateIndian(getTodayKolkata())}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Billing Month: <span className="font-bold text-emerald-700">{formatMonthYear(currentBill.monthStr)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill To & Status Badge */}
              <div className="py-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block">
                    Bill To Customer
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    {currentBill.customerName}
                  </h3>
                  {currentBill.customerPhone && (
                    <p className="text-xs text-slate-600 font-mono-numbers mt-0.5">
                      Phone: {currentBill.customerPhone}
                    </p>
                  )}
                  {currentBill.customerAddress && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Address: {currentBill.customerAddress}
                    </p>
                  )}
                </div>

                {/* Status Indicator */}
                <div className="text-left sm:text-right">
                  <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                    Payment Status
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-black uppercase tracking-wider ${
                      currentBill.status === BILL_STATUS.PAID
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : currentBill.status === BILL_STATUS.PARTIALLY_PAID
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {currentBill.status}
                  </span>
                  {currentBill.isOverridden && (
                    <p className="text-[10px] text-amber-700 italic mt-1 max-w-[200px]">
                      Manual Status Override: "{currentBill.overrideReason}"
                    </p>
                  )}
                </div>
              </div>

              {/* Delivery Details Table */}
              <div className="mt-6">
                <h4 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider mb-3">
                  Itemized Daily Milk Deliveries
                </h4>

                {currentBill.deliveries.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-100">
                    No milk deliveries recorded for this customer in {formatMonthYear(currentBill.monthStr)}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-slate-700 border-y border-slate-300">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Time</th>
                          <th className="py-2.5 px-3 text-right">Quantity (kg)</th>
                          <th className="py-2.5 px-3 text-right">Rate (₹/kg)</th>
                          <th className="py-2.5 px-3 text-right">Charge (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {currentBill.deliveries.map((delivery, index) => (
                          <tr key={delivery.id}>
                            <td className="py-2 px-3 text-slate-400">{index + 1}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {formatDateShort(delivery.date)}
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {delivery.time ? formatTimeIndian(delivery.time) : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono-numbers font-medium text-slate-800">
                              {delivery.quantityKg === 0 ? (
                                <span className="text-amber-600 font-bold">0.00 kg (Absent)</span>
                              ) : (
                                formatKg(delivery.quantityKg)
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono-numbers text-slate-700">
                              {formatINR(delivery.pricePerKg)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono-numbers font-bold text-slate-900">
                              {formatINR(delivery.charge)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payments in Month Table (if any) */}
              {currentBill.payments.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider mb-2">
                    Payments Recorded During Month
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-emerald-50 text-emerald-900 font-bold border-y border-emerald-200">
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Payment Method</th>
                          <th className="py-2 px-3">Note / Ref</th>
                          <th className="py-2 px-3 text-right">Amount Received</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100">
                        {currentBill.payments.map(p => (
                          <tr key={p.id}>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {formatDateShort(p.date)}
                            </td>
                            <td className="py-2 px-3 text-slate-700 font-medium">{p.paymentMethod || 'Cash'}</td>
                            <td className="py-2 px-3 text-slate-500 italic">{p.note || '-'}</td>
                            <td className="py-2 px-3 text-right font-mono-numbers font-bold text-emerald-700">
                              {formatINR(p.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Final Bill Breakdown & Calculations Box */}
              <div className="mt-8 border-t-2 border-slate-900 pt-4 flex flex-col sm:flex-row justify-between gap-6">
                <div className="text-xs text-slate-500 max-w-sm space-y-2">
                  <p className="font-semibold text-slate-700">Terms & Verification:</p>
                  <p>
                    Milk delivery charges are calculated daily: Quantity (kg) × Rate (₹/kg). This bill reflects the exact saved deliveries and payments recorded in Dr. Sanjay Kumar Dairy management system.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    System generated on {formatDateIndian(getTodayKolkata())}.
                  </p>
                </div>

                <div className="w-full sm:w-72 space-y-2">
                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-600">Total Milk Delivered:</span>
                    <span className="font-mono-numbers font-bold text-slate-900">
                      {formatKg(currentBill.totalKg)}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-600">Current Month Charges:</span>
                    <span className="font-mono-numbers font-bold text-slate-900">
                      {formatINR(currentBill.totalMilkCharges)}
                    </span>
                  </div>

                  {currentBill.previousOutstandingBalance !== 0 && (
                    <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                      <span className="text-slate-600">Previous Outstanding Balance:</span>
                      <span className="font-mono-numbers font-bold text-slate-900">
                        {formatINR(currentBill.previousOutstandingBalance)}
                      </span>
                    </div>
                  )}

                  {currentBill.netAdjustmentsInMonth !== 0 && (
                    <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                      <span className="text-slate-600">Manual Adjustments:</span>
                      <span className="font-mono-numbers font-bold text-slate-900">
                        {formatINR(currentBill.netAdjustmentsInMonth)}
                      </span>
                    </div>
                  )}

                  {currentBill.totalPaymentsInMonth > 0 && (
                    <div className="flex justify-between text-xs py-1 border-b border-slate-100 text-emerald-700">
                      <span>Less Payments Received:</span>
                      <span className="font-mono-numbers font-bold">
                        -{formatINR(currentBill.totalPaymentsInMonth)}
                      </span>
                    </div>
                  )}

                  {/* Final Net Amount Due */}
                  <div className="flex justify-between items-center text-sm sm:text-base py-3 border-t-2 border-slate-900 font-black">
                    <span className="text-slate-900">FINAL AMOUNT DUE:</span>
                    <span className="font-mono-numbers text-rose-600 text-lg">
                      {formatINR(currentBill.finalAmountDue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature / Footer */}
              <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Authorized Signatory: <strong className="text-slate-800">Dr. Sanjay Kumar Dairy</strong>
                </div>
                <div className="text-right">
                  Thank you for your valuable patronage!
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Status Action / Override Modal */}
      {overrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">
              Bill Payment Status Action
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Correct a mistaken status back to Due, or record an explicit manual override. Note: The actual amount due ({formatINR(currentBill.finalAmountDue)}) will remain visible to prevent accounting errors.
            </p>

            <form onSubmit={handleSaveOverride} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Status
                </label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={BILL_STATUS.DUE}>Due</option>
                  <option value={BILL_STATUS.PARTIALLY_PAID}>Partially Paid</option>
                  <option value={BILL_STATUS.PAID}>Paid</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Reason / Audit Note <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows="2"
                  placeholder="e.g. Corrected mistaken status back to Due / Cash settled verbally"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {currentBill.isOverridden ? (
                  <button
                    type="button"
                    onClick={handleResetOverride}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset to Calculated</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
                  >
                    Save Status
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
